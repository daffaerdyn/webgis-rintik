const fs = require('fs');
const path = require('path');

function parseCSV(text) {
    const rows = [];
    let curRow = [];
    let curField = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                curField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            curRow.push(curField);
            curField = '';
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && text[i + 1] === '\n') i++;
            curRow.push(curField);
            curField = '';
            if (curRow.length > 1 || curRow[0] !== '') rows.push(curRow);
            curRow = [];
        } else {
            curField += c;
        }
    }
    if (curField || curRow.length > 0) {
        curRow.push(curField);
        rows.push(curRow);
    }
    return rows;
}

// Normalisasi ejaan nama wilayah agar 100% konsisten dengan layer batas kelurahan & filter UI
const KECAMATAN_NORMALIZATION = {
    'tanahsareal': 'Tanah Sareal'
};

const KELURAHAN_NORMALIZATION = {
    'balumbangjaya': 'Balumbang Jaya',
    'curugmekar': 'Curug Mekar',
    'gunungbatu': 'Gunung Batu',
    'pasirkuda': 'Pasir Kuda',
    'pasirmulya': 'Pasir Mulya',
    'sindangbarang': 'Sindang Barang',
    'situgede': 'Situ Gede',
    'tegalega': 'Tegallega',
    'baranagsiang': 'Baranangsiang',
    'tegalgundil': 'Tegal Gundil',
    'kebonpedes': 'Kebon Pedes',
    'tanahsareal': 'Tanah Sareal'
};

function normalizeKecamatan(kec) {
    if (!kec) return null;
    const clean = kec.trim().toLowerCase().replace(/\s+/g, '');
    return KECAMATAN_NORMALIZATION[clean] || kec.trim();
}

function normalizeKelurahan(kel) {
    if (!kel) return null;
    const clean = kel.trim().toLowerCase().replace(/\s+/g, '');
    return KELURAHAN_NORMALIZATION[clean] || kel.trim();
}

function escapeSql(str) {
    if (str === null || str === undefined || str.trim() === '') return 'NULL';
    return "'" + str.replace(/'/g, "''").trim() + "'";
}

const csvPath = path.resolve('c:/Users/asusi/OneDrive/Dokumen/Semester 5/Projek SIG/mengenai rintik/dataset/master_umkm_final_update.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(raw);

const header = rows[0];
const data = rows.slice(1);

console.log(`Membaca ${data.length} baris UMKM dari CSV...`);

const BATCH_SIZE = 250;
let sql = `-- =====================================================================
-- RINTIK: MIGRASI DATASET UMKM BARU (1.225 DATA FINAL)
-- Menggantikan dataset lama (2.993 data) dengan dataset baru Kota Bogor.
-- Menghitung PostGIS geom EPSG:4326 secara otomatis dari latitude & longitude.
-- =====================================================================

BEGIN;

-- 1. Kosongkan tabel UMKM lama
TRUNCATE TABLE public.umkm;

-- 2. Insert data baru
`;

for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    sql += `INSERT INTO public.umkm (
    id_umkm, nama_umkm, kategori, deskripsi_produk, alamat,
    kecamatan, kelurahan, latitude, longitude, range_harga,
    rating, source, collected_at, geom
) VALUES\n`;

    const valuesArr = batch.map((r) => {
        const id_umkm = escapeSql(r[0]);
        const nama_umkm = escapeSql(r[1]);
        const kategori = escapeSql(r[2]);
        const deskripsi_produk = escapeSql(r[3]);
        const alamat = escapeSql(r[4]);
        const kecamatan = escapeSql(normalizeKecamatan(r[5]));
        const kelurahan = escapeSql(normalizeKelurahan(r[6]));
        const lat = parseFloat(r[7]);
        const lng = parseFloat(r[8]);
        const range_harga = escapeSql(r[9]);
        const rating = !isNaN(parseFloat(r[10])) ? parseFloat(r[10]) : 'NULL';
        const source = escapeSql(r[11]);
        const collected_at = escapeSql(r[12]);

        const geomSql = `extensions.ST_SetSRID(extensions.ST_MakePoint(${lng}, ${lat}), 4326)`;

        return `(${id_umkm}, ${nama_umkm}, ${kategori}, ${deskripsi_produk}, ${alamat}, ${kecamatan}, ${kelurahan}, ${lat}, ${lng}, ${range_harga}, ${rating}, ${source}, ${collected_at}, ${geomSql})`;
    });

    sql += valuesArr.join(',\n') + ';\n\n';
}

sql += `COMMIT;

-- 3. Verifikasi jumlah data
SELECT count(*) AS total_umkm_baru FROM public.umkm;
`;

const outputPath = path.resolve('c:/Users/asusi/OneDrive/Dokumen/Semester 5/Projek SIG/webgis-rintik/supabase/sql/replace_umkm_dataset.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`File SQL berhasil digenerate di: ${outputPath}`);
console.log(`Ukuran file: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

