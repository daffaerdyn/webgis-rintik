"use client";

import { useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
    Popup,
    Polyline,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";

// Warna kategori sesuai desain RINTIK
export const KATEGORI_WARNA: Record<string, { fill: string; stroke: string }> = {
    Kuliner: { fill: "#ea580c", stroke: "#9a3412" }, // Oranye
    Jasa: { fill: "#c026d3", stroke: "#701a75" },    // Magenta
    Fashion: { fill: "#1e293b", stroke: "#0f172a" }, // Navy / Gelap
    Kerajinan: { fill: "#16a34a", stroke: "#14532d" },// Hijau
    Teknologi: { fill: "#2563eb", stroke: "#1e40af" },// Biru
};

export type UmkmFeature = {
    type: string;
    geometry: {
        type: string;
        coordinates: [number, number]; // [lng, lat]
    };
    properties: {
        id_umkm: string;
        nama_umkm: string;
        kategori: string;
        kecamatan?: string;
        kelurahan?: string;
    };
};

export type RouteInfo = {
    titik_awal: { latitude: number; longitude: number };
    tujuan: { id_umkm: string; nama_umkm: string };
    jarak_meter: number;
    durasi_detik: number;
    geometry: {
        type: string;
        coordinates: [number, number][]; // [[lng, lat], ...]
    };
};

type ExplorationMapProps = {
    umkmList: UmkmFeature[];
    startPoint: [number, number];
    onSelectStartPoint: (lat: number, lng: number) => void;
    onSelectRouteDestination: (id_umkm: string, nama_umkm: string) => void;
    routeData: RouteInfo | null;
    showWilayah: boolean;
    wilayahGeoJson: GeoJsonObject | null;
};

// Menangani klik pada peta untuk memindahkan titik awal rute
function MapClickObserver({
    onSelectStartPoint,
}: {
    onSelectStartPoint: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onSelectStartPoint(
                Number(e.latlng.lat.toFixed(6)),
                Number(e.latlng.lng.toFixed(6))
            );
        },
    });
    return null;
}

// Fit bounds saat rute aktif
function RouteFitter({ routeData }: { routeData: RouteInfo | null }) {
    const map = useMap();

    useEffect(() => {
        if (!routeData?.geometry?.coordinates?.length) return;

        const latLngs = routeData.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as [number, number]
        );

        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [map, routeData]);

    return null;
}

export default function ExplorationMap({
    umkmList,
    startPoint,
    onSelectStartPoint,
    onSelectRouteDestination,
    routeData,
    showWilayah,
    wilayahGeoJson,
}: ExplorationMapProps) {
    const center: [number, number] = [-6.595, 106.8167]; // Pusat Kota Bogor

    // Konversi koordinat rute GeoJSON [lng, lat] -> Leaflet [lat, lng]
    const routePolyline: [number, number][] =
        routeData?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) ?? [];

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-inner">
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "520px", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickObserver onSelectStartPoint={onSelectStartPoint} />
                <RouteFitter routeData={routeData} />

                {/* Layer Batas Kelurahan (Polygon) */}
                {showWilayah && wilayahGeoJson && (
                    <GeoJSON
                        key={JSON.stringify(showWilayah)}
                        data={wilayahGeoJson}
                        style={{
                            color: "#64748b",
                            weight: 1.5,
                            fillColor: "#94a3b8",
                            fillOpacity: 0.1,
                            dashArray: "4 4",
                        }}
                        onEachFeature={(feature, layer) => {
                            const name =
                                feature.properties?.nama_kelurahan ||
                                feature.properties?.nama ||
                                "Kelurahan";
                            layer.bindTooltip(name, {
                                sticky: true,
                                direction: "center",
                                className: "bg-white/80 text-xs px-1 rounded shadow-sm",
                            });
                        }}
                    />
                )}

                {/* Garis Rute Navigasi (Polyline OSRM) */}
                {routePolyline.length > 0 && (
                    <Polyline
                        positions={routePolyline}
                        pathOptions={{
                            color: "#dc2626", // Merah
                            weight: 5,
                            opacity: 0.85,
                            lineCap: "round",
                            lineJoin: "round",
                        }}
                    />
                )}

                {/* Titik Awal Pengunjung (Titik Awal Navigasi) */}
                <CircleMarker
                    center={startPoint}
                    radius={8}
                    pathOptions={{
                        color: "#1e3a8a",
                        fillColor: "#3b82f6",
                        fillOpacity: 1,
                        weight: 3,
                    }}
                >
                    <Popup>
                        <div className="p-1">
                            <strong className="text-blue-700">Titik Anda (Asal)</strong>
                            <p className="text-xs text-slate-500 mt-1">
                                Klik di mana saja pada peta untuk memindahkan posisi Anda.
                            </p>
                            <p className="text-xs text-slate-600 mt-1 font-mono">
                                {startPoint[0]}, {startPoint[1]}
                            </p>
                        </div>
                    </Popup>
                </CircleMarker>

                {/* Sebaran Titik UMKM */}
                {umkmList.map((item) => {
                    const [lng, lat] = item.geometry.coordinates;
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

                    const catColors =
                        KATEGORI_WARNA[item.properties.kategori] || {
                            fill: "#64748b",
                            stroke: "#334155",
                        };

                    return (
                        <CircleMarker
                            key={item.properties.id_umkm}
                            center={[lat, lng]}
                            radius={5}
                            pathOptions={{
                                color: catColors.stroke,
                                fillColor: catColors.fill,
                                fillOpacity: 0.9,
                                weight: 1.5,
                            }}
                        >
                            <Popup>
                                <div className="space-y-1 p-1 max-w-[200px]">
                                    <span
                                        className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white rounded-full"
                                        style={{ backgroundColor: catColors.fill }}
                                    >
                                        {item.properties.kategori}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                                        {item.properties.nama_umkm}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        {item.properties.kelurahan}, {item.properties.kecamatan}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSelectRouteDestination(
                                                item.properties.id_umkm,
                                                item.properties.nama_umkm
                                            )
                                        }
                                        className="mt-2 w-full text-center rounded bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                                    >
                                        🚗 Pandu Rute ke Sini
                                    </button>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
