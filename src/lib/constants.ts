// Warna kategori sesuai desain RINTIK
export const KATEGORI_WARNA: Record<string, { fill: string; stroke: string }> = {
    Kuliner: { fill: "#ea580c", stroke: "#9a3412" }, // Oranye
    Jasa: { fill: "#c026d3", stroke: "#701a75" },    // Magenta
    Fashion: { fill: "#1e293b", stroke: "#0f172a" }, // Navy / Gelap
    Kerajinan: { fill: "#16a34a", stroke: "#14532d" },// Hijau
    Teknologi: { fill: "#2563eb", stroke: "#1e40af" },// Biru
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
