
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

        // Parameter area peta
        const minLngParam = searchParams.get("min_lng");
        const minLatParam = searchParams.get("min_lat");
        const maxLngParam = searchParams.get("max_lng");
        const maxLatParam = searchParams.get("max_lat");

        // Parameter filter
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

        // Parameter radius (opsional)
        const latitudeParam = searchParams.get("latitude");
        const longitudeParam = searchParams.get("longitude");
        const radiusParam = searchParams.get("radius");

        // Validasi Bounding Box wajib
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

        const minLng = Number(minLngParam);
        const minLat = Number(minLatParam);
        const maxLng = Number(maxLngParam);
        const maxLat = Number(maxLatParam);

        // Validasi koordinat area peta
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

        // Validasi panjang filter
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

        // Radius hanya aktif jika ada parameter radius
        const adaParameterRadius =
            latitudeParam !== null ||
            longitudeParam !== null ||
            radiusParam !== null;

        let latitude: number | null = null;
        let longitude: number | null = null;
        let radius: number | null = null;

        if (adaParameterRadius) {
            // Ketiga parameter harus diisi bersama
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
                            "Latitude, longitude, dan radius wajib diisi lengkap",
                    },
                    { status: 400 }
                );
            }

            latitude = Number(latitudeParam);
            longitude = Number(longitudeParam);
            radius = Number(radiusParam);

            // Validasi titik pusat
            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Koordinat pusat tidak valid",
                    },
                    { status: 400 }
                );
            }

            // Validasi radius dalam meter
            if (
                !Number.isFinite(radius) ||
                radius <= 0 ||
                radius > 5000
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Radius harus lebih dari 0 dan maksimal 5000 meter",
                    },
                    { status: 400 }
                );
            }
        }

        // Parameter umum untuk kedua fungsi PostGIS
        const parameterUmum = {
            p_min_lng: minLng,
            p_min_lat: minLat,
            p_max_lng: maxLng,
            p_max_lat: maxLat,
            p_kategori: kategori || null,
            p_kecamatan: kecamatan || null,
            p_kelurahan: kelurahan || null,
            p_search: search || null,
        };

        // Pilih fungsi sesuai ada atau tidaknya radius
        const namaFungsi = adaParameterRadius
            ? "get_umkm_map_radius_geojson"
            : "get_umkm_map_filtered_geojson";

        const parameterRpc = adaParameterRadius
            ? {
                ...parameterUmum,
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius: radius,
            }
            : parameterUmum;

        // Mengambil data dari Supabase PostGIS
        const { data, error } = await supabase.rpc(
            namaFungsi,
            parameterRpc
        );

        if (error) {
            console.error("RINTIK marker map error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil marker UMKM",
                },
                { status: 502 }
            );
        }

        const geojson = data as
            | GeoJSONFeatureCollection
            | null;

        // Validasi format GeoJSON
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

        // Respons berhasil
        return NextResponse.json({
            success: true,
            message: "Marker UMKM berhasil diambil",

            filter: {
                kategori,
                kecamatan,
                kelurahan,
                search,
                latitude,
                longitude,
                radius,
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
        console.error("RINTIK API map error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
