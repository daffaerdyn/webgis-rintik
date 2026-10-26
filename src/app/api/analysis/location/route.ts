
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Kategori UMKM yang digunakan RINTIK
const KATEGORI = [
    "Kuliner",
    "Jasa",
    "Teknologi",
    "Kerajinan",
    "Fashion",
];

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

    // 2. Validasi parameter
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
        // 3. Menjalankan 4 fungsi PostGIS
        const [
            bufferResult,
            umkmResult,
            fasilitasResult,
            nearestResult,
        ] = await Promise.all([
            supabase.rpc("generate_buffer", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
            }),

            supabase.rpc("get_umkm_in_radius", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
                p_kategori: kategori,
            }),

            supabase.rpc("get_nearby_facilities", {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
            }),

            supabase.rpc("get_nearest_facilities", {
                p_latitude: latitude,
                p_longitude: longitude,
            }),
        ]);

        // 4. Periksa error dari Supabase
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

        // 5. Menyiapkan hasil analisis
        const daftarUmkm = umkmResult.data ?? [];

        type Fasilitas = {
            jenis_objek: string;
            jumlah: number;
        };

        const fasilitas: Fasilitas[] =
            (fasilitasResult.data ?? []) as Fasilitas[];

        const jumlahSekolah =
            fasilitas.find(
                (item) => item.jenis_objek === "Sekolah"
            )?.jumlah ?? null;

        const jumlahPoi =
            fasilitas.find(
                (item) => item.jenis_objek === "POI"
            )?.jumlah ?? null;

        const objekTerdekat =
            nearestResult.data?.[0] ?? null;

        // 6. Mengirim hasil ke frontend
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
