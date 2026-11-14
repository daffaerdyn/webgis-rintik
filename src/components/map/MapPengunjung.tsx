"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Circle, Marker, Polyline } from "react-leaflet";
import type L from "leaflet";
import MapLeafletCore, { BOGOR_COORDINATES } from "./MapLeafletCore";
import MapGeoJSONLayers from "./MapGeoJSONLayers";
import MapCanvasPinLayer from "./MapCanvasPinLayer";
import {
  createUserDotPin,
} from "./MapCustomPins";
import {
  MapRoutingService,
  type RouteResult,
  type TransportMode,
} from "./MapRoutingService";
import MapPengunjungUI, {
  type UmkmItem,
  type VisitorSidebarState,
} from "./MapPengunjungUI";
import {
  TOTAL_UMKM_VALID,
} from "@/lib/constants";

const ALL_CATEGORIES = ["Kuliner", "Fashion", "Jasa", "Kerajinan", "Teknologi"];

export function MapPengunjung() {
  const mapRef = useRef<L.Map | null>(null);

  // Raw data UMKM dari API atau GeoJSON
  const [allUmkm, setAllUmkm] = useState<UmkmItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state (Multi-select kategori aktif semua secara default, radius 20 Km mencakup seluruh Kota Bogor)
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>("Semua");
  const [radiusMeters, setRadiusMeters] = useState<number>(20000);

  // Koordinat lokasi pengguna / referensi asal
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: BOGOR_COORDINATES.center[0],
    lng: BOGOR_COORDINATES.center[1],
  });

  // Toggleable Panels State (Google Maps Style)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  // Sidebar States (1: LIST, 2: DETAIL, 3: ROUTE, 4: EMPTY)
  const [sidebarState, setSidebarState] = useState<VisitorSidebarState>("LIST");
  const [selectedUmkm, setSelectedUmkm] = useState<UmkmItem | null>(null);

  // Layer Toggles
  const [showUmkm, setShowUmkm] = useState(true);
  const [showWilayah, setShowWilayah] = useState(true);
  const [showJalan, setShowJalan] = useState(false);
  const [showSekolah, setShowSekolah] = useState(true);
  const [showPermukiman, setShowPermukiman] = useState(false);

  // Rute Navigasi State
  const [routeMode, setRouteMode] = useState<TransportMode>("motor");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [isSettingOrigin, setIsSettingOrigin] = useState(false);

  // 1. Ambil Geolocation Browser jika diizinkan (default ke pusat Bogor)
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Pastikan berada di sekitar Bogor (radius kasar 20km)
          if (lat >= -6.8 && lat <= -6.4 && lng >= 106.65 && lng <= 106.95) {
            setUserCoords({ lat, lng });
          }
        },
        () => {
          // Gunakan default pusat Bogor jika ditolak
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // 2. Fetch Master Data UMKM (Utamakan GeoJSON sinkron atau API /api/umkm)
  useEffect(() => {
    let isMounted = true;
    async function loadUmkmData() {
      setIsLoading(true);

      // Coba muat GeoJSON lokal terlebih dahulu (lengkap 2.993 features)
      try {
        const res = await fetch("/data/master_umkm_final_update.geojson");
        if (res.ok) {
          const json = await res.json();
          if (json.features && Array.isArray(json.features)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items: UmkmItem[] = json.features.map((f: any, idx: number) => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [BOGOR_COORDINATES.center[1], BOGOR_COORDINATES.center[0]];
              return {
                id_umkm: String(p.id_umkm || p.id || idx + 1),
                nama_umkm: String(p.nama_umkm || p.nama || "UMKM Kreatif"),
                kategori: String(p.kategori || "Kuliner"),
                deskripsi_produk: p.deskripsi_produk || p.deskripsi || null,
                alamat: p.alamat || null,
                kecamatan: p.kecamatan || null,
                kelurahan: p.kelurahan || null,
                latitude: Number(coords[1]),
                longitude: Number(coords[0]),
                range_harga: p.range_harga || null,
                rating: Number(p.rating || 4.8),
              };
            });

            if (isMounted) {
              setAllUmkm(items);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Gagal memuat /data/master_umkm_final_update.geojson, mencoba /api/umkm:", err);
      }

      // Fallback ke endpoint backend /api/umkm
      try {
        const res = await fetch("/api/umkm?page_size=2993");
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items: UmkmItem[] = json.data.map((item: any) => ({
              id_umkm: String(item.id_umkm),
              nama_umkm: String(item.nama_umkm),
              kategori: String(item.kategori),
              deskripsi_produk: item.deskripsi_produk,
              alamat: item.alamat,
              kecamatan: item.kecamatan,
              kelurahan: item.kelurahan,
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
              range_harga: item.range_harga,
              rating: Number(item.rating || 4.8),
            }));

            if (isMounted) {
              setAllUmkm(items);
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat UMKM dari API:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUmkmData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Hitung Jarak dan Filter Data UMKM secara Komprehensif
  const { filteredUmkm, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {
      Kuliner: 0,
      Fashion: 0,
      Jasa: 0,
      Kerajinan: 0,
      Teknologi: 0,
    };

    const searchLower = searchKeyword.trim().toLowerCase();
    const isAllKec = selectedKecamatan === "Semua";
    const isAllKel = selectedKelurahan === "Semua";

    // Hitung total kategori dari seluruh master data
    allUmkm.forEach((item) => {
      if (counts[item.kategori] !== undefined) {
        counts[item.kategori]++;
      }
    });

    const filtered: UmkmItem[] = [];

    allUmkm.forEach((item) => {
      // 1. Filter Kategori (Multi-select: hanya tampilkan jika ada di selectedCategories)
      if (!selectedCategories.includes(item.kategori)) {
        return;
      }

      // 2. Filter Kecamatan
      if (!isAllKec && item.kecamatan) {
        if (!item.kecamatan.toLowerCase().includes(selectedKecamatan.toLowerCase())) {
          return;
        }
      }

      // 3. Filter Kelurahan
      if (!isAllKel && item.kelurahan) {
        if (!item.kelurahan.toLowerCase().includes(selectedKelurahan.toLowerCase())) {
          return;
        }
      }

      // 4. Filter Kata Kunci Pencarian
      if (searchLower) {
        const matchName = item.nama_umkm.toLowerCase().includes(searchLower);
        const matchDesc = item.deskripsi_produk?.toLowerCase().includes(searchLower) || false;
        const matchAddr = item.alamat?.toLowerCase().includes(searchLower) || false;
        const matchKel = item.kelurahan?.toLowerCase().includes(searchLower) || false;
        const matchKec = item.kecamatan?.toLowerCase().includes(searchLower) || false;

        if (!matchName && !matchDesc && !matchAddr && !matchKel && !matchKec) {
          return;
        }
      }

      // 5. Hitung Jarak Geodesik ke Titik Pengguna
      const distKm = MapRoutingService.calculateHaversineDistanceKm(
        userCoords.lat,
        userCoords.lng,
        item.latitude,
        item.longitude
      );
      const distMeters = Math.round(distKm * 1000);

      // 6. Filter Radius Jangkauan
      if (distMeters > radiusMeters) {
        return;
      }

      filtered.push({
        ...item,
        jarak_meter: distMeters,
      });
    });

    // Urutkan terdekat dari lokasi pengguna
    filtered.sort((a, b) => (a.jarak_meter || 0) - (b.jarak_meter || 0));

    return { filteredUmkm: filtered, categoryCounts: counts };
  }, [
    allUmkm,
    searchKeyword,
    selectedCategories,
    selectedKecamatan,
    selectedKelurahan,
    radiusMeters,
    userCoords,
  ]);

  // Status sidebar efektif: otomatis beralih ke EMPTY jika pencarian tidak menemukan hasil
  const effectiveSidebarState: VisitorSidebarState = useMemo(() => {
    if (sidebarState === "LIST" && !isLoading && filteredUmkm.length === 0 && searchKeyword.trim().length > 0) {
      return "EMPTY";
    }
    return sidebarState;
  }, [sidebarState, isLoading, filteredUmkm.length, searchKeyword]);

  // 4. Kalkulasi Rute OSRM Otomatis saat masuk ke State ROUTE atau moda berubah
  useEffect(() => {
    if (sidebarState !== "ROUTE" || !selectedUmkm) {
      return;
    }

    let isMounted = true;
    async function calculateRoute() {
      if (!selectedUmkm) return;
      setIsRoutingLoading(true);

      const res = await MapRoutingService.getMultiModalRoute({
        startLat: userCoords.lat,
        startLng: userCoords.lng,
        destLat: selectedUmkm.latitude,
        destLng: selectedUmkm.longitude,
        mode: routeMode,
        idUmkm: selectedUmkm.id_umkm,
      });

      if (isMounted) {
        setRouteResult(res);
        setIsRoutingLoading(false);

        // Sesuaikan zoom dan batas peta dengan rute
        if (mapRef.current && res.coordinates.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const L = require("leaflet");
          const bounds = L.latLngBounds(res.coordinates);
          mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      }
    }

    calculateRoute();
    return () => {
      isMounted = false;
    };
  }, [sidebarState, selectedUmkm, userCoords, routeMode]);

  // Handler Klik pada Peta
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (isSettingOrigin) {
        setUserCoords(coords);
        setIsSettingOrigin(false);
      }
    },
    [isSettingOrigin]
  );

  // Handler Pilih UMKM
  const handleSelectUmkm = useCallback((umkm: UmkmItem) => {
    setSelectedUmkm(umkm);
    setSidebarState("DETAIL");
    setIsLeftPanelOpen(true);

    if (mapRef.current) {
      mapRef.current.setView([umkm.latitude, umkm.longitude], 16, {
        animate: true,
      });
    }
  }, []);

  // Handler Recenter ke Pengguna
  const handleRecenterUser = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 14, {
        animate: true,
      });
    }
  }, [userCoords]);

  // Handler Zoom In / Zoom Out
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  // Handler Toggle Kategori (Multi-select)
  const handleToggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((c) => c !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  // Handler Reset Filter
  const handleClearFilters = useCallback(() => {
    setSearchKeyword("");
    setSelectedCategories(ALL_CATEGORIES);
    setSelectedKecamatan("Semua");
    setSelectedKelurahan("Semua");
    setRadiusMeters(20000);
    setSidebarState("LIST");
  }, []);

  // Markers yang dirender pada canvas peta (seluruh titik UMKM tanpa dipotong slice)
  const renderedMarkers = useMemo(() => {
    if (!showUmkm) return [];
    return filteredUmkm;
  }, [filteredUmkm, showUmkm]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[var(--color-bg)]">
      {/* MAP LEAFLET CANVAS */}
      <MapLeafletCore
        center={BOGOR_COORDINATES.center}
        zoom={BOGOR_COORDINATES.defaultZoom}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
        onMapClick={handleMapClick}
      >
        {/* Layer GeoJSON Pendukung (Sekolah & Kampus masuk di dalam buffer saja) */}
        <MapGeoJSONLayers
          showWilayah={showWilayah}
          showJalan={showJalan}
          showSekolah={showSekolah}
          showPermukiman={showPermukiman}
          selectedKecamatan={selectedKecamatan}
          selectedKelurahan={selectedKelurahan}
          fitOnSelect={true}
          bufferCenter={userCoords}
          bufferRadiusMeters={radiusMeters}
          onlyShowSekolahInBuffer={true}
        />

        {/* Lingkaran Buffer Jangkauan Pengunjung */}
        {radiusMeters > 0 && (
          <Circle
            center={[userCoords.lat, userCoords.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: "#2563EB",
              weight: 2,
              dashArray: "6, 6",
              fillColor: "#2563EB",
              fillOpacity: radiusMeters >= 20000 ? 0.03 : 0.1,
            }}
          />
        )}

        {/* Marker Titik Pengguna (Titik Biru dengan Pulse Halo) */}
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={createUserDotPin()}
        />

        {/* Marker Titik UMKM (Retina Canvas Sprite Layer + 1 Active DOM Marker) */}
        <MapCanvasPinLayer
          pins={renderedMarkers}
          variant="category"
          selectedId={selectedUmkm?.id_umkm}
          interactive={!isSettingOrigin}
          onSelectPin={handleSelectUmkm}
        />

        {/* Polyline Rute Navigasi (Merah Sekunder #C62828) */}
        {sidebarState === "ROUTE" && routeResult && routeResult.coordinates.length > 0 && (
          <Polyline
            positions={routeResult.coordinates}
            pathOptions={{
              color: "#C62828",
              weight: 5,
              opacity: 0.9,
              dashArray: routeResult.isFallback ? "6, 6" : undefined,
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        )}
      </MapLeafletCore>

      {/* FLOATING UI CONTROLS & PANELS */}
      <MapPengunjungUI
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={setSelectedKecamatan}
        selectedKelurahan={selectedKelurahan}
        onSelectKelurahan={setSelectedKelurahan}
        radiusMeters={radiusMeters}
        onRadiusChange={setRadiusMeters}
        categoryCounts={categoryCounts}
        onClearFilters={handleClearFilters}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
        isRadiusOpen={isRadiusOpen}
        onToggleRadius={() => setIsRadiusOpen((prev) => !prev)}
        isStatisticsOpen={isStatisticsOpen}
        onToggleStatistics={() => setIsStatisticsOpen((prev) => !prev)}
        isLayersOpen={isLayersOpen}
        onToggleLayers={() => setIsLayersOpen((prev) => !prev)}
        sidebarState={effectiveSidebarState}
        onSetSidebarState={setSidebarState}
        umkmList={filteredUmkm}
        totalFilteredCount={filteredUmkm.length || (allUmkm.length > 0 ? allUmkm.length : TOTAL_UMKM_VALID)}
        selectedUmkm={selectedUmkm}
        onSelectUmkm={handleSelectUmkm}
        routeResult={routeResult}
        routeMode={routeMode}
        onSelectRouteMode={setRouteMode}
        isRoutingLoading={isRoutingLoading}
        isSettingOrigin={isSettingOrigin}
        onToggleSetOrigin={() => setIsSettingOrigin((prev) => !prev)}
        showUmkm={showUmkm}
        onToggleShowUmkm={() => setShowUmkm((prev) => !prev)}
        showWilayah={showWilayah}
        onToggleShowWilayah={() => setShowWilayah((prev) => !prev)}
        showJalan={showJalan}
        onToggleShowJalan={() => setShowJalan((prev) => !prev)}
        showSekolah={showSekolah}
        onToggleShowSekolah={() => setShowSekolah((prev) => !prev)}
        showPermukiman={showPermukiman}
        onToggleShowPermukiman={() => setShowPermukiman((prev) => !prev)}
        onRecenterUser={handleRecenterUser}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  );
}

export default MapPengunjung;
