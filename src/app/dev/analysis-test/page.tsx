
"use client";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import { useState } from "react";

const AnalysisMap = dynamic(
    () => import("@/components/AnalysisMap"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[450px] items-center justify-center rounded-xl bg-slate-200">
                Memuat peta RINTIK...
            </div>
        ),
    }
);

type HasilAnalisis = {
    parameter: {
        latitude: number;
        longitude: number;
        radius_meter: number;
        kategori: string;
    };
    buffer: unknown;
    umkm_sejenis: {
        jumlah: number;
        daftar: unknown[];
    };
    fasilitas_dalam_radius: {
        sekolah: number | null;
        poi: number | null;
    };
    fasilitas_terdekat: {
        sekolah_terdekat: string | null;
        jarak_sekolah_meter: number | null;
        jalan_terdekat: string | null;
        jarak_jalan_meter: number | null;
    } | null;
};

export default function AnalysisTestPage() {
    const [latitude, setLatitude] = useState("-6.595");
    const [longitude, setLongitude] = useState("106.8167");
    const [radius, setRadius] = useState("500");
    const [kategori, setKategori] = useState("Kuliner");

    const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function jalankanAnalisis() {
        setLoading(true);
        setError("");
        setHasil(null);

        try {
            const response = await fetch("/api/analysis/location", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radius: Number(radius),
                    kategori,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Analisis gagal");
            }

            setHasil(result.data as HasilAnalisis);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Terjadi kesalahan"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="rounded-xl bg-emerald-800 p-6 text-white">
                    <h1 className="text-2xl font-bold">
                        RINTIK - Frontend Testing
                    </h1>
                    <p className="mt-2 text-sm">
                        Pengujian API Analisis Lokasi Usaha
                    </p>
                </header>

                <section className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-xl font-semibold">
                        Parameter Analisis
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                            <span className="text-sm font-medium">Latitude</span>
                            <input
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => {
                                    setLatitude(e.target.value);
                                    setHasil(null);
                                    setError("");
                                }}
                                className="w-full rounded-lg border border-slate-300 p-3"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium">Longitude</span>
                            <input
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => {
                                    setLongitude(e.target.value);
                                    setHasil(null);
                                    setError("");
                                }}
                                className="w-full rounded-lg border border-slate-300 p-3"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium">
                                Radius (meter)
                            </span>
                            <input
                                type="number"
                                value={radius}
                                onChange={(e) => {
                                    setRadius(e.target.value);
                                    setHasil(null);
                                    setError("");
                                }}
                                className="w-full rounded-lg border border-slate-300 p-3"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium">Kategori UMKM</span>
                            <select
                                value={kategori}
                                onChange={(e) => {
                                    setKategori(e.target.value);
                                    setHasil(null);
                                    setError("");
                                }}
                                className="w-full rounded-lg border border-slate-300 p-3"
                            >
                                <option>Kuliner</option>
                                <option>Jasa</option>
                                <option>Teknologi</option>
                                <option>Kerajinan</option>
                                <option>Fashion</option>
                            </select>
                        </label>
                    </div>

                    <button
                        onClick={jalankanAnalisis}
                        disabled={loading}
                        className="mt-6 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                        {loading ? "Sedang menganalisis..." : "Jalankan Analisis"}
                    </button>

                    {error && (
                        <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
                            {error}
                        </p>
                    )}
                </section>

                <section className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="mb-2 text-xl font-semibold">
                        Peta Analisis Lokasi Usaha
                    </h2>

                    <p className="mb-4 text-sm text-slate-500">
                        Klik peta untuk menentukan titik kandidat lokasi usaha.
                        Setelah memilih lokasi, klik Jalankan Analisis.
                    </p>

                    <AnalysisMap
                        latitude={
                            latitude.trim() !== "" && Number.isFinite(Number(latitude))
                                ? Number(latitude)
                                : -6.595
                        }
                        longitude={
                            longitude.trim() !== "" && Number.isFinite(Number(longitude))
                                ? Number(longitude)
                                : 106.8167
                        }
                        buffer={hasil?.buffer ?? null}
                        umkm={
                            (hasil?.umkm_sejenis.daftar ?? []) as {
                                id_umkm?: string | number;
                                nama_umkm?: string;
                                kategori?: string;
                                latitude: number;
                                longitude: number;
                            }[]
                        }
                        onSelectLocation={(lat, lng) => {
                            setLatitude(String(lat));
                            setLongitude(String(lng));
                            setHasil(null);
                            setError("");
                        }}
                    />

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <span>🔴 Titik kandidat usaha</span>
                        <span>🟢 Buffer radius analisis</span>
                        <span>🔵 UMKM sejenis</span>
                    </div>
                </section>


                {hasil && (
                    <>
                        <section className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    UMKM Sejenis
                                </p>
                                <p className="mt-2 text-3xl font-bold text-emerald-700">
                                    {hasil.umkm_sejenis.jumlah}
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    Sekolah dalam Radius
                                </p>
                                <p className="mt-2 text-3xl font-bold">
                                    {hasil.fasilitas_dalam_radius.sekolah ?? 0}
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    POI dalam Radius
                                </p>
                                <p className="mt-2 text-3xl font-bold">
                                    {hasil.fasilitas_dalam_radius.poi ?? 0}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold">
                                Fasilitas Terdekat
                            </h2>

                            <div className="space-y-3">
                                <p>
                                    <strong>Sekolah:</strong>{" "}
                                    {hasil.fasilitas_terdekat?.sekolah_terdekat ?? "-"}
                                </p>

                                <p>
                                    <strong>Jarak Sekolah:</strong>{" "}
                                    {hasil.fasilitas_terdekat?.jarak_sekolah_meter ?? "-"} meter
                                </p>

                                <p>
                                    <strong>Jalan:</strong>{" "}
                                    {hasil.fasilitas_terdekat?.jalan_terdekat ?? "-"}
                                </p>

                                <p>
                                    <strong>Jarak Jalan:</strong>{" "}
                                    {hasil.fasilitas_terdekat?.jarak_jalan_meter ?? "-"} meter
                                </p>
                            </div>
                        </section>

                        <section className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold">
                                Respons API (JSON)
                            </h2>

                            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-300">
                                {JSON.stringify(hasil, null, 2)}
                            </pre>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
