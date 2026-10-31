
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        // 1. Memanggil fungsi GeoJSON wilayah di Supabase
        const { data, error } = await supabase.rpc(
            "get_wilayah_geojson"
        );

        // 2. Memeriksa error database
        if (error) {
            console.error("RINTIK wilayah error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil layer wilayah",
                },
                { status: 502 }
            );
        }

        // 3. Memastikan format GeoJSON valid
        if (
            !data ||
            data.type !== "FeatureCollection" ||
            !Array.isArray(data.features)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Data GeoJSON wilayah tidak valid",
                },
                { status: 502 }
            );
        }

        // 4. Mengirim hasil ke frontend
        return NextResponse.json({
            success: true,
            message: "Layer wilayah berhasil diambil",

            jumlah: data.features.length,

            data: data,
        });

    } catch (error) {
        console.error("RINTIK API wilayah error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
