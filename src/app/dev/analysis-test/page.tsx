"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback } from "react";
import type { GeoJsonObject } from "geojson";
import type { UmkmFeature, RouteInfo } from "@/components/ExplorationMap";

// Dynamic import map Leaflet agar aman dari SSR Next.js
const AnalysisMap = dynamic(() => import("@/components/AnalysisMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[450px] items-center justify-center rounded-xl bg-slate-200">
            Memuat peta analisis RINTIK...
        </div>
    ),
});

const ExplorationMap = dynamic(() => import("@/components/ExplorationMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[520px] items-center justify-center rounded-xl bg-slate-200">
            Memuat peta persebaran UMKM...
        </div>
    ),
});

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

type StatisticsData = {
    total_umkm: number;
    per_kategori: Array<{ kategori: string; jumlah: number }>;
    per_kecamatan: Array<{ kecamatan: string; jumlah: number }>;
};

export default function AnalysisTestPage() {
    // Mode Tab Navigasi: 'pengunjung' (Eksplorasi) atau 'pelaku' (Analisis Calon Lokasi)
    const [activeTab, setActiveTab] = useState<"pengunjung" | "pelaku">("pengunjung");

    // ==========================================
    // STATE UNTUK TAB PENGUNJUNG (EKSPLORASI & RUTE)
    // ==========================================
    const [filterKategori, setFilterKategori] = useState("Semua");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [umkmMapData, setUmkmMapData] = useState<UmkmFeature[]>([]);
    const [loadingMap, setLoadingMap] = useState(false);

    // Layer Wilayah
    const [showWilayah, setShowWilayah] = useState(true);
    const [wilayahData, setWilayahData] = useState<GeoJsonObject | null>(null);

    // Rute Navigasi
    const [startPoint, setStartPoint] = useState<[number, number]>([-6.600, 106.800]); // Titik awal pengunjung
    const [routeData, setRouteData] = useState<RouteInfo | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [routeError, setRouteError] = useState("");

    // Statistik Persebaran
    const [statistics, setStatistics] = useState<StatisticsData | null>(null);

    // ==========================================
    // STATE UNTUK TAB PELAKU UMKM (ANALISIS LOKASI)
    // ==========================================
    const [latitude, setLatitude] = useState("-6.595");
    const [longitude, setLongitude] = useState("106.8167");
    const [radius, setRadius] = useState("500");
    const [kategori, setKategori] = useState("Kuliner");

    const [hasil, setHasil] = useState<HasilAnalisis | null>(null);
    const [loadingAnalisis, setLoadingAnalisis] = useState(false);
    const [analisisError, setAnalisisError] = useState("");

    // Fetch data marker peta UMKM
    const fetchUmkmMap = useCallback(async () => {
        setLoadingMap(true);
        try {
            // Bounding box mencakup seluruh Kota Bogor
            let url = `/api/umkm/map?min_lng=106.70&min_lat=-6.68&max_lng=106.88&max_lat=-6.50`;
            if (filterKategori !== "Semua") {
                url += `&kategori=${encodeURIComponent(filterKategori)}`;
            }
            if (searchKeyword.trim()) {
                url += `&search=${encodeURIComponent(searchKeyword.trim())}`;
            }

            const res = await fetch(url);
            const json = await res.json();
            if (json.success && json.data?.features) {
                setUmkmMapData(json.data.features);
            }
        } catch (err) {
            console.error("Gagal memuat peta UMKM:", err);
        } finally {
            setLoadingMap(false);
        }
    }, [filterKategori, searchKeyword]);

    // Fetch layer batas kelurahan
    const fetchWilayah = useCallback(async () => {
        try {
            const res = await fetch("/api/layers/wilayah");
            const json = await res.json();
            if (json.success && json.data) {
                setWilayahData(json.data as GeoJsonObject);
            }
        } catch (err) {
            console.error("Gagal memuat layer wilayah:", err);
        }
    }, []);

    // Fetch data statistik persebaran
    const fetchStatistics = useCallback(async () => {
        try {
            const res = await fetch("/api/umkm/statistics");
            const json = await res.json();
            if (json.success && json.data) {
                setStatistics(json.data as StatisticsData);
            }
        } catch (err) {
            console.error("Gagal memuat statistik:", err);
        }
    }, []);

    useEffect(() => {
        fetchUmkmMap();
    }, [fetchUmkmMap]);

    useEffect(() => {
        fetchWilayah();
        fetchStatistics();
    }, [fetchWilayah, fetchStatistics]);

    // Eksekusi API Rute Navigasi
    async function buatRuteKeUmkm(idUmkm: string, namaUmkm: string) {
        setLoadingRoute(true);
        setRouteError("");
        setRouteData(null);

        try {
            const res = await fetch(
                `/api/routing?latitude=${startPoint[0]}&longitude=${startPoint[1]}&id_umkm=${idUmkm}`
            );
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.message || "Gagal menghitung rute");
            }

            setRouteData({
                ...json.data,
                tujuan: { id_umkm: idUmkm, nama_umkm: namaUmkm },
            });
        } catch (err) {
            setRouteError(err instanceof Error ? err.message : "Gagal memproses rute");
        } finally {
            setLoadingRoute(false);
        }
    }

    // Eksekusi API Analisis Calon Lokasi Usaha
    async function jalankanAnalisis() {
        setLoadingAnalisis(true);
        setAnalisisError("");
        setHasil(null);

        try {
            const response = await fetch("/api/analysis/location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            setAnalisisError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoadingAnalisis(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header Produk RINTIK */}
                <header className="rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 text-white shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <span className="inline-block rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-emerald-200">
                                Backend Testing & Visualizer
                            </span>
                            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
                                RINTIK — Ruang Informasi Titik Industri Kreatif
                            </h1>
                            <p className="mt-1 text-sm text-emerald-100">
                                Verifikasi Visual Seluruh Endpoint Backend WebGIS UMKM Kota Bogor
                            </p>
                        </div>
                        {statistics && (
                            <div className="flex gap-3 text-center">
                                <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur">
                                    <p className="text-xs text-emerald-200">Total UMKM</p>
                                    <p className="text-xl font-bold">{statistics.total_umkm}</p>
                                </div>
                                <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur">
                                    <p className="text-xs text-emerald-200">Kelurahan</p>
                                    <p className="text-xl font-bold">68</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tab Switcher untuk Kedua Peran */}
                    <div className="mt-6 flex border-b border-emerald-700/50">
                        <button
                            type="button"
                            onClick={() => setActiveTab("pengunjung")}
                            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold transition border-b-2 ${
                                activeTab === "pengunjung"
                                    ? "border-emerald-400 text-emerald-300"
                                    : "border-transparent text-emerald-100/70 hover:text-white"
                            }`}
                        >
                            🧭 1. Eksplorasi UMKM & Rute (Pengunjung)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pelaku")}
                            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold transition border-b-2 ${
                                activeTab === "pelaku"
                                    ? "border-emerald-400 text-emerald-300"
                                    : "border-transparent text-emerald-100/70 hover:text-white"
                            }`}
                        >
                            📍 2. Analisis Lokasi Usaha (Pelaku UMKM)
                        </button>
                    </div>
                </header>

                {/* ========================================================= */}
                {/* TAB 1: EKSPLORASI & RUTE (ROLE PENGUNJUNG KOTA BOGOR)     */}
                {/* ========================================================= */}
                {activeTab === "pengunjung" && (
                    <div className="space-y-6">
                        {/* Filter Bar */}
                        <section className="rounded-xl bg-white p-5 shadow-sm space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">
                                        Pencarian & Filter Persebaran UMKM
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Memanggil <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">/api/umkm/map</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">/api/routing</code>
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showWilayah}
                                            onChange={(e) => setShowWilayah(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        Layer Batas Kelurahan
                                    </label>
                                    <span className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-full text-slate-700">
                                        {loadingMap ? "Memuat data..." : `${umkmMapData.length} UMKM tampil`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                {["Semua", "Kuliner", "Jasa", "Fashion", "Kerajinan", "Teknologi"].map((kat) => (
                                    <button
                                        key={kat}
                                        type="button"
                                        onClick={() => setFilterKategori(kat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            filterKategori === kat
                                                ? "bg-emerald-700 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {kat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Cari nama UMKM atau kata kunci..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-emerald-600"
                                />
                                {searchKeyword && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchKeyword("")}
                                        className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </section>

                        {/* Peta Eksplorasi & Navigasi Rute */}
                        <section className="rounded-xl bg-white p-5 shadow-sm space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between text-sm gap-2">
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        Peta Interaktif Kota Bogor
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        • Titik Biru = Lokasi Anda (klik di peta untuk memindahkan).
                                        • Klik pada marker UMKM lalu pilih &quot;🚗 Pandu Rute ke Sini&quot;.
                                    </p>
                                </div>

                                {/* Legenda Warna Kategori */}
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-600 inline-block"></span> Kuliner</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-fuchsia-600 inline-block"></span> Jasa</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-800 inline-block"></span> Fashion</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span> Kerajinan</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> Teknologi</span>
                                </div>
                            </div>

                            <ExplorationMap
                                umkmList={umkmMapData}
                                startPoint={startPoint}
                                onSelectStartPoint={(lat, lng) => setStartPoint([lat, lng])}
                                onSelectRouteDestination={buatRuteKeUmkm}
                                routeData={routeData}
                                showWilayah={showWilayah}
                                wilayahGeoJson={wilayahData}
                            />

                            {/* Panel Informasi Rute Aktif */}
                            {loadingRoute && (
                                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 animate-pulse">
                                    🚗 Sedang menghitung rute tercepat via OSRM...
                                </div>
                            )}

                            {routeError && (
                                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                                    ❌ {routeError}
                                </div>
                            )}

                            {routeData && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded">
                                            Rute Navigasi Ditemukan
                                        </span>
                                        <h3 className="font-bold text-slate-900 text-base">
                                            Menuju {routeData.tujuan.nama_umkm}
                                        </h3>
                                        <p className="text-xs text-slate-600">
                                            Dari koordinat ({routeData.titik_awal.latitude}, {routeData.titik_awal.longitude})
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500">Jarak Tempuh</p>
                                            <p className="text-xl font-extrabold text-emerald-800">
                                                {(routeData.jarak_meter / 1000).toFixed(2)} km
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-xs text-slate-500">Estimasi Waktu</p>
                                            <p className="text-xl font-extrabold text-emerald-800">
                                                {Math.ceil(routeData.durasi_detik / 60)} menit
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setRouteData(null)}
                                            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                                        >
                                            Hapus Rute
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Statistik Ringkas */}
                        {statistics && (
                            <section className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
                                    <h3 className="text-sm font-bold uppercase text-slate-600">
                                        Sebaran UMKM per Kategori
                                    </h3>
                                    <div className="space-y-2">
                                        {statistics.per_kategori.map((k) => (
                                            <div key={k.kategori} className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-slate-700">{k.kategori}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{k.jumlah}</span>
                                                    <span className="text-xs text-slate-400">
                                                        ({((k.jumlah / statistics.total_umkm) * 100).toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
                                    <h3 className="text-sm font-bold uppercase text-slate-600">
                                        Sebaran UMKM per Kecamatan
                                    </h3>
                                    <div className="space-y-2">
                                        {statistics.per_kecamatan.map((kec) => (
                                            <div key={kec.kecamatan} className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-slate-700">{kec.kecamatan}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{kec.jumlah}</span>
                                                    <span className="text-xs text-slate-400">
                                                        ({((kec.jumlah / statistics.total_umkm) * 100).toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: ANALISIS LOKASI USAHA (ROLE PELAKU UMKM)           */}
                {/* ========================================================= */}
                {activeTab === "pelaku" && (
                    <div className="space-y-6">
                        <section className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-2 text-xl font-semibold">
                                Parameter Analisis Lokasi Usaha
                            </h2>
                            <p className="mb-5 text-xs text-slate-500">
                                Memanggil <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">/api/analysis/location</code> (PostGIS Buffer + Spatial Query + Proximity)
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-sm font-medium">Latitude Titik Calon</span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => {
                                            setLatitude(e.target.value);
                                            setHasil(null);
                                            setAnalisisError("");
                                        }}
                                        className="w-full rounded-lg border border-slate-300 p-3"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium">Longitude Titik Calon</span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => {
                                            setLongitude(e.target.value);
                                            setHasil(null);
                                            setAnalisisError("");
                                        }}
                                        className="w-full rounded-lg border border-slate-300 p-3"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium">Radius Analisis (meter)</span>
                                    <input
                                        type="number"
                                        value={radius}
                                        onChange={(e) => {
                                            setRadius(e.target.value);
                                            setHasil(null);
                                            setAnalisisError("");
                                        }}
                                        className="w-full rounded-lg border border-slate-300 p-3"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="text-sm font-medium">Kategori Rencana Usaha</span>
                                    <select
                                        value={kategori}
                                        onChange={(e) => {
                                            setKategori(e.target.value);
                                            setHasil(null);
                                            setAnalisisError("");
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
                                disabled={loadingAnalisis}
                                className="mt-6 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition"
                            >
                                {loadingAnalisis ? "Sedang Menganalisis Spasial..." : "Jalankan Analisis Lokasi"}
                            </button>

                            {analisisError && (
                                <p className="mt-4 rounded-lg bg-red-100 p-3 text-red-700 text-sm">
                                    ❌ {analisisError}
                                </p>
                            )}
                        </section>

                        <section className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-2 text-xl font-semibold">
                                Peta Analisis Lokasi Usaha
                            </h2>
                            <p className="mb-4 text-sm text-slate-500">
                                Klik peta untuk menentukan titik calon lokasi usaha. Lalu klik tombol &quot;Jalankan Analisis Lokasi&quot;.
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
                                    setAnalisisError("");
                                }}
                            />

                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                <span>🔴 Titik calon lokasi usaha</span>
                                <span>🟢 Buffer radius analisis</span>
                                <span>🔵 UMKM sejenis di dalam radius</span>
                            </div>
                        </section>

                        {hasil && (
                            <>
                                <section className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-xl bg-white p-5 shadow-sm border-l-4 border-emerald-600">
                                        <p className="text-xs uppercase font-bold text-slate-500">
                                            UMKM Sejenis ({kategori})
                                        </p>
                                        <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                                            {hasil.umkm_sejenis.jumlah}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">di dalam radius {radius}m</p>
                                    </div>

                                    <div className="rounded-xl bg-white p-5 shadow-sm border-l-4 border-blue-600">
                                        <p className="text-xs uppercase font-bold text-slate-500">
                                            Sekolah dalam Radius
                                        </p>
                                        <p className="mt-2 text-3xl font-extrabold text-blue-700">
                                            {hasil.fasilitas_dalam_radius.sekolah ?? 0}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">sekolah pendukung</p>
                                    </div>

                                    <div className="rounded-xl bg-white p-5 shadow-sm border-l-4 border-amber-600">
                                        <p className="text-xs uppercase font-bold text-slate-500">
                                            POI dalam Radius
                                        </p>
                                        <p className="mt-2 text-3xl font-extrabold text-amber-700">
                                            {hasil.fasilitas_dalam_radius.poi ?? 0}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">fasilitas umum</p>
                                    </div>
                                </section>

                                <section className="rounded-xl bg-white p-6 shadow-sm">
                                    <h2 className="mb-4 text-xl font-semibold">
                                        Proximity Fasilitas Terdekat
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                                            <p className="text-xs font-bold uppercase text-slate-500">Sekolah Terdekat</p>
                                            <p className="text-base font-bold text-slate-900 mt-1">
                                                {hasil.fasilitas_terdekat?.sekolah_terdekat ?? "-"}
                                            </p>
                                            <p className="text-sm font-semibold text-emerald-700 mt-1">
                                                Jarak: {hasil.fasilitas_terdekat?.jarak_sekolah_meter != null ? `${hasil.fasilitas_terdekat.jarak_sekolah_meter} meter` : "-"}
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                                            <p className="text-xs font-bold uppercase text-slate-500">Jalan Terdekat</p>
                                            <p className="text-base font-bold text-slate-900 mt-1">
                                                {hasil.fasilitas_terdekat?.jalan_terdekat ?? "-"}
                                            </p>
                                            <p className="text-sm font-semibold text-emerald-700 mt-1">
                                                Jarak: {hasil.fasilitas_terdekat?.jarak_jalan_meter != null ? `${hasil.fasilitas_terdekat.jarak_jalan_meter} meter` : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-xl bg-white p-6 shadow-sm">
                                    <h2 className="mb-4 text-xl font-semibold">
                                        Respons Raw API (JSON)
                                    </h2>
                                    <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-300">
                                        {JSON.stringify(hasil, null, 2)}
                                    </pre>
                                </section>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
