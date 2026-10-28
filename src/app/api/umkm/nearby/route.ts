
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const KATEGORI_VALID = [
    "Kuliner",
    "Jasa",
    "Teknologi",
    "Kerajinan",
    "Fashion",
];

export async function GET(request: NextRequest) {
    try {
        // 1. Membaca parameter dari URL
        const { searchParams } = new URL(request.url);

        const latitudeParam = searchParams.get("latitude");
        const longitudeParam = searchParams.get("longitude");
        const limitParam = searchParams.get("limit") ?? "10";
        const kategori = (searchParams.get("kategori") ?? "").trim();

        // 2. Memastikan koordinat diisi
        if (
            latitudeParam === null ||
            longitudeParam === null ||
            latitudeParam.trim() === "" ||
            longitudeParam.trim() === ""
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Latitude dan longitude wajib diisi",
                },
                { status: 400 }
            );
        }

        const latitude = Number(latitudeParam);
        const longitude = Number(longitudeParam);
        const limit = Number(limitParam);

        // 3. Validasi koordinat
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Koordinat tidak valid",
                },
                { status: 400 }
            );
        }

        // 4. Validasi jumlah UMKM
        if (
            !/^[0-9]+$/.test(limitParam) ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 20
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Limit harus antara 1 sampai 20",
                },
                { status: 400 }
            );
        }

        // 5. Validasi kategori
        if (
            kategori !== "" &&
            !KATEGORI_VALID.includes(kategori)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Kategori UMKM tidak valid",
                },
                { status: 400 }
            );
        }

        // 6. Memanggil fungsi PostGIS di Supabase
        const { data, error } = await supabase.rpc(
            "get_nearest_umkm",
            {
                p_latitude: latitude,
                p_longitude: longitude,
                p_limit: limit,
                p_kategori: kategori === "" ? null : kategori,
            }
        );

        // 7. Memeriksa error database
        if (error) {
            console.error("RINTIK nearby error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil UMKM terdekat",
                },
                { status: 502 }
            );
        }

        // 8. Mengirim hasil ke frontend
        return NextResponse.json({
            success: true,
            message: "UMKM terdekat berhasil diambil",

            parameter: {
                latitude,
                longitude,
                limit,
                kategori: kategori || null,
            },

            jumlah: data?.length ?? 0,
            data: data ?? [],
        });

    } catch (error) {
        console.error("RINTIK API nearby error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
