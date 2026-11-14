import fs from 'node:fs';
import path from 'node:path';

export interface UmkmRecord {
    id_umkm: string;
    nama_umkm: string;
    kategori: string;
    deskripsi_produk: string;
    alamat: string;
    kecamatan: string;
    kelurahan: string;
    latitude: number;
    longitude: number;
    range_harga: string;
    rating: number | null;
    source: string;
    collected_at: string;
}

export interface DatasetStats {
    total: number;
    perKecamatan: Record<string, number>;
    perKategori: Record<string, number>;
    bounds: {
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
    };
}

let cachedDataset: UmkmRecord[] | null = null;
let cachedStats: DatasetStats | null = null;

/**
 * Resolves path to the authoritative master UMKM dataset.
 */
function findDatasetPath(): string {
    const candidatePaths = [
        path.resolve(process.cwd(), 'docs/dataset/dataset_rintik_umkm_bogor_qgis_final.csv'),
        path.resolve(process.cwd(), '../../docs/dataset/dataset_rintik_umkm_bogor_qgis_final.csv'),
        path.resolve('D:/Learn_IPB/Semester 5/Sistem Informasi Geografis/PJBL-WebGIS-RINTIK/docs/dataset/dataset_rintik_umkm_bogor_qgis_final.csv'),
    ];

    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`Master dataset CSV not found in candidate paths: ${candidatePaths.join(', ')}`);
}

/**
 * Parses a single CSV line with quoted commas support.
 */
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Loads the verified 2,993 UMKM dataset from authoritative CSV.
 */
export function loadMasterDataset(): UmkmRecord[] {
    if (cachedDataset) return cachedDataset;

    const filePath = findDatasetPath();
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('Dataset file is empty or missing data rows');
    }

    const data: UmkmRecord[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCsvLine(line);
        if (cols.length < 13) continue;

        const lat = parseFloat(cols[7]);
        const lng = parseFloat(cols[8]);
        const ratingParsed = cols[10] ? parseFloat(cols[10]) : null;

        data.push({
            id_umkm: cols[0],
            nama_umkm: cols[1],
            kategori: cols[2],
            deskripsi_produk: cols[3],
            alamat: cols[4],
            kecamatan: cols[5],
            kelurahan: cols[6],
            latitude: lat,
            longitude: lng,
            range_harga: cols[9],
            rating: isNaN(ratingParsed as number) ? null : ratingParsed,
            source: cols[11],
            collected_at: cols[12],
        });
    }

    cachedDataset = data;
    return data;
}

/**
 * Returns pre-calculated statistics across the 2,993 dataset.
 */
export function getDatasetStatistics(): DatasetStats {
    if (cachedStats) return cachedStats;

    const data = loadMasterDataset();
    const perKecamatan: Record<string, number> = {};
    const perKategori: Record<string, number> = {};

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    for (const item of data) {
        perKecamatan[item.kecamatan] = (perKecamatan[item.kecamatan] || 0) + 1;
        perKategori[item.kategori] = (perKategori[item.kategori] || 0) + 1;

        if (item.latitude < minLat) minLat = item.latitude;
        if (item.latitude > maxLat) maxLat = item.latitude;
        if (item.longitude < minLng) minLng = item.longitude;
        if (item.longitude > maxLng) maxLng = item.longitude;
    }

    cachedStats = {
        total: data.length,
        perKecamatan,
        perKategori,
        bounds: { minLat, maxLat, minLng, maxLng },
    };

    return cachedStats;
}
