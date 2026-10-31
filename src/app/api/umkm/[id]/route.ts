
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
    _request: NextRequest,
    context: {
        params: Promise<{ id: string }>;
    }
) {
    try {
        // 1. Mengambil ID UMKM dari URL
        const { id } = await context.params;

        // 2. Validasi format ID UMKM
        if (!/^UMKM[0-9]+$/.test(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Format ID UMKM tidak valid",
                },
                { status: 400 }
            );
        }

        // 3. Mengambil detail UMKM dari Supabase
        const { data, error } = await supabase
            .from("umkm")
            .select(`
                id_umkm,
                nama_umkm,
                kategori,
                deskripsi_produk,
                alamat,
                kecamatan,
                kelurahan,
                latitude,
                longitude,
                range_harga,
                rating
            `)
            .eq("id_umkm", id)
            .maybeSingle();

        // 4. Memeriksa error database
        if (error) {
            console.error("RINTIK detail UMKM error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil detail UMKM",
                },
                { status: 502 }
            );
        }

        // 5. Jika UMKM tidak ditemukan
        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    message: "UMKM tidak ditemukan",
                },
                { status: 404 }
            );
        }

        // 6. Mengirim detail UMKM
        return NextResponse.json({
            success: true,
            message: "Detail UMKM berhasil diambil",
            data,
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
