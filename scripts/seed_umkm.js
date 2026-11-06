const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Baca .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            process.env[key] = val;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local');
    console.error('Untuk menjalankan seed langsung via script Node.js, tambahkan:');
    console.error('SUPABASE_SERVICE_ROLE_KEY=eyJh... ke file .env.local');
    console.error('\nAlternatif: Jalankan file SQL langsung di Supabase SQL Editor:');
    console.error('supabase/sql/replace_umkm_dataset.sql');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Normalisasi
const KECAMATAN_NORMALIZATION = { 'tanahsareal': 'Tanah Sareal' };
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
    return KECAMATAN_NORMALIZATION[kec.trim().toLowerCase().replace(/\s+/g, '')] || kec.trim();
}

function normalizeKelurahan(kel) {
    if (!kel) return null;
    return KELURAHAN_NORMALIZATION[kel.trim().toLowerCase().replace(/\s+/g, '')] || kel.trim();
}

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

async function run() {
    console.log('1. Mengosongkan tabel umkm lama...');
    const { error: delErr } = await supabase.from('umkm').delete().neq('id_umkm', 'DUMMY_ID_THAT_DELETES_ALL');
    // Note: in Supabase delete without where is not allowed, neq matches all
    if (delErr) {
        console.error('Gagal delete:', delErr.message);
        return;
    }

    const csvPath = 'c:/Users/asusi/OneDrive/Dokumen/Semester 5/Projek SIG/mengenai rintik/dataset/master_umkm_final_update.csv';
    const raw = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCSV(raw).slice(1);

    console.log(`2. Memulai insert ${rows.length} data UMKM baru...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map(r => {
            const lat = parseFloat(r[7]);
            const lng = parseFloat(r[8]);
            return {
                id_umkm: r[0]?.trim(),
                nama_umkm: r[1]?.trim(),
                kategori: r[2]?.trim(),
                deskripsi_produk: r[3]?.trim() || null,
                alamat: r[4]?.trim() || null,
                kecamatan: normalizeKecamatan(r[5]),
                kelurahan: normalizeKelurahan(r[6]),
                latitude: lat,
                longitude: lng,
                range_harga: r[9]?.trim() || null,
                rating: !isNaN(parseFloat(r[10])) ? parseFloat(r[10]) : null,
                source: r[11]?.trim() || null,
                collected_at: r[12]?.trim() || new Date().toISOString(),
                // PostGIS Point GeoJSON
                geom: {
                    type: 'Point',
                    coordinates: [lng, lat]
                }
            };
        });

        const { error: insErr } = await supabase.from('umkm').insert(batch);
        if (insErr) {
            console.error(`Gagal batch ${i} - ${i + batch.length}:`, insErr.message);
            return;
        }
        process.stdout.write(`\rInserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} UMKM`);
    }

    console.log('\n\nMigrasi UMKM berhasil!');
}

run();

