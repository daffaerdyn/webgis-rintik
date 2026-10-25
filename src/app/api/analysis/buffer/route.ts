
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { latitude, longitude, radius } = body;

        // Validasi koordinat dan radius
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

        // Panggil fungsi buffer di PostGIS
        const { data, error } = await supabase.rpc(
            "generate_buffer",
            {
                p_latitude: latitude,
                p_longitude: longitude,
                p_radius_m: radius,
            }
        );

        if (error) {
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
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Format request tidak valid",
            },
            { status: 400 }
        );
    }
}
