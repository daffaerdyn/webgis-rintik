
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type OsrmResponse = {
    code: string;
    message?: string;
    routes?: Array<{
        distance: number;
        duration: number;
        geometry: {
            type: string;
            coordinates: number[][];
        };
    }>;
};

export async function GET(request: NextRequest) {
    try {
        // 1. Membaca parameter dari URL
        const { searchParams } = new URL(request.url);

        const latitudeParam = searchParams.get("latitude");
        const longitudeParam = searchParams.get("longitude");
        const idUmkm = (searchParams.get("id_umkm") ?? "").trim();

        // 2. Validasi parameter wajib
        if (
            !latitudeParam?.trim() ||
            !longitudeParam?.trim() ||
            !idUmkm
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Latitude, longitude, dan id_umkm wajib diisi",
                },
                { status: 400 }
            );
        }

        const latitude = Number(latitudeParam);
        const longitude = Number(longitudeParam);

        // 3. Validasi koordinat titik awal
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
                    message: "Koordinat titik awal tidak valid",
                },
                { status: 400 }
            );
        }

        // 4. Validasi format ID UMKM
        if (!/^UMKM[0-9]+$/.test(idUmkm)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Format ID UMKM tidak valid",
                },
                { status: 400 }
            );
        }

        // 5. Mengambil koordinat tujuan dari Supabase
        const { data: umkm, error: dbError } = await supabase
            .from("umkm")
            .select(
                "id_umkm,nama_umkm,latitude,longitude"
            )
            .eq("id_umkm", idUmkm)
            .maybeSingle();

        if (dbError) {
            console.error("RINTIK routing DB error:", dbError);

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal mengambil lokasi UMKM",
                },
                { status: 502 }
            );
        }

        if (!umkm) {
            return NextResponse.json(
                {
                    success: false,
                    message: "UMKM tujuan tidak ditemukan",
                },
                { status: 404 }
            );
        }

        // 6. Validasi koordinat UMKM tujuan
        const tujuanLat = Number(umkm.latitude);
        const tujuanLng = Number(umkm.longitude);

        if (
            umkm.latitude === null ||
            umkm.longitude === null ||
            !Number.isFinite(tujuanLat) ||
            !Number.isFinite(tujuanLng) ||
            tujuanLat < -90 ||
            tujuanLat > 90 ||
            tujuanLng < -180 ||
            tujuanLng > 180
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Koordinat UMKM tidak tersedia atau tidak valid",
                },
                { status: 422 }
            );
        }

        // 7. Menyusun URL layanan OSRM
        // OSRM memakai urutan longitude,latitude
        const url = new URL(
            `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${tujuanLng},${tujuanLat}`
        );

        url.searchParams.set("overview", "full");
        url.searchParams.set("geometries", "geojson");
        url.searchParams.set("steps", "false");

        // 8. Meminta rute ke OSRM
        const response = await fetch(url.toString(), {
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Layanan routing sedang tidak tersedia",
                },
                { status: 502 }
            );
        }

        const hasil = (await response.json()) as OsrmResponse;

        // 9. Memeriksa hasil routing
        if (hasil.code !== "Ok" || !hasil.routes?.length) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Rute menuju UMKM tidak ditemukan",
                },
                { status: 404 }
            );
        }

        const rute = hasil.routes[0];

        if (
            !Number.isFinite(rute.distance) ||
            !Number.isFinite(rute.duration) ||
            rute.geometry?.type !== "LineString" ||
            !Array.isArray(rute.geometry.coordinates)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Data rute tidak valid",
                },
                { status: 502 }
            );
        }

        // 10. Mengirim rute ke frontend
        return NextResponse.json({
            success: true,
            message: "Rute menuju UMKM berhasil ditemukan",

            data: {
                titik_awal: {
                    latitude,
                    longitude,
                },

                tujuan: {
                    id_umkm: umkm.id_umkm,
                    nama_umkm: umkm.nama_umkm,
                    latitude: tujuanLat,
                    longitude: tujuanLng,
                },

                jarak_meter: rute.distance,
                durasi_detik: rute.duration,

                geometry: rute.geometry,
            },
        });

    } catch (error) {
        console.error("RINTIK routing error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Gagal memproses permintaan rute",
            },
            { status: 502 }
        );
    }
}
