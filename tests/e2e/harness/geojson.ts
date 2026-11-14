import fs from 'node:fs';
import path from 'node:path';

export interface GeoJsonFeature {
    type: string;
    properties: Record<string, unknown>;
    geometry: {
        type: string;
        coordinates: unknown;
    };
}

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

const geoJsonCache: Record<string, GeoJsonFeatureCollection> = {};

function resolveDataPath(filename: string): string {
    const candidatePaths = [
        path.resolve(process.cwd(), 'map-rintik/rintik-webgis/data', filename),
        path.resolve(process.cwd(), '../../map-rintik/rintik-webgis/data', filename),
        path.resolve(process.cwd(), 'public/data', filename),
        path.resolve('D:/Learn_IPB/Semester 5/Sistem Informasi Geografis/PJBL-WebGIS-RINTIK/map-rintik/rintik-webgis/data', filename),
    ];

    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`GeoJSON file "${filename}" not found in candidate paths.`);
}

/**
 * Loads a GeoJSON file from data directories.
 */
export function loadGeoJson(layerName: 'wilayah' | 'jalan' | 'sekolah' | 'permukiman'): GeoJsonFeatureCollection {
    if (geoJsonCache[layerName]) return geoJsonCache[layerName];

    let filename = '';
    switch (layerName) {
        case 'wilayah':
            filename = 'ADMINISTRASIDESA_AR_25K_KotaBogor.geojson';
            break;
        case 'jalan':
            filename = 'jalan_kota_bogor_final.geojson';
            break;
        case 'sekolah':
            filename = 'sekolah_kota_bogor_final.geojson';
            break;
        case 'permukiman':
            filename = 'permukiman_kota_bogor_final(Multipolygon).geojson';
            break;
    }

    const filePath = resolveDataPath(filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as GeoJsonFeatureCollection;
    geoJsonCache[layerName] = parsed;
    return parsed;
}
