import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import type { FeatureCollection, Feature, MultiPolygon, Polygon } from "geojson";

// Cache data di memory agar tidak membaca disk berulang kali
let cachedPermukimanData: FeatureCollection | null = null;

function loadPermukimanGeoJson(): FeatureCollection | null {
    if (cachedPermukimanData) {
        return cachedPermukimanData;
    }

    const primaryPath = path.join(
        process.cwd(),
        "public",
        "data",
        "permukiman_kota_bogor_final(Multipolygon).geojson"
    );

    try {
        if (fs.existsSync(primaryPath)) {
            const raw = fs.readFileSync(primaryPath, "utf-8");
            const parsed = JSON.parse(raw) as FeatureCollection;
            if (parsed && parsed.type === "FeatureCollection") {
                cachedPermukimanData = parsed;
                return parsed;
            }
        }
    } catch (err) {
        console.error("Gagal membaca file permukiman di path:", primaryPath, err);
    }

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const minLngParam = searchParams.get("min_lng");
        const minLatParam = searchParams.get("min_lat");
        const maxLngParam = searchParams.get("max_lng");
        const maxLatParam = searchParams.get("max_lat");

        const geojsonData = loadPermukimanGeoJson();

        if (!geojsonData) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Data layer permukiman belum tersedia di server",
                },
                { status: 404 }
            );
        }

        // Jika BBox parameter disediakan, filter feature yang berada dalam BBox
        if (minLngParam && minLatParam && maxLngParam && maxLatParam) {
            const minLng = Number(minLngParam);
            const minLat = Number(minLatParam);
            const maxLng = Number(maxLngParam);
            const maxLat = Number(maxLatParam);

            if (
                Number.isFinite(minLng) &&
                Number.isFinite(minLat) &&
                Number.isFinite(maxLng) &&
                Number.isFinite(maxLat)
            ) {
                const filteredFeatures = geojsonData.features.filter(
                    (feature: Feature) => {
                        const geom = feature.geometry;
                        if (!geom) return false;

                        if (geom.type === "Polygon") {
                            const poly = geom as Polygon;
                            return poly.coordinates.some((ring) =>
                                ring.some(
                                    ([lng, lat]) =>
                                        lng >= minLng &&
                                        lng <= maxLng &&
                                        lat >= minLat &&
                                        lat <= maxLat
                                )
                            );
                        }

                        if (geom.type === "MultiPolygon") {
                            const mpoly = geom as MultiPolygon;
                            return mpoly.coordinates.some((polygon) =>
                                polygon.some((ring) =>
                                    ring.some(
                                        ([lng, lat]) =>
                                            lng >= minLng &&
                                            lng <= maxLng &&
                                            lat >= minLat &&
                                            lat <= maxLat
                                    )
                                )
                            );
                        }

                        return false;
                    }
                );

                return NextResponse.json(
                    {
                        success: true,
                        message: "Layer permukiman berhasil difilter berdasarkan BBox",
                        jumlah: filteredFeatures.length,
                        data: {
                            type: "FeatureCollection",
                            features: filteredFeatures,
                        },
                    },
                    {
                        headers: {
                            "Cache-Control":
                                "public, max-age=3600, s-maxage=86400",
                        },
                    }
                );
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "Layer permukiman berhasil diambil",
                jumlah: geojsonData.features.length,
                data: geojsonData,
            },
            {
                headers: {
                    "Cache-Control": "public, max-age=3600, s-maxage=86400",
                },
            }
        );
    } catch (error) {
        console.error("RINTIK API permukiman error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan pada server",
            },
            { status: 500 }
        );
    }
}
