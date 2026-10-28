
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

const KATEGORI_VALID = [
    "Kuliner",
    "Jasa",
    "Teknologi",
    "Kerajinan",
    "Fashion",
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Membaca parameter dari URL
        const pageParam = searchParams.get("page") ?? "1";
        const search = (searchParams.get("search") ?? "").trim();
        const kategori = (searchParams.get("kategori") ?? "").trim();
        const kecamatan = (searchParams.get("kecamatan") ?? "").trim();
        const kelurahan = (searchParams.get("kelurahan") ?? "").trim();

        const page = Number(pageParam);

        // Validasi halaman
        if (
            !/^[0-9]+$/.test(pageParam) ||
            !Number.isSafeInteger(page) ||
            page < 1
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Nomor halaman tidak valid",
                },
                { status: 400 }
            );
        }

        // Validasi panjang parameter
        if (
            search.length > 100 ||
            kategori.length > 100 ||
            kecamatan.length > 100 ||
            kelurahan.length > 100
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Parameter filter maksimal 100 karakter",
                },
                { status: 400 }
            );
        }

        // Validasi kategori
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

        // Menghitung pagination
        const mulai = (page - 1) * PAGE_SIZE;
        const akhir = mulai + PAGE_SIZE - 1;

        if (!Number.isSafeInteger(akhir)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Nomor halaman terlalu besar",
                },
                { status: 400 }
            );
        }

        // Query utama Supabase
        let query = supabase
            .from("umkm")
            .select(
                "id_umkm,nama_umkm,kategori,kecamatan,kelurahan,latitude,longitude",
                { count: "exact" }
            );

        // Filter pencarian nama UMKM
        if (search !== "") {
            const kataAman = search.replace(
                /[\\%_]/g,
                (karakter) => `\\${karakter}`
            );

            query = query.ilike(
                "nama_umkm",
                `%${kataAman}%`
            );
        }

        // Filter kategori UMKM
        if (kategori !== "") {
            query = query.eq("kategori", kategori);
        }

        // Filter kecamatan
        if (kecamatan !== "") {
            query = query.eq("kecamatan", kecamatan);
        }

        // Filter kelurahan
        if (kelurahan !== "") {
            query = query.eq("kelurahan", kelurahan);
        }

        // Mengambil data dengan pagination
        const { data, error, count } = await query
            .order("id_umkm", { ascending: true })
            .range(mulai, akhir);

        if (error) {
            console.error("RINTIK UMKM error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil data UMKM",
                },
                { status: 502 }
            );
        }

        // Mengirim hasil ke frontend
        return NextResponse.json({
            success: true,
            message: "Data UMKM berhasil diambil",

            filter: {
                search,
                kategori,
                kecamatan,
                kelurahan,
            },

            pagination: {
                halaman: page,
                per_halaman: PAGE_SIZE,
                total_data: count ?? 0,
                total_halaman: Math.ceil(
                    (count ?? 0) / PAGE_SIZE
                ),
            },

            data: data ?? [],
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
