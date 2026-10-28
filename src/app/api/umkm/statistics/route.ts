
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        // 1. Memanggil fungsi statistik di Supabase
        const { data, error } = await supabase.rpc(
            "get_umkm_statistics"
        );

        // 2. Memeriksa error database
        if (error) {
            console.error("RINTIK statistik error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil statistik UMKM",
                },
                { status: 502 }
            );
        }

        // 3. Memastikan hasil statistik tersedia
        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Data statistik tidak tersedia",
                },
                { status: 404 }
            );
        }

        // 4. Mengirim statistik ke frontend
        return NextResponse.json({
            success: true,
            message: "Statistik UMKM berhasil diambil",
            data: {
                total_umkm: data.total_umkm,
                per_kategori: data.per_kategori,
                per_kecamatan: data.per_kecamatan,
            },
        });

    } catch (error) {
        console.error("RINTIK API statistik error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
