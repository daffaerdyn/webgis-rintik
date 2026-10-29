import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const KATEGORI_VALID = ["Kuliner", "Jasa", "Teknologi", "Kerajinan", "Fashion"];
const PANJANG_MAKSIMAL = 100;

// Merapikan parameter: kosong -> null, dipangkas spasi
function bersihkan(nilai: string | null): string | null {
    if (nilai === null) return null;
    const hasil = nilai.trim();
    return hasil === "" ? null : hasil;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const kategoriInput = bersihkan(searchParams.get("kategori"));
        const kecamatan = bersihkan(searchParams.get("kecamatan"));
        const kelurahan = bersihkan(searchParams.get("kelurahan"));

        // 1. Validasi input
        if (
            (kecamatan && kecamatan.length > PANJANG_MAKSIMAL) ||
            (kelurahan && kelurahan.length > PANJANG_MAKSIMAL)
        ) {
            return NextResponse.json(
                { success: false, message: "Parameter filter terlalu panjang" },
                { status: 400 }
            );
        }

        let kategori: string | null = null;
        if (kategoriInput) {
            kategori =
                KATEGORI_VALID.find(
                    (k) => k.toLowerCase() === kategoriInput.toLowerCase()
                ) ?? null;

            if (!kategori) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Kategori tidak valid. Gunakan: " +
                            KATEGORI_VALID.join(", "),
                    },
                    { status: 400 }
                );
            }
        }

        // 2. Memanggil fungsi statistik di Supabase
        const { data, error } = await supabase.rpc(
            "get_umkm_statistics_filtered",
            {
                p_kategori: kategori,
                p_kecamatan: kecamatan,
                p_kelurahan: kelurahan,
            }
        );

        // 3. Memeriksa error database
        if (error) {
            console.error("RINTIK statistik error:", error);
            return NextResponse.json(
                { success: false, message: "Gagal mengambil statistik UMKM" },
                { status: 502 }
            );
        }

        // 4. Memastikan hasil statistik tersedia
        if (!data) {
            return NextResponse.json(
                { success: false, message: "Data statistik tidak tersedia" },
                { status: 404 }
            );
        }

        // 5. Mengirim statistik ke frontend
        return NextResponse.json({
            success: true,
            message: "Statistik UMKM berhasil diambil",
            data: {
                filter: data.filter,
                total_umkm: data.total_umkm,
                per_kategori: data.per_kategori,
                per_kecamatan: data.per_kecamatan,
            },
        });
    } catch (error) {
        console.error("RINTIK API statistik error:", error);
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan pada server" },
            { status: 500 }
        );
    }
}