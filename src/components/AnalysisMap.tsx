
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

type UmkmPoint = {
    id_umkm?: string | number;
    nama_umkm?: string;
    kategori?: string;
    latitude: number;
    longitude: number;
};

type AnalysisMapProps = {
    latitude: number;
    longitude: number;
    buffer: unknown;
    umkm: UmkmPoint[];
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
                            color: "#059669",
                            weight: 2,
                            fillColor: "#10b981",
                            fillOpacity: 0.15,
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

                    return (
                        <CircleMarker
                            key={item.id_umkm ?? index}
                            center={[lat, lng]}
                            radius={6}
                            pathOptions={{
                                color: "#1d4ed8",
                                fillColor: "#3b82f6",
                                fillOpacity: 0.9,
                                bubblingMouseEvents: false,
                            }}
                        >
                            <Popup>
                                <strong>
                                    {item.nama_umkm ?? "UMKM"}
                                </strong>
                                <p>
                                    Kategori: {item.kategori ?? "-"}
                                </p>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
