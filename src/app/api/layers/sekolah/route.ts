
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    try {
        // 1. Membaca parameter Bounding Box
        const { searchParams } = new URL(request.url);

        const minLngParam = searchParams.get("min_lng");
        const minLatParam = searchParams.get("min_lat");
        const maxLngParam = searchParams.get("max_lng");
        const maxLatParam = searchParams.get("max_lat");

        // 2. Memastikan parameter wajib diisi
        if (
            !minLngParam?.trim() ||
            !minLatParam?.trim() ||
            !maxLngParam?.trim() ||
            !maxLatParam?.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Semua parameter Bounding Box wajib diisi",
                },
                { status: 400 }
            );
        }

        // 3. Mengubah parameter menjadi angka
        const minLng = Number(minLngParam);
        const minLat = Number(minLatParam);
        const maxLng = Number(maxLngParam);
        const maxLat = Number(maxLatParam);

        // 4. Validasi koordinat Bounding Box
        if (
            !Number.isFinite(minLng) ||
            !Number.isFinite(minLat) ||
            !Number.isFinite(maxLng) ||
            !Number.isFinite(maxLat) ||
            minLng < -180 ||
            maxLng > 180 ||
            minLat < -90 ||
            maxLat > 90 ||
            minLng >= maxLng ||
            minLat >= maxLat
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Bounding Box tidak valid",
                },
                { status: 400 }
            );
        }

        // 5. Membatasi ukuran area
        if (
            maxLng - minLng > 0.5 ||
            maxLat - minLat > 0.5
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Area peta terlalu luas",
                },
                { status: 400 }
            );
        }

        // 6. Memanggil fungsi PostGIS sekolah
        const { data, error } = await supabase.rpc(
            "get_sekolah_geojson",
            {
                p_min_lng: minLng,
                p_min_lat: minLat,
                p_max_lng: maxLng,
                p_max_lat: maxLat,
            }
        );

        // 7. Memeriksa error database
        if (error) {
            console.error("RINTIK sekolah error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil layer sekolah",
                },
                { status: 502 }
            );
        }

        // 8. Memastikan format GeoJSON benar
        if (
            !data ||
            data.type !== "FeatureCollection" ||
            !Array.isArray(data.features)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Data GeoJSON sekolah tidak valid",
                },
                { status: 502 }
            );
        }

        // 9. Mengirim data ke frontend
        return NextResponse.json({
            success: true,
            message: "Layer sekolah berhasil diambil",

            bbox: {
                min_lng: minLng,
                min_lat: minLat,
                max_lng: maxLng,
                max_lat: maxLat,
            },

            jumlah: data.features.length,
            data,
        });

    } catch (error) {
        console.error("RINTIK API sekolah error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
