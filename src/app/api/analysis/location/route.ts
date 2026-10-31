
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Kategori UMKM sesuai dataset RINTIK
const KATEGORI = [
    "Kuliner",
    "Jasa",
    "Teknologi",
    "Kerajinan",
    "Fashion",
];

// Pengaturan pagination UMKM
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

// Struktur data UMKM
type Umkm = {
    id_umkm: string | number;
    nama_umkm: string;
    kategori: string;
    latitude: number;
    longitude: number;
    jarak_meter?: number | null;
};

// Struktur data fasilitas
type Fasilitas = {
    jenis_objek: string;
    jumlah: number;
};

// Mengambil seluruh hasil UMKM secara bertahap
async function ambilSemuaUmkm(
    latitude: number,
    longitude: number,
    radius: number,
    kategori: string
): Promise<{ data: Umkm[]; error: string | null }> {
    const semuaUmkm: Umkm[] = [];

    for (let halaman = 0; halaman < MAX_PAGES; halaman++) {
        const mulai = halaman * PAGE_SIZE;
        const akhir = mulai + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .rpc("get_umkm_in_radius", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
                p_kategori: kategori,
            })
            .order("id_umkm", { ascending: true })
            .range(mulai, akhir);

        if (error) {
            return {
                data: [],
                error: error.message,
            };
        }

        const halamanUmkm = (data ?? []) as Umkm[];

        semuaUmkm.push(...halamanUmkm);

        if (halamanUmkm.length < PAGE_SIZE) {
            return {
                data: semuaUmkm,
                error: null,
            };
        }
    }

    return {
        data: [],
        error:
            `Jumlah UMKM melebihi batas pengambilan ` +
            `${PAGE_SIZE * MAX_PAGES} data`,
    };
}

// API Analisis Lokasi Usaha RINTIK
export async function POST(request: NextRequest) {
    // 1. Membaca JSON dari frontend
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Format JSON tidak valid",
            },
            { status: 400 }
        );
    }

    if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
    ) {
        return NextResponse.json(
            {
                success: false,
                message: "Input harus berupa objek JSON",
            },
            { status: 400 }
        );
    }

    const {
        latitude,
        longitude,
        radius,
        kategori,
    } = body as Record<string, unknown>;

    // 2. Validasi koordinat dan radius
    if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        typeof radius !== "number" ||
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
        return NextResponse.json(
            {
                success: false,
                message: "Koordinat atau radius tidak valid",
            },
            { status: 400 }
        );
    }

    // 3. Validasi kategori UMKM
    if (
        typeof kategori !== "string" ||
        !KATEGORI.includes(kategori)
    ) {
        return NextResponse.json(
            {
                success: false,
                message: "Kategori UMKM tidak valid",
            },
            { status: 400 }
        );
    }

    try {
        // 4. Validasi titik kandidat dalam Kota Bogor
        const wilayahResult = await supabase.rpc(
            "is_point_in_bogor",
            {
                p_latitude: latitude,
                p_longitude: longitude,
            }
        );

        // Jika pemeriksaan wilayah gagal
        if (wilayahResult.error) {
            console.error(
                "RINTIK validasi wilayah error:",
                wilayahResult.error
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal memvalidasi wilayah lokasi",
                },
                { status: 502 }
            );
        }

        // Jika titik berada di luar Kota Bogor
        if (wilayahResult.data !== true) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Lokasi berada di luar wilayah Kota Bogor. " +
                        "Silakan pilih titik di dalam Kota Bogor.",
                },
                { status: 400 }
            );
        }

        // 5. Menjalankan analisis PostGIS
        const [
            bufferResult,
            umkmResult,
            fasilitasResult,
            nearestResult,
        ] = await Promise.all([
            // Membuat buffer GeoJSON
            supabase.rpc("generate_buffer", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
            }),

            // Mengambil semua UMKM dengan pagination
            ambilSemuaUmkm(
                latitude,
                longitude,
                radius,
                kategori
            ),

            // Menghitung fasilitas dalam radius
            supabase.rpc("get_nearby_facilities", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
            }),

            // Menghitung jarak fasilitas terdekat
            supabase.rpc("get_nearest_facilities", {
                p_latitude: latitude,
                p_longitude: longitude,
            }),
        ]);

        // 6. Memeriksa error dari Supabase
        const error =
            bufferResult.error ||
            umkmResult.error ||
            fasilitasResult.error ||
            nearestResult.error;

        if (error) {
            console.error("RINTIK PostGIS error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal menjalankan analisis lokasi",
                },
                { status: 502 }
            );
        }

        // 7. Menyiapkan hasil analisis
        const daftarUmkm = umkmResult.data;

        const fasilitas = (
            fasilitasResult.data ?? []
        ) as Fasilitas[];

        const jumlahSekolah =
            fasilitas.find(
                (item) => item.jenis_objek === "Sekolah"
            )?.jumlah ?? 0;

        const jumlahPoi =
            fasilitas.find(
                (item) => item.jenis_objek === "POI"
            )?.jumlah ?? 0;

        const objekTerdekat =
            nearestResult.data?.[0] ?? null;

        // 8. Mengirim respons ke frontend
        return NextResponse.json({
            success: true,
            message: "Analisis lokasi berhasil",

            data: {
                parameter: {
                    latitude,
                    longitude,
                    radius_meter: radius,
                    kategori,
                },

                buffer: bufferResult.data,

                umkm_sejenis: {
                    jumlah: daftarUmkm.length,
                    daftar: daftarUmkm,
                },

                fasilitas_dalam_radius: {
                    sekolah: jumlahSekolah,
                    poi: jumlahPoi,
                },

                fasilitas_terdekat: objekTerdekat,
            },
        });

    } catch (error) {
        console.error("RINTIK API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
