
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

type UmkmRadiusRow = {
    id_umkm: string;
    nama_umkm: string;
    kategori: string | null;
    kecamatan: string | null;
    kelurahan: string | null;
    latitude: number | null;
    longitude: number | null;
    jarak_meter: number;
    total_data: number;
};

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

        // Membaca parameter URL
        const pageParam = searchParams.get("page") ?? "1";
        const search = (searchParams.get("search") ?? "").trim();
        const kategori = (searchParams.get("kategori") ?? "").trim();
        const kecamatan = (searchParams.get("kecamatan") ?? "").trim();
        const kelurahan = (searchParams.get("kelurahan") ?? "").trim();

        // Parameter filter berdasarkan lokasi
        const latitudeParam = searchParams.get("latitude");
        const longitudeParam = searchParams.get("longitude");
        const radiusParam = searchParams.get("radius");

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

        // Validasi panjang filter
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

        // Memeriksa apakah filter radius digunakan
        const menggunakanRadius =
            latitudeParam !== null ||
            longitudeParam !== null ||
            radiusParam !== null;

        let latitude: number | null = null;
        let longitude: number | null = null;
        let radius: number | null = null;

        if (menggunakanRadius) {
            // Ketiga parameter wajib diisi bersama
            if (
                latitudeParam === null ||
                longitudeParam === null ||
                radiusParam === null ||
                latitudeParam.trim() === "" ||
                longitudeParam.trim() === "" ||
                radiusParam.trim() === ""
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Latitude, longitude, dan radius wajib diisi bersama",
                    },
                    { status: 400 }
                );
            }

            latitude = Number(latitudeParam);
            longitude = Number(longitudeParam);
            radius = Number(radiusParam);

            // Validasi koordinat dan radius
            if (
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
                        message:
                            "Koordinat tidak valid atau radius di luar batas 1-5000 meter",
                    },
                    { status: 400 }
                );
            }
        }

        const filter = {
            search,
            kategori,
            kecamatan,
            kelurahan,
            latitude,
            longitude,
            radius,
        };

        // FILTER BERDASARKAN RADIUS
        if (menggunakanRadius) {
            const { data, error } = await supabase.rpc(
                "search_umkm_in_radius",
                {
                    p_latitude: latitude,
                    p_longitude: longitude,
                    p_radius_m: radius,
                    p_kategori: kategori || null,
                    p_kecamatan: kecamatan || null,
                    p_kelurahan: kelurahan || null,
                    p_search: search || null,
                    p_page: page,
                    p_page_size: PAGE_SIZE,
                }
            );

            if (error) {
                console.error("RINTIK radius error:", error);

                return NextResponse.json(
                    {
                        success: false,
                        message: "Gagal mencari UMKM dalam radius",
                    },
                    { status: 502 }
                );
            }

            const hasil: UmkmRadiusRow[] = data ?? [];

            // Total dihitung oleh fungsi PostGIS
            let totalData = Number(
                hasil[0]?.total_data ?? 0
            );

            // Jika halaman kosong, periksa total dari halaman pertama
            if (hasil.length === 0 && page > 1) {
                const { data: dataAwal, error: errorAwal } =
                    await supabase.rpc(
                        "search_umkm_in_radius",
                        {
                            p_latitude: latitude,
                            p_longitude: longitude,
                            p_radius_m: radius,
                            p_kategori: kategori || null,
                            p_kecamatan: kecamatan || null,
                            p_kelurahan: kelurahan || null,
                            p_search: search || null,
                            p_page: 1,
                            p_page_size: 1,
                        }
                    );

                if (errorAwal) {
                    console.error(
                        "RINTIK total radius error:",
                        errorAwal
                    );

                    return NextResponse.json(
                        {
                            success: false,
                            message: "Gagal menghitung total UMKM",
                        },
                        { status: 502 }
                    );
                }

                totalData = Number(
                    dataAwal?.[0]?.total_data ?? 0
                );
            }

            return NextResponse.json({
                success: true,
                message: "Data UMKM dalam radius berhasil diambil",
                filter,
                pagination: {
                    halaman: page,
                    per_halaman: PAGE_SIZE,
                    total_data: totalData,
                    total_halaman: Math.ceil(
                        totalData / PAGE_SIZE
                    ),
                },
                data: hasil.map((item) => ({
                    id_umkm: item.id_umkm,
                    nama_umkm: item.nama_umkm,
                    kategori: item.kategori,
                    kecamatan: item.kecamatan,
                    kelurahan: item.kelurahan,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    jarak_meter: item.jarak_meter,
                })),
            });
        }

        // QUERY NORMAL TANPA FILTER RADIUS
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

        // Filter kategori
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

        const { data, error, count } = await query
            .order("id_umkm", { ascending: true })
            .range(mulai, akhir);

        if (error) {
            // Firewall Supabase (Cloudflare) memblokir pola yang mirip serangan SQL
            const diblokirFirewall =
                typeof error.message === "string" &&
                error.message.includes("Cloudflare");

            if (diblokirFirewall) {
                console.warn("RINTIK: pencarian diblokir firewall Supabase");

                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Kata pencarian mengandung pola yang tidak diizinkan",
                    },
                    { status: 400 }
                );
            }

            console.error("RINTIK UMKM error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil data UMKM",
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Data UMKM berhasil diambil",
            filter,
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
