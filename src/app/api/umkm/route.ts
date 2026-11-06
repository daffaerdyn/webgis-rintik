
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

function parseHargaMin(rangeHarga: string | null): number {
    if (!rangeHarga) return 999999999;
    const match = rangeHarga.replace(/\./g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 999999999;
}

function parseHargaMax(rangeHarga: string | null): number {
    if (!rangeHarga) return 0;
    const matches = rangeHarga.replace(/\./g, "").match(/\d+/g);
    if (!matches) return 0;
    return parseInt(matches[matches.length - 1], 10);
}

function hitungJarakMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

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

        // Parameter sorting dan filter harga / rating
        const sort = (searchParams.get("sort") ?? "default").trim();
        const minRatingParam = searchParams.get("min_rating");
        const minRating = minRatingParam && !isNaN(Number(minRatingParam)) ? Number(minRatingParam) : null;
        const rentangHarga = (searchParams.get("rentang_harga") ?? "").trim(); // murah, menengah, premium
        const userLatParam = searchParams.get("user_lat");
        const userLngParam = searchParams.get("user_lng");

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
            sort,
            min_rating: minRating,
            rentang_harga: rentangHarga || null,
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

            // Ambil data pendukung (deskripsi, harga, rating) untuk 20 item pada halaman ini
            const idList = hasil.map((item) => item.id_umkm);
            const detailMap: Record<
                string,
                {
                    deskripsi_produk: string | null;
                    alamat: string | null;
                    range_harga: string | null;
                    rating: number | null;
                }
            > = {};

            if (idList.length > 0) {
                const { data: details } = await supabase
                    .from("umkm")
                    .select("id_umkm, deskripsi_produk, alamat, range_harga, rating")
                    .in("id_umkm", idList);

                if (details) {
                    for (const d of details) {
                        detailMap[d.id_umkm] = d;
                    }
                }
            }

            let list = hasil.map((item) => ({
                id_umkm: item.id_umkm,
                nama_umkm: item.nama_umkm,
                kategori: item.kategori,
                deskripsi_produk: detailMap[item.id_umkm]?.deskripsi_produk ?? null,
                alamat: detailMap[item.id_umkm]?.alamat ?? null,
                kecamatan: item.kecamatan,
                kelurahan: item.kelurahan,
                latitude: item.latitude,
                longitude: item.longitude,
                range_harga: detailMap[item.id_umkm]?.range_harga ?? null,
                rating: detailMap[item.id_umkm]?.rating ?? null,
                jarak_meter: item.jarak_meter,
            }));

            // Filter rating
            if (minRating !== null) {
                list = list.filter((x) => (x.rating ?? 0) >= minRating);
            }

            // Filter harga
            if (rentangHarga === "murah") {
                list = list.filter((x) => parseHargaMin(x.range_harga) < 25000);
            } else if (rentangHarga === "menengah") {
                list = list.filter((x) => {
                    const h = parseHargaMin(x.range_harga);
                    return h >= 25000 && h <= 50000;
                });
            } else if (rentangHarga === "premium") {
                list = list.filter((x) => parseHargaMin(x.range_harga) > 50000);
            }

            // Sorting
            if (sort === "rating") {
                list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
            } else if (sort === "jarak") {
                list.sort((a, b) => a.jarak_meter - b.jarak_meter);
            } else if (sort === "rating_jarak" || sort === "rekomendasi") {
                list.sort((a, b) => {
                    const scoreA = ((a.rating ?? 3) / 5) * 50 + (1000 / (1000 + a.jarak_meter)) * 50;
                    const scoreB = ((b.rating ?? 3) / 5) * 50 + (1000 / (1000 + b.jarak_meter)) * 50;
                    return scoreB - scoreA;
                });
            } else if (sort === "harga_termurah") {
                list.sort((a, b) => parseHargaMin(a.range_harga) - parseHargaMin(b.range_harga));
            } else if (sort === "harga_termahal") {
                list.sort((a, b) => parseHargaMax(b.range_harga) - parseHargaMax(a.range_harga));
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
                data: list,
            });
        }

        // QUERY NORMAL TANPA FILTER RADIUS
        const visitorLat = userLatParam ? Number(userLatParam) : (latitudeParam && !menggunakanRadius ? Number(latitudeParam) : null);
        const visitorLng = userLngParam ? Number(userLngParam) : (longitudeParam && !menggunakanRadius ? Number(longitudeParam) : null);
        const hasVisitorLoc = visitorLat !== null && visitorLng !== null && Number.isFinite(visitorLat) && Number.isFinite(visitorLng);

        let query = supabase
            .from("umkm")
            .select(
                "id_umkm,nama_umkm,kategori,deskripsi_produk,alamat,kecamatan,kelurahan,latitude,longitude,range_harga,rating",
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

        // Filter minimum rating
        if (minRating !== null) {
            query = query.gte("rating", minRating);
        }

        const needsCustomSortOrFilter =
            rentangHarga !== "" ||
            sort === "jarak" ||
            sort === "rating_jarak" ||
            sort === "rekomendasi" ||
            sort === "harga_termurah" ||
            sort === "harga_termahal";

        let finalData: Array<{
            id_umkm: string;
            nama_umkm: string;
            kategori: string | null;
            deskripsi_produk: string | null;
            alamat: string | null;
            kecamatan: string | null;
            kelurahan: string | null;
            latitude: number | null;
            longitude: number | null;
            range_harga: string | null;
            rating: number | null;
            jarak_meter?: number | null;
        }> = [];
        let totalCount = 0;

        if (needsCustomSortOrFilter) {
            // Ambil data untuk sorting dan filtering harga/jarak
            const { data: allMatches, error: allErr } = await query;
            if (allErr) {
                console.error("RINTIK UMKM query error:", allErr);
                return NextResponse.json({ success: false, message: "Gagal mengambil data UMKM" }, { status: 502 });
            }

            let list = (allMatches ?? []).map((item) => {
                let jarakMeter: number | null = null;
                if (hasVisitorLoc && item.latitude != null && item.longitude != null) {
                    jarakMeter = hitungJarakMeter(visitorLat!, visitorLng!, item.latitude, item.longitude);
                }
                return {
                    ...item,
                    jarak_meter: jarakMeter,
                };
            });

            // Filter harga
            if (rentangHarga === "murah") {
                list = list.filter((x) => parseHargaMin(x.range_harga) < 25000);
            } else if (rentangHarga === "menengah") {
                list = list.filter((x) => {
                    const h = parseHargaMin(x.range_harga);
                    return h >= 25000 && h <= 50000;
                });
            } else if (rentangHarga === "premium") {
                list = list.filter((x) => parseHargaMin(x.range_harga) > 50000);
            }

            // Custom sort
            if (sort === "rating") {
                list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
            } else if (sort === "jarak" && hasVisitorLoc) {
                list.sort((a, b) => (a.jarak_meter ?? 999999999) - (b.jarak_meter ?? 999999999));
            } else if ((sort === "rating_jarak" || sort === "rekomendasi") && hasVisitorLoc) {
                list.sort((a, b) => {
                    const distA = a.jarak_meter ?? 5000;
                    const distB = b.jarak_meter ?? 5000;
                    const scoreA = ((a.rating ?? 3) / 5) * 50 + (1000 / (1000 + distA)) * 50;
                    const scoreB = ((b.rating ?? 3) / 5) * 50 + (1000 / (1000 + distB)) * 50;
                    return scoreB - scoreA;
                });
            } else if (sort === "harga_termurah") {
                list.sort((a, b) => parseHargaMin(a.range_harga) - parseHargaMin(b.range_harga));
            } else if (sort === "harga_termahal") {
                list.sort((a, b) => parseHargaMax(b.range_harga) - parseHargaMax(a.range_harga));
            }

            totalCount = list.length;
            finalData = list.slice(mulai, akhir + 1);
        } else {
            // Sort database bawaan
            if (sort === "rating") {
                query = query.order("rating", { ascending: false, nullsFirst: false });
            } else {
                query = query.order("id_umkm", { ascending: true });
            }

            const { data, error, count } = await query.range(mulai, akhir);

            if (error) {
                const diblokirFirewall =
                    typeof error.message === "string" &&
                    error.message.includes("Cloudflare");

                if (diblokirFirewall) {
                    console.warn("RINTIK: pencarian diblokir firewall Supabase");
                    return NextResponse.json(
                        { success: false, message: "Kata pencarian mengandung pola yang tidak diizinkan" },
                        { status: 400 }
                    );
                }

                console.error("RINTIK UMKM error:", error);
                return NextResponse.json({ success: false, message: "Gagal mengambil data UMKM" }, { status: 502 });
            }

            totalCount = count ?? 0;
            finalData = (data ?? []).map((item) => {
                let jarakMeter: number | null = null;
                if (hasVisitorLoc && item.latitude != null && item.longitude != null) {
                    jarakMeter = hitungJarakMeter(visitorLat!, visitorLng!, item.latitude, item.longitude);
                }
                return {
                    ...item,
                    jarak_meter: jarakMeter,
                };
            });
        }

        return NextResponse.json({
            success: true,
            message: "Data UMKM berhasil diambil",
            filter,
            pagination: {
                halaman: page,
                per_halaman: PAGE_SIZE,
                total_data: totalCount,
                total_halaman: Math.ceil(
                    totalCount / PAGE_SIZE
                ),
            },
            data: finalData,
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
