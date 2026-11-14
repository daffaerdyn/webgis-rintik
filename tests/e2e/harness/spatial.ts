import { loadGeoJson } from './geojson.ts';
import { loadMasterDataset, type UmkmRecord } from './dataset.ts';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}

/**
 * Ray-casting algorithm to test if a 2D point [lng, lat] lies inside a polygon ring [[lng, lat], ...].
 */
function isPointInRing(point: [number, number], ring: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];

        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Checks if a point (lat, lon) is inside the administrative boundary of Kota Bogor
 * based on the 68 official Kelurahan polygons in ADMINISTRASIDESA_AR_25K_KotaBogor.geojson.
 */
export function isPointInBogor(lat: number, lon: number): boolean {
    // Quick Bounding Box test for efficiency
    if (lat < -6.72 || lat > -6.48 || lon < 106.68 || lon > 106.90) {
        return false;
    }

    const wilayah = loadGeoJson('wilayah');
    const point: [number, number] = [lon, lat];

    for (const feature of wilayah.features) {
        const geom = feature.geometry;
        if (geom.type === 'Polygon') {
            const rings = geom.coordinates as [number, number][][];
            if (rings.length > 0 && isPointInRing(point, rings[0])) {
                return true;
            }
        } else if (geom.type === 'MultiPolygon') {
            const polygons = geom.coordinates as [number, number][][][];
            for (const poly of polygons) {
                if (poly.length > 0 && isPointInRing(point, poly[0])) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Generates circular polygon GeoJSON identical to PostGIS ST_Buffer(geom::geography, radius).
 */
export function generateBufferGeoJson(
    lat: number,
    lon: number,
    radiusMeters: number,
    numVertices: number = 64
) {
    const coordinates: [number, number][] = [];
    const earthRadius = 6378137; // WGS84 equatorial radius

    for (let i = 0; i <= numVertices; i++) {
        const angle = (i * 2 * Math.PI) / numVertices;
        const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
        const dLon =
            ((radiusMeters / (earthRadius * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI));

        const ptLat = lat + dLat * Math.cos(angle);
        const ptLon = lon + dLon * Math.sin(angle);
        coordinates.push([Number(ptLon.toFixed(6)), Number(ptLat.toFixed(6))]);
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
        },
        properties: {
            center: [lat, lon],
            radius_m: radiusMeters,
        },
    };
}

/**
 * Finds all UMKM competitors matching a specific category within a radius.
 */
export function findCompetitorsInRadius(
    lat: number,
    lon: number,
    radiusMeters: number,
    kategori?: string
): { competitors: (UmkmRecord & { distance_m: number })[]; totalAllUmkm: number } {
    const all = loadMasterDataset();
    let totalAllUmkm = 0;
    const competitors: (UmkmRecord & { distance_m: number })[] = [];

    for (const item of all) {
        const dist = haversineDistance(lat, lon, item.latitude, item.longitude);
        if (dist <= radiusMeters) {
            totalAllUmkm++;
            if (!kategori || item.kategori.toLowerCase() === kategori.toLowerCase()) {
                competitors.push({
                    ...item,
                    distance_m: Math.round(dist * 10) / 10,
                });
            }
        }
    }

    competitors.sort((a, b) => a.distance_m - b.distance_m);
    return { competitors, totalAllUmkm };
}

/**
 * Calculates distance to nearest school point in meters.
 */
export function findNearestSchoolDistance(lat: number, lon: number): { distance_m: number; schoolName: string } {
    const sekolahGeo = loadGeoJson('sekolah');
    let minDistance = Infinity;
    let schoolName = 'Sekolah';

    for (const feature of sekolahGeo.features) {
        const coords = feature.geometry.coordinates as [number, number];
        const dist = haversineDistance(lat, lon, coords[1], coords[0]);
        if (dist < minDistance) {
            minDistance = dist;
            schoolName = (feature.properties?.NAMOBJ as string) || 'Sekolah';
        }
    }

    return {
        distance_m: Math.round(minDistance * 10) / 10,
        schoolName,
    };
}

/**
 * Calculates distance to nearest road in meters.
 */
export function findNearestRoadDistance(lat: number, lon: number): { distance_m: number; roadName: string } {
    const jalanGeo = loadGeoJson('jalan');
    let minDistance = Infinity;
    let roadName = 'Jalan';

    // Sample vertices along line strings for proximity estimation
    for (const feature of jalanGeo.features) {
        const coords = feature.geometry.coordinates as [number, number][];
        if (Array.isArray(coords)) {
            for (const pt of coords) {
                if (Array.isArray(pt) && pt.length >= 2) {
                    const dist = haversineDistance(lat, lon, pt[1], pt[0]);
                    if (dist < minDistance) {
                        minDistance = dist;
                        roadName = (feature.properties?.REMARK as string) || (feature.properties?.NAMOBJ as string) || 'Jalan Kota';
                    }
                }
            }
        }
    }

    return {
        distance_m: Math.round(minDistance * 10) / 10,
        roadName,
    };
}
