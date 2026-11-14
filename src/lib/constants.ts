// Warna kategori sesuai desain terkunci RINTIK (DESIGN.md)
export interface KategoriConfig {
    id: string;
    nama: string;
    warna: string;       // Hex token dari DESIGN.md
    warnaBg: string;     // Soft background tint
    warnaBorder: string; // Border stroke
    icon: string;        // Lucide icon name
}

export const KATEGORI_RINTIK: Record<string, KategoriConfig> = {
    Kuliner:   { id: "Kuliner",   nama: "Kuliner",   warna: "#E11D74", warnaBg: "rgba(225, 29, 116, 0.1)",  warnaBorder: "#E11D74", icon: "Utensils" },
    Fashion:   { id: "Fashion",   nama: "Fashion",   warna: "#FF8F00", warnaBg: "rgba(255, 143, 0, 0.1)",   warnaBorder: "#FF8F00", icon: "Shirt" },
    Jasa:      { id: "Jasa",      nama: "Jasa",      warna: "#000000", warnaBg: "rgba(0, 0, 0, 0.08)",       warnaBorder: "#000000", icon: "Briefcase" },
    Kerajinan: { id: "Kerajinan", nama: "Kerajinan", warna: "#2E8B3C", warnaBg: "rgba(46, 139, 60, 0.1)",   warnaBorder: "#2E8B3C", icon: "Palette" },
    Teknologi: { id: "Teknologi", nama: "Teknologi", warna: "#2538B8", warnaBg: "rgba(37, 56, 184, 0.1)",   warnaBorder: "#2538B8", icon: "Cpu" },
};

export const KATEGORI_WARNA: Record<string, { fill: string; stroke: string }> = {
    Kuliner:   { fill: "#E11D74", stroke: "#A01452" },
    Fashion:   { fill: "#FF8F00", stroke: "#CC7200" },
    Jasa:      { fill: "#000000", stroke: "#333333" },
    Kerajinan: { fill: "#2E8B3C", stroke: "#1E6028" },
    Teknologi: { fill: "#2538B8", stroke: "#1A2885" },
};

// Statistik Sebaran UMKM per Kecamatan (Dataset Tervalidasi 23 Sep 2026 - Total 2.993 UMKM)
export interface DistrictStat {
    nama: string;
    jumlah: number;
    persentase: number;
    warna: string;
}

export const STATISTIK_KECAMATAN_RINTIK: DistrictStat[] = [
    { nama: "Bogor Barat",  jumlah: 781, persentase: 26, warna: "#C62828" },
    { nama: "Tanah Sareal", jumlah: 531, persentase: 18, warna: "#DB2777" },
    { nama: "Bogor Tengah", jumlah: 499, persentase: 17, warna: "#C026D3" },
    { nama: "Bogor Utara",  jumlah: 493, persentase: 16, warna: "#9333EA" },
    { nama: "Bogor Selatan",jumlah: 429, persentase: 14, warna: "#A855F7" },
    { nama: "Bogor Timur",  jumlah: 260, persentase: 9,  warna: "#C084FC" },
];

export const TOTAL_UMKM_VALID = 2993;
export const TOTAL_KECAMATAN_VALID = 6;
export const TOTAL_KELURAHAN_VALID = 68;
export const TANGGAL_VALIDASI_DATASET = "23 Sep 2026";

// Normalisasi Nama Kecamatan & Kelurahan
export const NORMALISASI_WILAYAH: Record<string, string> = {
    "Tanahsareal": "Tanah Sareal",
    "Baranagsiang": "Baranangsiang",
    "Tegalega": "Tegallega",
    "Kebonkalapa": "Kebon Kelapa",
    "Babakanpasar": "Babakan Pasar",
    "Pasirjaya": "Pasir Jaya",
    "Curugmekar": "Curug Mekar",
    "Gunungbatu": "Gunung Batu",
    "Kebonpedes": "Kebon Pedes",
    "Tegalgundil": "Tegal Gundil",
    "Situgede": "Situ Gede",
};

// Daftar 6 Kecamatan dan Kelurahan di Kota Bogor
export const KECAMATAN_KELURAHAN_BOGOR: Record<string, string[]> = {
    "Bogor Barat": [
        "Balumbang Jaya",
        "Bubulak",
        "Cilendek Barat",
        "Cilendek Timur",
        "Curug",
        "Curug Mekar",
        "Gunung Batu",
        "Loji",
        "Margajaya",
        "Menteng",
        "Pasir Jaya",
        "Pasir Kuda",
        "Pasir Mulya",
        "Semplak",
        "Sindang Barang",
        "Situ Gede",
    ],
    "Bogor Selatan": [
        "Batutulis",
        "Bojongkerta",
        "Bondongan",
        "Cikaret",
        "Cipaku",
        "Empang",
        "Genteng",
        "Harjasari",
        "Kertamaya",
        "Lawanggintung",
        "Muarasari",
        "Mulyaharja",
        "Pakuan",
        "Pamoyanan",
        "Rancamaya",
        "Ranggamekar",
    ],
    "Bogor Tengah": [
        "Babakan",
        "Babakan Pasar",
        "Cibogor",
        "Ciwaringin",
        "Gudang",
        "Kebon Kelapa",
        "Pabaton",
        "Paledang",
        "Panaragan",
        "Sempur",
        "Tegallega",
    ],
    "Bogor Timur": [
        "Baranangsiang",
        "Katulampa",
        "Sindangrasa",
        "Sindangsari",
        "Sukasari",
        "Tajur",
    ],
    "Bogor Utara": [
        "Bantarjati",
        "Cibuluh",
        "Ciluar",
        "Cimahpar",
        "Ciparigi",
        "Kedunghalang",
        "Tanah Baru",
        "Tegal Gundil",
    ],
    "Tanah Sareal": [
        "Cibadak",
        "Kayumanis",
        "Kebon Pedes",
        "Kedungbadak",
        "Kedungjaya",
        "Kedungwaringin",
        "Kencana",
        "Mekarwangi",
        "Sukadamai",
        "Sukaresmi",
        "Tanah Sareal",
    ],
};

export const DAFTAR_KECAMATAN = Object.keys(KECAMATAN_KELURAHAN_BOGOR);
