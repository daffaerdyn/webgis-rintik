
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const KATEGORI_VALID = [
    "Kuliner",
    "Jasa",
    "Teknologi",
    "Kerajinan",
    "Fashion",
];

type GeoJSONFeatureCollection = {
    type: "FeatureCollection";
    features: Array<{
        type: "Feature";
        geometry: {
            type: string;
            coordinates: unknown;
        };
        properties: {
            id_umkm: string;
            nama_umkm: string;
            kategori: string | null;
            kecamatan: string | null;
            kelurahan: string | null;
        };
    }>;
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Membaca koordinat area peta
        const minLngParam = searchParams.get("min_lng");
        const minLatParam = searchParams.get("min_lat");
        const maxLngParam = searchParams.get("max_lng");
        const maxLatParam = searchParams.get("max_lat");

        // Membaca parameter filter UMKM
        const kategori = (
            searchParams.get("kategori") ?? ""
        ).trim();

        const kecamatan = (
            searchParams.get("kecamatan") ?? ""
        ).trim();

        const kelurahan = (
            searchParams.get("kelurahan") ?? ""
        ).trim();

        const search = (
            searchParams.get("search") ?? ""
        ).trim();

        // Validasi parameter Bounding Box wajib
        if (
            minLngParam === null ||
            minLatParam === null ||
            maxLngParam === null ||
            maxLatParam === null ||
            minLngParam.trim() === "" ||
            minLatParam.trim() === "" ||
            maxLngParam.trim() === "" ||
            maxLatParam.trim() === ""
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Bounding Box wajib diisi lengkap",
                },
                { status: 400 }
            );
        }

        // Mengubah koordinat menjadi angka
        const minLng = Number(minLngParam);
        const minLat = Number(minLatParam);
        const maxLng = Number(maxLngParam);
        const maxLat = Number(maxLatParam);

        // Validasi koordinat dan urutan Bounding Box
        if (
            !Number.isFinite(minLng) ||
            !Number.isFinite(minLat) ||
            !Number.isFinite(maxLng) ||
            !Number.isFinite(maxLat) ||
            minLng < -180 ||
            minLng > 180 ||
            maxLng < -180 ||
            maxLng > 180 ||
            minLat < -90 ||
            minLat > 90 ||
            maxLat < -90 ||
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

        // Membatasi ukuran area peta
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

        // Validasi panjang parameter filter
        if (
            kategori.length > 100 ||
            kecamatan.length > 100 ||
            kelurahan.length > 100 ||
            search.length > 100
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Parameter filter maksimal 100 karakter",
                },
                { status: 400 }
            );
        }

        // Validasi kategori UMKM
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

        // Mengambil marker dari fungsi PostGIS terbaru
        const { data, error } = await supabase.rpc(
            "get_umkm_map_filtered_geojson",
            {
                p_min_lng: minLng,
                p_min_lat: minLat,
                p_max_lng: maxLng,
                p_max_lat: maxLat,
                p_kategori: kategori || null,
                p_kecamatan: kecamatan || null,
                p_kelurahan: kelurahan || null,
                p_search: search || null,
            }
        );

        // Memeriksa error Supabase
        if (error) {
            console.error(
                "RINTIK marker map error:",
                error
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil marker UMKM",
                },
                { status: 502 }
            );
        }

        // Memastikan format respons sesuai GeoJSON
        const geojson = data as
            | GeoJSONFeatureCollection
            | null;

        if (
            !geojson ||
            geojson.type !== "FeatureCollection" ||
            !Array.isArray(geojson.features)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Format data GeoJSON tidak valid",
                },
                { status: 502 }
            );
        }

        // Mengirim hasil ke frontend
        return NextResponse.json({
            success: true,
            message: "Marker UMKM berhasil diambil",

            filter: {
                kategori,
                kecamatan,
                kelurahan,
                search,
            },

            bbox: {
                min_lng: minLng,
                min_lat: minLat,
                max_lng: maxLng,
                max_lat: maxLat,
            },

            jumlah: geojson.features.length,
            data: geojson,
        });

    } catch (error) {
        console.error(
            "RINTIK API map error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
