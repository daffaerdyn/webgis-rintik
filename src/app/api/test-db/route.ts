
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("umkm")
            .select("id_umkm, nama_umkm, kategori")
            .limit(5);

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengakses database",
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Koneksi Supabase berhasil",
            jumlah_data_terbaca: data?.length ?? 0,
            data,
        });
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
