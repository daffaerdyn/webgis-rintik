"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback } from "react";
import type { GeoJsonObject } from "geojson";
import type { UmkmFeature, RouteInfo } from "@/components/ExplorationMap";
import { KATEGORI_WARNA, KECAMATAN_KELURAHAN_BOGOR, DAFTAR_KECAMATAN } from "@/lib/constants";

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
        terdekat?: Array<{
            id_umkm: string | number;
            nama_umkm: string;
            kategori: string;
            latitude: number;
            longitude: number;
            jarak_meter: number;
        }>;
        daftar: Array<{
            id_umkm?: string | number;
            nama_umkm?: string;
            kategori?: string;
            latitude: number;
            longitude: number;
            jarak_meter?: number | null;
        }>;
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

type UmkmDetail = {
    id_umkm: string;
    nama_umkm: string;
    kategori: string;
    deskripsi_produk: string | null;
    alamat: string | null;
    kecamatan: string | null;
    kelurahan: string | null;
    latitude: number;
    longitude: number;
    range_harga: string | null;
    rating: number | null;
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

    // Filter Wilayah & Radius
    const [filterKecamatan, setFilterKecamatan] = useState("");
    const [filterKelurahan, setFilterKelurahan] = useState("");
    const [filterRadius, setFilterRadius] = useState<number | null>(null);
    const [showMarkers, setShowMarkers] = useState(true);
    const [statistikFilter, setStatistikFilter] = useState<StatisticsData | null>(null);

    // Sorting & Filter Rating / Harga
    const [sortBy, setSortBy] = useState<"default" | "rating_jarak" | "rating" | "jarak" | "harga_termurah" | "harga_termahal">("rating_jarak");
    const [filterMinRating, setFilterMinRating] = useState<number | null>(null);
    const [filterHarga, setFilterHarga] = useState<"" | "murah" | "menengah" | "premium">("");
    const [umkmListSorted, setUmkmListSorted] = useState<Array<UmkmDetail & { jarak_meter?: number | null }>>([]);
    const [loadingSortedList, setLoadingSortedList] = useState(false);
    const [listPage, setListPage] = useState(1);
    const [totalFilteredData, setTotalFilteredData] = useState(0);

    // Rute Navigasi
    const [startPoint, setStartPoint] = useState<[number, number]>([-6.600, 106.800]); // Titik awal pengunjung
    const [routeData, setRouteData] = useState<RouteInfo | null>(null);
    const [routeMode, setRouteMode] = useState<"motor" | "mobil" | "jalan_kaki">("motor");
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [routeError, setRouteError] = useState("");

    // Detail UMKM terpilih
    const [selectedUmkm, setSelectedUmkm] = useState<UmkmDetail | null>(null);
    const [selectedUmkmId, setSelectedUmkmId] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

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
            if (filterKecamatan) {
                url += `&kecamatan=${encodeURIComponent(filterKecamatan)}`;
            }
            if (filterKelurahan) {
                url += `&kelurahan=${encodeURIComponent(filterKelurahan)}`;
            }
            if (filterRadius !== null) {
                url += `&latitude=${startPoint[0]}&longitude=${startPoint[1]}&radius=${filterRadius}`;
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
    }, [filterKategori, searchKeyword, filterKecamatan, filterKelurahan, filterRadius, startPoint]);

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

    // Fetch statistik berdasarkan filter kecamatan/kelurahan aktif
    const fetchStatistikFilter = useCallback(async () => {
        if (!filterKecamatan && !filterKelurahan) {
            setStatistikFilter(null);
            return;
        }
        const params: string[] = [];
        if (filterKecamatan) params.push(`kecamatan=${encodeURIComponent(filterKecamatan)}`);
        if (filterKelurahan) params.push(`kelurahan=${encodeURIComponent(filterKelurahan)}`);
        const url = "/api/umkm/statistics?" + params.join("&");
        try {
            const res = await fetch(url);
            const json = await res.json();
            if (json.success && json.data) setStatistikFilter(json.data as StatisticsData);
        } catch (err) {
            console.error("Gagal memuat statistik filter:", err);
        }
    }, [filterKecamatan, filterKelurahan]);

    useEffect(() => {
        fetchUmkmMap();
    }, [fetchUmkmMap]);

    useEffect(() => {
        fetchWilayah();
        fetchStatistics();
    }, [fetchWilayah, fetchStatistics]);

    useEffect(() => { fetchStatistikFilter(); }, [fetchStatistikFilter]);

    // Fetch daftar rekomendasi UMKM dengan filter rating, harga, dan sorting
    const fetchSortedUmkm = useCallback(async () => {
        setLoadingSortedList(true);
        try {
            const params: string[] = [`page=${listPage}`];
            if (filterKategori !== "Semua") {
                params.push(`kategori=${encodeURIComponent(filterKategori)}`);
            }
            if (searchKeyword.trim()) {
                params.push(`search=${encodeURIComponent(searchKeyword.trim())}`);
            }
            if (filterKecamatan) {
                params.push(`kecamatan=${encodeURIComponent(filterKecamatan)}`);
            }
            if (filterKelurahan) {
                params.push(`kelurahan=${encodeURIComponent(filterKelurahan)}`);
            }
            if (filterRadius !== null) {
                params.push(`latitude=${startPoint[0]}&longitude=${startPoint[1]}&radius=${filterRadius}`);
            } else {
                params.push(`user_lat=${startPoint[0]}&user_lng=${startPoint[1]}`);
            }
            if (sortBy !== "default") {
                params.push(`sort=${sortBy}`);
            }
            if (filterMinRating !== null) {
                params.push(`min_rating=${filterMinRating}`);
            }
            if (filterHarga) {
                params.push(`rentang_harga=${filterHarga}`);
            }

            const res = await fetch(`/api/umkm?${params.join("&")}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setUmkmListSorted(json.data);
                setTotalFilteredData(json.pagination?.total_data ?? json.data.length);
            }
        } catch (err) {
            console.error("Gagal memuat list rekomendasi UMKM:", err);
        } finally {
            setLoadingSortedList(false);
        }
    }, [filterKategori, searchKeyword, filterKecamatan, filterKelurahan, filterRadius, startPoint, sortBy, filterMinRating, filterHarga, listPage]);

    useEffect(() => {
        fetchSortedUmkm();
    }, [fetchSortedUmkm]);

    // Reset pagination saat filter berubah
    useEffect(() => {
        setListPage(1);
    }, [filterKategori, searchKeyword, filterKecamatan, filterKelurahan, filterRadius, sortBy, filterMinRating, filterHarga]);

    // Fetch detail lengkap UMKM berdasarkan ID
    async function fetchUmkmDetail(idUmkm: string) {
        setLoadingDetail(true);
        setSelectedUmkmId(idUmkm);
        setSelectedUmkm(null);
        try {
            const res = await fetch(`/api/umkm/${idUmkm}`);
            const json = await res.json();
            if (json.success) setSelectedUmkm(json.data as UmkmDetail);
        } catch (err) {
            console.error("Gagal memuat detail UMKM:", err);
        } finally {
            setLoadingDetail(false);
        }
    }

    // Eksekusi API Rute Navigasi
    async function buatRuteKeUmkm(
        idUmkm: string,
        namaUmkm: string,
        modeOverride?: "motor" | "mobil" | "jalan_kaki"
    ) {
        const activeMode = modeOverride || routeMode;
        if (modeOverride) setRouteMode(modeOverride);

        setLoadingRoute(true);
        setRouteError("");
        setRouteData(null);

        try {
            const res = await fetch(
                `/api/routing?latitude=${startPoint[0]}&longitude=${startPoint[1]}&id_umkm=${idUmkm}&mode=${activeMode}`
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

                            {/* Row 3: Filter Wilayah + Radius + Toggle Marker */}
                            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100 items-center">
                                {/* Dropdown Kecamatan */}
                                <select
                                    value={filterKecamatan}
                                    onChange={(e) => { setFilterKecamatan(e.target.value); setFilterKelurahan(""); }}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-emerald-600"
                                >
                                    <option value="">Semua Kecamatan</option>
                                    {DAFTAR_KECAMATAN.map((kec) => (
                                        <option key={kec} value={kec}>{kec}</option>
                                    ))}
                                </select>

                                {/* Dropdown Kelurahan (dependent pada kecamatan) */}
                                <select
                                    value={filterKelurahan}
                                    onChange={(e) => setFilterKelurahan(e.target.value)}
                                    disabled={!filterKecamatan}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">Semua Kelurahan</option>
                                    {filterKecamatan && KECAMATAN_KELURAHAN_BOGOR[filterKecamatan]?.map((kel) => (
                                        <option key={kel} value={kel}>{kel}</option>
                                    ))}
                                </select>

                                {/* Filter Radius dari Titik Awal */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-600">Radius:</span>
                                    {[null, 250, 500, 1000, 2000, 3000, 5000].map((r) => (
                                        <button
                                            key={String(r)}
                                            type="button"
                                            onClick={() => setFilterRadius(r)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                                filterRadius === r
                                                    ? "bg-cyan-700 text-white shadow-sm"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {r === null ? "Semua" : r >= 1000 ? `${r / 1000}Km` : `${r}m`}
                                        </button>
                                    ))}
                                </div>

                                {/* Toggle sembunyikan semua marker UMKM */}
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer ml-auto">
                                    <input
                                        type="checkbox"
                                        checked={showMarkers}
                                        onChange={(e) => setShowMarkers(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    Tampilkan Marker UMKM
                                </label>
                            </div>

                            {/* Row 4: Sorting & Filter Rating / Harga */}
                            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        ⚡ Urutkan:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy("rating_jarak")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                            sortBy === "rating_jarak"
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        🌟 Rekomendasi (Rating + Jarak)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy("rating")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                            sortBy === "rating"
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        ⭐ Rating Tertinggi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy("jarak")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                            sortBy === "jarak"
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        📍 Jarak Terdekat
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy("harga_termurah")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                            sortBy === "harga_termurah"
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        🏷️ Harga Termurah
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy("harga_termahal")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                            sortBy === "harga_termahal"
                                                ? "bg-amber-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        💎 Harga Premium
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                    {/* Filter Min Rating */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-slate-600">Min. Rating:</span>
                                        {[
                                            { label: "Semua", val: null },
                                            { label: "⭐ 4.5+", val: 4.5 },
                                            { label: "⭐ 4.7+", val: 4.7 },
                                            { label: "⭐ 4.8+", val: 4.8 },
                                        ].map((r) => (
                                            <button
                                                key={String(r.val)}
                                                type="button"
                                                onClick={() => setFilterMinRating(r.val)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                                    filterMinRating === r.val
                                                        ? "bg-amber-500 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Filter Rentang Harga */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-slate-600">Rentang Harga:</span>
                                        {[
                                            { label: "Semua", val: "" },
                                            { label: "🟢 < 25rb (Murah)", val: "murah" },
                                            { label: "🟡 25rb - 50rb", val: "menengah" },
                                            { label: "🔴 > 50rb (Premium)", val: "premium" },
                                        ].map((h) => (
                                            <button
                                                key={h.val}
                                                type="button"
                                                onClick={() => setFilterHarga(h.val as "" | "murah" | "menengah" | "premium")}
                                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                                                    filterHarga === h.val
                                                        ? "bg-emerald-700 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                }`}
                                            >
                                                {h.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Panel Statistik Filter (muncul jika kecamatan/kelurahan dipilih) */}
                            {statistikFilter && (filterKecamatan || filterKelurahan) && (
                                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-cyan-900">
                                            📊 Statistik Persebaran — {filterKelurahan || filterKecamatan}
                                        </h3>
                                        <span className="text-lg font-black text-cyan-700">{statistikFilter.total_umkm} UMKM</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Per Kategori</p>
                                            <div className="space-y-1">
                                                {statistikFilter.per_kategori.map((k) => (
                                                    <div key={k.kategori} className="flex justify-between items-center text-xs">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: KATEGORI_WARNA[k.kategori]?.fill || "#64748b" }}></span>
                                                            {k.kategori}
                                                        </span>
                                                        <span className="font-bold">{k.jumlah}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Per Kecamatan</p>
                                            <div className="space-y-1">
                                                {statistikFilter.per_kecamatan.map((kec) => (
                                                    <div key={kec.kecamatan} className="flex justify-between items-center text-xs">
                                                        <span>{kec.kecamatan}</span>
                                                        <span className="font-bold">{kec.jumlah}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                onSelectUmkm={fetchUmkmDetail}
                                selectedUmkmId={selectedUmkmId}
                                routeData={routeData}
                                showWilayah={showWilayah}
                                wilayahGeoJson={wilayahData}
                                showMarkers={showMarkers}
                                radiusFilter={filterRadius}
                            />

                            {/* Panel Detail UMKM Terpilih */}
                            {loadingDetail && (
                                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 animate-pulse">
                                    🔍 Memuat informasi detail UMKM...
                                </div>
                            )}
                            {selectedUmkm && !loadingDetail && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <span
                                                className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white rounded-full"
                                                style={{ backgroundColor: KATEGORI_WARNA[selectedUmkm.kategori]?.fill || "#64748b" }}
                                            >
                                                {selectedUmkm.kategori}
                                            </span>
                                            <h3 className="font-bold text-lg text-slate-900">{selectedUmkm.nama_umkm}</h3>
                                            <p className="text-xs text-slate-400 font-mono">{selectedUmkm.id_umkm}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedUmkm(null); setSelectedUmkmId(null); }}
                                            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                                        >✕</button>
                                    </div>
                                    <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Deskripsi</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.deskripsi_produk || "Data tidak tersedia"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Alamat</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.alamat || "Data tidak tersedia"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Kecamatan</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.kecamatan || "-"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Kelurahan</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.kelurahan || "-"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Range Harga</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.range_harga || "Data tidak tersedia"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Rating</dt><dd className="text-slate-700 mt-0.5">{selectedUmkm.rating != null ? `${selectedUmkm.rating} / 5` : "Data tidak tersedia"}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase text-slate-500">Koordinat</dt><dd className="text-slate-700 mt-0.5 font-mono text-xs">{selectedUmkm.latitude}, {selectedUmkm.longitude}</dd></div>
                                    </dl>
                                    <button
                                        type="button"
                                        onClick={() => buatRuteKeUmkm(selectedUmkm.id_umkm, selectedUmkm.nama_umkm)}
                                        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                                    >
                                        🚗 Pandu Rute ke UMKM Ini
                                    </button>
                                </div>
                            )}

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
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded">
                                                Rute ke {routeData.tujuan.nama_umkm}
                                            </span>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                Titik awal: Lokasi Anda ({routeData.titik_awal.latitude}, {routeData.titik_awal.longitude})
                                            </p>
                                        </div>

                                        {/* Pilihan Moda Transportasi (Sesuai Desain Image 4) */}
                                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-emerald-200">
                                            {(
                                                [
                                                    { key: "motor", label: "🛵 Motor" },
                                                    { key: "mobil", label: "🚗 Mobil" },
                                                    { key: "jalan_kaki", label: "🚶 Jalan kaki" },
                                                ] as const
                                            ).map((item) => (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onClick={() =>
                                                        buatRuteKeUmkm(
                                                            routeData.tujuan.id_umkm,
                                                            routeData.tujuan.nama_umkm,
                                                            item.key
                                                        )
                                                    }
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                                                        routeMode === item.key
                                                            ? "bg-amber-500 text-white shadow-sm"
                                                            : "text-slate-600 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-emerald-200/60">
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-2xl font-black text-red-600">
                                                ± {(routeData.jarak_meter / 1000).toFixed(1)} km
                                            </p>
                                            <span className="text-slate-400">•</span>
                                            <p className="text-2xl font-black text-red-600">
                                                {Math.ceil(routeData.durasi_detik / 60)} mnt
                                            </p>
                                            <span className="text-xs text-slate-500 italic ml-2">
                                                (Estimasi rute OSRM)
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&origin=${routeData.titik_awal.latitude},${routeData.titik_awal.longitude}&destination=${routeData.tujuan.id_umkm}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition shadow-sm text-center"
                                            >
                                                Mulai rute
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => setRouteData(null)}
                                                className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                                            >
                                                Hapus rute
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Section: Daftar Hasil Rekomendasi UMKM Terurut */}
                        <section className="rounded-xl bg-white p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        📋 Daftar Rekomendasi UMKM
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                            {totalFilteredData} UMKM
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Urutan: <span className="font-semibold text-slate-700">
                                            {sortBy === "rating_jarak" && "🌟 Rekomendasi Terbaik (Rating & Jarak)"}
                                            {sortBy === "rating" && "⭐ Rating Tertinggi"}
                                            {sortBy === "jarak" && "📍 Jarak Terdekat dari Posisi Anda"}
                                            {sortBy === "harga_termurah" && "🏷️ Harga Paling Terjangkau"}
                                            {sortBy === "harga_termahal" && "💎 Harga Premium"}
                                            {sortBy === "default" && "Bawaan"}
                                        </span>
                                        {filterKecamatan && ` · Wilayah: ${filterKelurahan || filterKecamatan}`}
                                        {filterMinRating && ` · Min. ⭐ ${filterMinRating}`}
                                        {filterHarga && ` · Harga: ${filterHarga}`}
                                    </p>
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={listPage <= 1 || loadingSortedList}
                                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        ← Sebelumnya
                                    </button>
                                    <span className="text-xs font-medium text-slate-600">
                                        Hal. {listPage} / {Math.max(1, Math.ceil(totalFilteredData / 20))}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={listPage >= Math.ceil(totalFilteredData / 20) || loadingSortedList}
                                        onClick={() => setListPage((p) => p + 1)}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        Berikutnya →
                                    </button>
                                </div>
                            </div>

                            {loadingSortedList ? (
                                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
                                    ⏳ Memuat daftar rekomendasi UMKM...
                                </div>
                            ) : umkmListSorted.length === 0 ? (
                                <div className="py-12 text-center text-sm text-slate-500">
                                    Tidak ada UMKM yang cocok dengan kriteria filter yang dipilih. Coba sesuaikan rating, harga, atau wilayah.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {umkmListSorted.map((item) => {
                                        const catColor = KATEGORI_WARNA[item.kategori]?.fill || "#64748b";
                                        const isSelected = selectedUmkmId === item.id_umkm;

                                        return (
                                            <div
                                                key={item.id_umkm}
                                                className={`rounded-xl border p-4 transition flex flex-col justify-between gap-3 ${
                                                    isSelected
                                                        ? "border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                                }`}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                            style={{ backgroundColor: catColor }}
                                                        >
                                                            {item.kategori}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {item.id_umkm}
                                                        </span>
                                                    </div>

                                                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                                                        {item.nama_umkm}
                                                    </h4>

                                                    <p className="text-xs text-slate-500 line-clamp-1">
                                                        {item.alamat || `${item.kelurahan || "-"}, ${item.kecamatan || "-"}`}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                                        {item.rating != null && (
                                                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                                                ⭐ {item.rating}
                                                            </span>
                                                        )}
                                                        {item.range_harga && (
                                                            <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                                🏷️ {item.range_harga}
                                                            </span>
                                                        )}
                                                        {item.jarak_meter != null && (
                                                            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                                                                📍 {item.jarak_meter < 1000 ? `${item.jarak_meter} m` : `${(item.jarak_meter / 1000).toFixed(1)} km`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchUmkmDetail(item.id_umkm)}
                                                        className="w-full rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition text-center"
                                                    >
                                                        🔍 Detail
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => buatRuteKeUmkm(item.id_umkm, item.nama_umkm)}
                                                        className="w-full rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition text-center"
                                                    >
                                                        🚗 Rute
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                umkm={hasil?.umkm_sejenis.daftar ?? []}
                                kategori={kategori}
                                onSelectLocation={(lat, lng) => {
                                    setLatitude(String(lat));
                                    setLongitude(String(lng));
                                    setHasil(null);
                                    setAnalisisError("");
                                }}
                            />

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span> Titik kandidat calon</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-orange-500 bg-orange-200 inline-block"></span> Radius analisis {radius}m</span>
                                <span className="flex items-center gap-1.5">
                                    <span
                                        className="w-3 h-3 rounded-full inline-block"
                                        style={{ backgroundColor: KATEGORI_WARNA[kategori]?.fill || "#ea580c" }}
                                    ></span>
                                    UMKM Sejenis ({kategori})
                                </span>
                            </div>
                        </section>

                        {hasil && (
                            <>
                                {/* Kartu Hasil Analisis Spasial Sesuai UI Desain Mockup */}
                                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                                    {/* Stepper Indikator Sesuai Desain */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                                        <span className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                            ✓ Jenis usaha ({kategori})
                                        </span>
                                        <span className="text-slate-300">—</span>
                                        <span className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                            ✓ Titik ({hasil.parameter.latitude}, {hasil.parameter.longitude})
                                        </span>
                                        <span className="text-slate-300">—</span>
                                        <span className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                            ✓ Radius ({radius} meter)
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-extrabold text-red-600">
                                            Hasil analisis spasial
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-1 font-mono">
                                            {kategori} · {hasil.parameter.latitude} ; {hasil.parameter.longitude} · radius {radius} meter
                                        </p>
                                    </div>

                                    {/* Kartu Jumlah UMKM Sejenis */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                                        <p className="text-5xl font-black text-slate-900">
                                            {hasil.umkm_sejenis.jumlah}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-600 mt-1">
                                            UMKM Sejenis ({kategori}) dalam radius {radius} meter
                                        </p>
                                    </div>

                                    {/* Proximity Jalan & Sekolah Terdekat */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Jalan Terdekat
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">
                                                ± {hasil.fasilitas_terdekat?.jarak_jalan_meter != null ? `${hasil.fasilitas_terdekat.jarak_jalan_meter} m` : "-"}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                {hasil.fasilitas_terdekat?.jalan_terdekat || "Tidak terdeteksi"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Sekolah Terdekat
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-1">
                                                ± {hasil.fasilitas_terdekat?.jarak_sekolah_meter != null ? `${hasil.fasilitas_terdekat.jarak_sekolah_meter} m` : "-"}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                {hasil.fasilitas_terdekat?.sekolah_terdekat || "Tidak terdeteksi"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* UMKM Sejenis Terdekat (Daftar Pesaing Terdekat) */}
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            UMKM Sejenis Terdekat
                                        </h3>

                                        {hasil.umkm_sejenis.daftar.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic">
                                                Tidak ada UMKM sejenis di dalam radius {radius} meter.
                                            </p>
                                        ) : (
                                            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                                                {(hasil.umkm_sejenis.terdekat || hasil.umkm_sejenis.daftar.slice(0, 5)).map((umkmItem) => (
                                                    <div
                                                        key={String(umkmItem.id_umkm)}
                                                        className="flex items-center justify-between p-3.5 text-sm hover:bg-slate-50 transition"
                                                    >
                                                        <div className="space-y-0.5">
                                                            <p className="font-bold text-slate-900">
                                                                {umkmItem.nama_umkm}
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-mono">
                                                                {umkmItem.id_umkm}
                                                            </p>
                                                        </div>
                                                        <span className="font-bold text-red-600 text-sm whitespace-nowrap bg-red-50 px-2.5 py-1 rounded-lg">
                                                            ± {umkmItem.jarak_meter != null ? `${Math.round(Number(umkmItem.jarak_meter))} m` : "-"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Fasilitas Pendukung Lain dalam Radius */}
                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <span className="text-slate-400 block">Total Sekolah di Radius:</span>
                                            <strong className="text-slate-800 text-sm">{hasil.fasilitas_dalam_radius.sekolah ?? 0} sekolah</strong>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <span className="text-slate-400 block">Total Fasilitas Umum (POI):</span>
                                            <strong className="text-slate-800 text-sm">{hasil.fasilitas_dalam_radius.poi ?? 0} fasilitas</strong>
                                        </div>
                                    </div>

                                    {/* Disclaimer Sesuai Desain */}
                                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                                        Informasi pendukung dari data UMKM Kota Bogor, bukan penilaian kelayakan lokasi mutlak. Jarak jalan dan sekolah dihitung berbasis analisis spasial PostGIS.
                                    </p>

                                    {/* Tombol Ubah Parameter */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition shadow-sm"
                                    >
                                        Ubah parameter
                                    </button>
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
