import { loadMasterDataset, type UmkmRecord } from './dataset.ts';
import {
    haversineDistance,
    isPointInBogor,
    generateBufferGeoJson,
    findCompetitorsInRadius,
    findNearestSchoolDistance,
    findNearestRoadDistance,
} from './spatial.ts';

export interface ApiResponse<T = unknown> {
    status: number;
    data: T;
}

const VALID_KATEGORI = ['Kuliner', 'Fashion', 'Jasa', 'Kerajinan', 'Teknologi'];

/**
 * Simulates GET /api/umkm endpoint.
 */
export function simulateGetUmkm(params: {
    q?: string;
    kategori?: string;
    kecamatan?: string;
    kelurahan?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    sort?: 'rating' | 'jarak' | 'rekomendasi' | 'harga_termurah' | 'harga_termahal';
    page?: number;
    limit?: number;
}): ApiResponse<{ success: boolean; data: UmkmRecord[]; pagination: { page: number; total: number; totalPages: number } }> {
    const all = loadMasterDataset();
    let filtered = [...all];

    if (params.q) {
        const query = params.q.toLowerCase();
        filtered = filtered.filter(
            (u) =>
                u.nama_umkm.toLowerCase().includes(query) ||
                u.deskripsi_produk.toLowerCase().includes(query) ||
                u.alamat.toLowerCase().includes(query)
        );
    }

    if (params.kategori) {
        filtered = filtered.filter((u) => u.kategori.toLowerCase() === params.kategori!.toLowerCase());
    }

    if (params.kecamatan) {
        filtered = filtered.filter((u) => u.kecamatan.toLowerCase() === params.kecamatan!.toLowerCase());
    }

    if (params.kelurahan) {
        filtered = filtered.filter((u) => u.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase());
    }

    if (typeof params.latitude === 'number' && typeof params.longitude === 'number' && typeof params.radius === 'number') {
        filtered = filtered.filter((u) => {
            const dist = haversineDistance(params.latitude!, params.longitude!, u.latitude, u.longitude);
            return dist <= params.radius!;
        });
    }

    // Sorting
    if (params.sort === 'rating') {
        filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (params.sort === 'jarak' && params.latitude && params.longitude) {
        filtered.sort((a, b) => {
            const da = haversineDistance(params.latitude!, params.longitude!, a.latitude, a.longitude);
            const db = haversineDistance(params.latitude!, params.longitude!, b.latitude, b.longitude);
            return da - db;
        });
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 20));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
        status: 200,
        data: {
            success: true,
            data: paginated,
            pagination: { page, total, totalPages },
        },
    };
}

/**
 * Simulates GET /api/umkm/map endpoint (requires mandatory BBox, max span 0.5).
 */
export function simulateGetUmkmMap(params: {
    min_lng?: number;
    min_lat?: number;
    max_lng?: number;
    max_lat?: number;
    kategori?: string;
}): ApiResponse<unknown> {
    const { min_lng, min_lat, max_lng, max_lat, kategori } = params;

    if (
        typeof min_lng !== 'number' ||
        typeof min_lat !== 'number' ||
        typeof max_lng !== 'number' ||
        typeof max_lat !== 'number' ||
        isNaN(min_lng) ||
        isNaN(min_lat) ||
        isNaN(max_lng) ||
        isNaN(max_lat)
    ) {
        return {
            status: 400,
            data: { success: false, message: 'Bounding Box wajib diisi lengkap' },
        };
    }

    const spanLng = Math.abs(max_lng - min_lng);
    const spanLat = Math.abs(max_lat - min_lat);
    if (spanLng > 0.5 || spanLat > 0.5) {
        return {
            status: 400,
            data: { success: false, message: 'Area peta terlalu luas. Perbesar tampilan peta.' },
        };
    }

    const all = loadMasterDataset();
    const inBox = all.filter((u) => {
        const matchesBox =
            u.longitude >= min_lng &&
            u.longitude <= max_lng &&
            u.latitude >= min_lat &&
            u.latitude <= max_lat;
        const matchesKategori = !kategori || u.kategori.toLowerCase() === kategori.toLowerCase();
        return matchesBox && matchesKategori;
    });

    const features = inBox.map((u) => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [u.longitude, u.latitude],
        },
        properties: {
            id_umkm: u.id_umkm,
            nama_umkm: u.nama_umkm,
            kategori: u.kategori,
            rating: u.rating,
            range_harga: u.range_harga,
        },
    }));

    return {
        status: 200,
        data: {
            type: 'FeatureCollection',
            features,
        },
    };
}

/**
 * Simulates GET /api/umkm/statistics.
 */
export function simulateGetStatistics(params: {
    kategori?: string;
    kecamatan?: string;
    kelurahan?: string;
}): ApiResponse<{
    success: boolean;
    total_umkm: number;
    per_kategori: Record<string, number>;
    per_kecamatan: Record<string, number>;
}> {
    const all = loadMasterDataset();
    let filtered = [...all];

    if (params.kategori) {
        filtered = filtered.filter((u) => u.kategori.toLowerCase() === params.kategori!.toLowerCase());
    }
    if (params.kecamatan) {
        filtered = filtered.filter((u) => u.kecamatan.toLowerCase() === params.kecamatan!.toLowerCase());
    }
    if (params.kelurahan) {
        filtered = filtered.filter((u) => u.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase());
    }

    const per_kategori: Record<string, number> = {};
    const per_kecamatan: Record<string, number> = {};

    for (const item of filtered) {
        per_kategori[item.kategori] = (per_kategori[item.kategori] || 0) + 1;
        per_kecamatan[item.kecamatan] = (per_kecamatan[item.kecamatan] || 0) + 1;
    }

    return {
        status: 200,
        data: {
            success: true,
            total_umkm: filtered.length,
            per_kategori,
            per_kecamatan,
        },
    };
}

/**
 * Simulates GET /api/umkm/[id].
 */
export function simulateGetUmkmDetail(id: string): ApiResponse<unknown> {
    if (!id || !/^UMKM[0-9]+$/.test(id)) {
        return {
            status: 400,
            data: { success: false, message: 'ID UMKM tidak valid. Gunakan format UMKM0001.' },
        };
    }

    const all = loadMasterDataset();
    const item = all.find((u) => u.id_umkm === id);
    if (!item) {
        return {
            status: 404,
            data: { success: false, message: 'Data UMKM tidak ditemukan' },
        };
    }

    return {
        status: 200,
        data: {
            success: true,
            data: item,
        },
    };
}

/**
 * Simulates POST /api/analysis/buffer.
 */
export function simulatePostAnalysisBuffer(body: unknown): ApiResponse<unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return {
            status: 400,
            data: { success: false, message: 'Input harus berupa objek JSON' },
        };
    }

    const { latitude, longitude, radius } = body as Record<string, unknown>;

    if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        typeof radius !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(radius) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180 ||
        radius <= 0 ||
        radius > 5000
    ) {
        return {
            status: 400,
            data: { success: false, message: 'Koordinat atau radius tidak valid' },
        };
    }

    if (!isPointInBogor(latitude, longitude)) {
        return {
            status: 400,
            data: {
                success: false,
                message: 'Lokasi berada di luar wilayah Kota Bogor. Silakan pilih titik di dalam Kota Bogor.',
            },
        };
    }

    const bufferGeoJson = generateBufferGeoJson(latitude, longitude, radius);
    return {
        status: 200,
        data: {
            success: true,
            data: {
                buffer: bufferGeoJson,
                radius_meter: radius,
            },
        },
    };
}

/**
 * Simulates POST /api/analysis/location.
 */
export function simulatePostAnalysisLocation(body: unknown): ApiResponse<unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return {
            status: 400,
            data: { success: false, message: 'Input harus berupa objek JSON' },
        };
    }

    const { latitude, longitude, radius, kategori } = body as Record<string, unknown>;

    if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        typeof radius !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(radius) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180 ||
        radius <= 0 ||
        radius > 5000
    ) {
        return {
            status: 400,
            data: { success: false, message: 'Koordinat atau radius tidak valid' },
        };
    }

    if (typeof kategori !== 'string' || !VALID_KATEGORI.includes(kategori)) {
        return {
            status: 400,
            data: { success: false, message: 'Kategori UMKM tidak valid' },
        };
    }

    if (!isPointInBogor(latitude, longitude)) {
        return {
            status: 400,
            data: {
                success: false,
                message: 'Lokasi berada di luar wilayah Kota Bogor. Silakan pilih titik di dalam Kota Bogor.',
            },
        };
    }

    const { competitors, totalAllUmkm } = findCompetitorsInRadius(latitude, longitude, radius, kategori);
    const bufferGeoJson = generateBufferGeoJson(latitude, longitude, radius);
    const road = findNearestRoadDistance(latitude, longitude);
    const school = findNearestSchoolDistance(latitude, longitude);

    return {
        status: 200,
        data: {
            success: true,
            data: {
                titik_analisis: { lat: latitude, lng: longitude },
                kategori,
                radius_meter: radius,
                ringkasan: {
                    total_umkm_dalam_radius: totalAllUmkm,
                    total_kompetitor_sejenis: competitors.length,
                    jarak_jalan_terdekat_meter: road.distance_m,
                    jarak_sekolah_terdekat_meter: school.distance_m,
                },
                kompetitor_list: competitors.slice(0, 20),
                buffer_geojson: bufferGeoJson,
                catatan_kelayakan:
                    'Analisis spasial ini merupakan data pendukung pengambilan keputusan bisnis dan bukan klaim keberhasilan mutlak.',
            },
        },
    };
}

/**
 * Simulates GET /api/routing.
 */
export function simulateGetRouting(params: {
    dest_id?: string;
    start_lat?: number;
    start_lng?: number;
    dest_lat?: number;
    dest_lng?: number;
    mode?: 'motor' | 'mobil' | 'jalan_kaki';
    simulateTimeout?: boolean;
}): ApiResponse<unknown> {
    const { dest_id, start_lat, start_lng, dest_lat, dest_lng, mode = 'motor', simulateTimeout } = params;

    if (simulateTimeout) {
        // Simulates graceful fallback polyline on OSRM timeout / failure
        const dist = start_lat && start_lng && dest_lat && dest_lng
            ? Math.round(haversineDistance(start_lat, start_lng, dest_lat, dest_lng))
            : 1500;
        return {
            status: 200,
            data: {
                success: true,
                warning: 'Layanan OSRM sedang lambat. Menampilkan rute garis lurus estimasi.',
                jarak_meter: dist,
                durasi_menit: Math.round((dist / 500) * 10) / 10,
                mode,
                is_fallback: true,
                polyline_geojson: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [start_lng ?? 106.79, start_lat ?? -6.59],
                            [dest_lng ?? 106.80, dest_lat ?? -6.60],
                        ],
                    },
                },
            },
        };
    }

    if (!dest_id && (typeof dest_lat !== 'number' || typeof dest_lng !== 'number')) {
        return {
            status: 400,
            data: { success: false, message: 'Tujuan (dest_id atau dest_lat/dest_lng) wajib diisi' },
        };
    }

    let endLat = dest_lat;
    let endLng = dest_lng;

    if (dest_id) {
        if (!/^UMKM[0-9]+$/.test(dest_id)) {
            return {
                status: 400,
                data: { success: false, message: 'ID tujuan tidak valid' },
            };
        }
        const all = loadMasterDataset();
        const target = all.find((u) => u.id_umkm === dest_id);
        if (!target) {
            return {
                status: 404,
                data: { success: false, message: 'Destinasi UMKM tidak ditemukan' },
            };
        }
        endLat = target.latitude;
        endLng = target.longitude;
    }

    const sLat = start_lat ?? -6.595;
    const sLng = start_lng ?? 106.79;
    const straightDist = haversineDistance(sLat, sLng, endLat!, endLng!);
    const roadDist = Math.round(straightDist * 1.3); // Road network factor approx 1.3x

    // Speed factors from PRD 9.6:
    // motor: 0.85 multiplier of car time (avg 35 km/h)
    // mobil: 1.0 (avg 25 km/h)
    // jalan_kaki: 1.25 m/s (~4.5 km/h)
    let durasiMenit = 0;
    if (mode === 'motor') {
        durasiMenit = Math.round(((roadDist / 1000) / 35) * 60 * 0.85 * 10) / 10;
    } else if (mode === 'mobil') {
        durasiMenit = Math.round(((roadDist / 1000) / 25) * 60 * 10) / 10;
    } else if (mode === 'jalan_kaki') {
        durasiMenit = Math.round((roadDist / (1.25 * 60)) * 10) / 10;
    }

    return {
        status: 200,
        data: {
            success: true,
            jarak_meter: roadDist,
            durasi_menit: Math.max(1, durasiMenit),
            mode,
            polyline_geojson: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [sLng, sLat],
                        [sLng + (endLng! - sLng) * 0.5, sLat + (endLat! - sLat) * 0.4],
                        [endLng!, endLat!],
                    ],
                },
            },
        },
    };
}
