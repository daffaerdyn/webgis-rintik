
"use client";

import { useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
    Popup,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { KATEGORI_WARNA } from "@/lib/constants";

type UmkmPoint = {
    id_umkm?: string | number;
    nama_umkm?: string;
    kategori?: string;
    latitude: number;
    longitude: number;
    jarak_meter?: number | null;
};

type AnalysisMapProps = {
    latitude: number;
    longitude: number;
    buffer: unknown;
    umkm: UmkmPoint[];
    kategori?: string;
    onSelectLocation: (lat: number, lng: number) => void;
};

// Mengambil koordinat dari klik pada peta
function MapClick({
    onSelectLocation,
}: {
    onSelectLocation: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onSelectLocation(
                Number(e.latlng.lat.toFixed(6)),
                Number(e.latlng.lng.toFixed(6))
            );
        },
    });

    return null;
}

// Memastikan GeoJSON yang diterima valid secara dasar
function isGeoJSON(value: unknown): value is GeoJsonObject {
    if (!value || typeof value !== "object") return false;

    const data = value as {
        type?: unknown;
        geometry?: unknown;
    };

    return (
        data.type === "Feature" &&
        data.geometry !== null &&
        typeof data.geometry === "object"
    );
}

// Mengarahkan tampilan peta ke lokasi analisis
function MapUpdater({
    latitude,
    longitude,
    buffer,
}: {
    latitude: number;
    longitude: number;
    buffer: unknown;
}) {
    const map = useMap();

    useEffect(() => {
        if (isGeoJSON(buffer)) {
            const layer = L.geoJSON(buffer);
            const bounds = layer.getBounds();

            if (bounds.isValid()) {
                map.fitBounds(bounds, {
                    padding: [30, 30],
                });
                return;
            }
        }

        map.setView([latitude, longitude], 15);
    }, [map, latitude, longitude, buffer]);

    return null;
}

export default function AnalysisMap({
    latitude,
    longitude,
    buffer,
    umkm,
    kategori,
    onSelectLocation,
}: AnalysisMapProps) {
    const posisi: [number, number] = [
        latitude,
        longitude,
    ];

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <MapContainer
                center={posisi}
                zoom={15}
                scrollWheelZoom={true}
                style={{
                    height: "450px",
                    width: "100%",
                }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClick onSelectLocation={onSelectLocation} />

                <MapUpdater
                    latitude={latitude}
                    longitude={longitude}
                    buffer={buffer}
                />

                {/* Titik kandidat lokasi usaha */}
                <CircleMarker
                    center={posisi}
                    radius={9}
                    pathOptions={{
                        color: "#991b1b",
                        fillColor: "#ef4444",
                        fillOpacity: 1,
                        weight: 3,
                        bubblingMouseEvents: false,
                    }}
                >
                    <Popup>
                        <strong>Lokasi Kandidat Usaha</strong>
                        <p>Latitude: {latitude}</p>
                        <p>Longitude: {longitude}</p>
                    </Popup>
                </CircleMarker>

                {/* Buffer asli hasil perhitungan PostGIS */}
                {isGeoJSON(buffer) && (
                    <GeoJSON
                        key={JSON.stringify(buffer)}
                        data={buffer}
                        interactive={false}
                        style={{
                            color: "#ea580c",
                            weight: 2,
                            dashArray: "6, 6",
                            fillColor: "#ea580c",
                            fillOpacity: 0.12,
                        }}
                    />
                )}

                {/* Titik UMKM sejenis */}
                {umkm.map((item, index) => {
                    const lat = Number(item.latitude);
                    const lng = Number(item.longitude);

                    if (
                        !Number.isFinite(lat) ||
                        !Number.isFinite(lng)
                    ) {
                        return null;
                    }

                    const katKey = item.kategori || kategori || "Kuliner";
                    const warna = KATEGORI_WARNA[katKey] || { fill: "#ea580c", stroke: "#9a3412" };

                    return (
                        <CircleMarker
                            key={item.id_umkm ?? index}
                            center={[lat, lng]}
                            radius={7}
                            pathOptions={{
                                color: warna.stroke,
                                fillColor: warna.fill,
                                fillOpacity: 0.9,
                                weight: 2,
                                bubblingMouseEvents: false,
                            }}
                        >
                            <Popup>
                                <div className="space-y-1 p-0.5 text-xs">
                                    <span
                                        className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white rounded-full"
                                        style={{ backgroundColor: warna.fill }}
                                    >
                                        {katKey}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                                        {item.nama_umkm ?? "UMKM"}
                                    </h4>
                                    {item.jarak_meter != null && (
                                        <p className="font-semibold text-emerald-700">
                                            ± {Math.round(Number(item.jarak_meter))} meter dari lokasi
                                        </p>
                                    )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
