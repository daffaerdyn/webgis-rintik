import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Format JSON tidak valid",
            },
            { status: 400 }
        );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return NextResponse.json(
            {
                success: false,
                message: "Input harus berupa objek JSON",
            },
            { status: 400 }
        );
    }

    const { latitude, longitude, radius } = body as Record<string, unknown>;

    // 1. Validasi koordinat dan radius
    if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        typeof radius !== "number" ||
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
                message: "Koordinat atau radius tidak valid",
            },
            { status: 400 }
        );
    }

    try {
        // 2. Validasi titik kandidat dalam Kota Bogor
        const wilayahResult = await supabase.rpc("is_point_in_bogor", {
            p_latitude: latitude,
            p_longitude: longitude,
        });

        if (wilayahResult.error) {
            console.error(
                "RINTIK buffer validasi wilayah error:",
                wilayahResult.error
            );
            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal memvalidasi wilayah lokasi",
                },
                { status: 502 }
            );
        }

        if (wilayahResult.data !== true) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Lokasi berada di luar wilayah Kota Bogor. " +
                        "Silakan pilih titik di dalam Kota Bogor.",
                },
                { status: 400 }
            );
        }

        // 3. Panggil fungsi buffer di PostGIS
        const { data, error } = await supabase.rpc("generate_buffer", {
            p_latitude: latitude,
            p_longitude: longitude,
            p_radius_m: radius,
        });

        if (error) {
            console.error("RINTIK buffer PostGIS error:", error);

            if (error.message?.includes("di luar wilayah Kota Bogor")) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Lokasi berada di luar wilayah Kota Bogor. " +
                            "Silakan pilih titik di dalam Kota Bogor.",
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal menghasilkan buffer",
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Buffer berhasil dibuat",
            data,
        });
    } catch (err) {
        console.error("RINTIK buffer server error:", err);
        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
