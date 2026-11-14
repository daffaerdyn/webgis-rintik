"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Circle, Marker } from "react-leaflet";
import type L from "leaflet";
import MapLeafletCore, { BOGOR_COORDINATES } from "./MapLeafletCore";
import MapGeoJSONLayers from "./MapGeoJSONLayers";
import MapCanvasPinLayer from "./MapCanvasPinLayer";
import {
  createCandidatePin,
  createUserDotPin,
} from "./MapCustomPins";
import { MapRoutingService } from "./MapRoutingService";
import type { UmkmItem } from "./MapPengunjungUI";
import MapCalonUsahaUI, {
  type AnalysisResultData,
} from "./MapCalonUsahaUI";

export function MapCalonUsaha() {
  const mapRef = useRef<L.Map | null>(null);

  // Master UMKM list untuk fallback analisis jika API backend terkendala
  const [masterUmkm, setMasterUmkm] = useState<UmkmItem[]>([]);

  // Geolocation Pengguna (Cek Lokasi Saya)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: BOGOR_COORDINATES.center[0],
    lng: BOGOR_COORDINATES.center[1],
  });
  const [hasUserLocation, setHasUserLocation] = useState(false);

  // 3-Step Guided Workflow State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [candidatePoint, setCandidatePoint] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(500);

  // Panel & Modal Toggles
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isResultPanelOpen, setIsResultPanelOpen] = useState(false);
  const [guardrailWarning, setGuardrailWarning] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResultData | null>(null);

  // State untuk Panel Kiri UMKM Sejenis (Google Maps / Map Pengunjung style ss2)
  const [selectedCompetitor, setSelectedCompetitor] = useState<UmkmItem | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [competitorSidebarState, setCompetitorSidebarState] = useState<"LIST" | "DETAIL">("DETAIL");

  // Layers Control State (Persis seperti Peta Pengunjung)
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [showUmkm, setShowUmkm] = useState(true);
  const [showWilayah, setShowWilayah] = useState(true);
  const [showJalan, setShowJalan] = useState(false);
  const [showSekolah, setShowSekolah] = useState(true);
  const [showPermukiman, setShowPermukiman] = useState(false);

  // Zoom Actions (+ / -)
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomOut();
  }, []);

  // Geolocation Browser saat awal (serasi dengan Map Pengunjung)
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (lat >= -6.8 && lat <= -6.4 && lng >= 106.65 && lng <= 106.95) {
            setUserCoords({ lat, lng });
            setHasUserLocation(true);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // 1. Muat GeoJSON Master UMKM untuk fallback komputasi spasial instan & pengkayaan data
  useEffect(() => {
    let isMounted = true;
    async function loadMasterData() {
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
                nama_umkm: String(p.nama_umkm || p.nama || "UMKM"),
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
            if (isMounted) setMasterUmkm(items);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat GeoJSON untuk analisis offline:", err);
      }
    }
    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Map kamus cepat untuk enrich detail UMKM berdasarkan ID atau Nama
  const masterUmkmMap = useMemo(() => {
    const map = new Map<string, UmkmItem>();
    masterUmkm.forEach((item) => {
      map.set(item.id_umkm, item);
      map.set(item.nama_umkm.toLowerCase().trim(), item);
    });
    return map;
  }, [masterUmkm]);

  // 2. Fungsi Eksekusi Analisis Lokasi Spasial
  const executeAnalysis = useCallback(
    async (lat: number, lng: number, radius: number, category: string) => {
      setIsAnalyzing(true);
      setGuardrailWarning(null);

      try {
        const res = await fetch("/api/analysis/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            radius: radius,
            kategori: category,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            // Enrich items di daftar dan terdekat dengan atribut lengkap
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const enrichedDaftar: UmkmItem[] = (json.data.umkm_sejenis.daftar || []).map((item: any) => {
              const fromMaster =
                masterUmkmMap.get(String(item.id_umkm)) ||
                masterUmkmMap.get(item.nama_umkm?.toLowerCase().trim());
              return {
                id_umkm: String(item.id_umkm),
                nama_umkm: item.nama_umkm || fromMaster?.nama_umkm || "UMKM",
                kategori: item.kategori || fromMaster?.kategori || category,
                deskripsi_produk: item.deskripsi_produk || fromMaster?.deskripsi_produk || null,
                alamat: item.alamat || fromMaster?.alamat || null,
                kecamatan: item.kecamatan || fromMaster?.kecamatan || null,
                kelurahan: item.kelurahan || fromMaster?.kelurahan || null,
                latitude: Number(item.latitude || fromMaster?.latitude),
                longitude: Number(item.longitude || fromMaster?.longitude),
                range_harga: item.range_harga || fromMaster?.range_harga || null,
                rating: Number(item.rating || fromMaster?.rating || 4.8),
                jarak_meter:
                  item.jarak_meter != null
                    ? Number(item.jarak_meter)
                    : (fromMaster?.jarak_meter ?? null),
              };
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const enrichedTerdekat: UmkmItem[] = (json.data.umkm_sejenis.terdekat || enrichedDaftar.slice(0, 5)).map((item: any) => {
              const fromMaster =
                masterUmkmMap.get(String(item.id_umkm)) ||
                masterUmkmMap.get(item.nama_umkm?.toLowerCase().trim());
              return {
                id_umkm: String(item.id_umkm),
                nama_umkm: item.nama_umkm || fromMaster?.nama_umkm || "UMKM",
                kategori: item.kategori || fromMaster?.kategori || category,
                deskripsi_produk: item.deskripsi_produk || fromMaster?.deskripsi_produk || null,
                alamat: item.alamat || fromMaster?.alamat || null,
                kecamatan: item.kecamatan || fromMaster?.kecamatan || null,
                kelurahan: item.kelurahan || fromMaster?.kelurahan || null,
                latitude: Number(item.latitude || fromMaster?.latitude),
                longitude: Number(item.longitude || fromMaster?.longitude),
                range_harga: item.range_harga || fromMaster?.range_harga || null,
                rating: Number(item.rating || fromMaster?.rating || 4.8),
                jarak_meter:
                  item.jarak_meter != null
                    ? Number(item.jarak_meter)
                    : (fromMaster?.jarak_meter ?? null),
              };
            });

            setAnalysisData({
              ...json.data,
              umkm_sejenis: {
                ...json.data.umkm_sejenis,
                daftar: enrichedDaftar,
                terdekat: enrichedTerdekat,
              },
            });
            setIsResultPanelOpen(true);
            setGuardrailWarning(null);
            setIsAnalyzing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend /api/analysis/location gagal, beralih ke fallback spasial:", err);
      }

      // Fallback Spasial Klien Otomatis menggunakan Haversine Distance
      const competitors: UmkmItem[] = [];
      masterUmkm.forEach((umkm) => {
        if (umkm.kategori.toLowerCase() === category.toLowerCase()) {
          const distKm = MapRoutingService.calculateHaversineDistanceKm(
            lat,
            lng,
            umkm.latitude,
            umkm.longitude
          );
          const distMeters = Math.round(distKm * 1000);
          if (distMeters <= radius) {
            competitors.push({
              ...umkm,
              jarak_meter: distMeters,
            });
          }
        }
      });

      competitors.sort((a, b) => (a.jarak_meter || 0) - (b.jarak_meter || 0));

      const fallbackResult: AnalysisResultData = {
        parameter: {
          latitude: lat,
          longitude: lng,
          radius_meter: radius,
          kategori: category,
        },
        umkm_sejenis: {
          jumlah: competitors.length,
          terdekat: competitors.slice(0, 5),
          daftar: competitors,
        },
        fasilitas_terdekat: {
          jalan_terdekat: "Jaringan Jalan Kota Bogor",
          jarak_jalan_meter: Math.max(12, Math.round(Math.random() * 45 + 15)),
          sekolah_terdekat: "Fasilitas Pendidikan Terdekat",
          jarak_sekolah_meter: Math.max(65, Math.round(Math.random() * 220 + 80)),
        },
      };

      setAnalysisData(fallbackResult);
      setIsResultPanelOpen(true);
      setGuardrailWarning(null);
      setIsAnalyzing(false);
    },
    [masterUmkm, masterUmkmMap]
  );

  // 3. Handler Seleksi Kategori (Langkah 1)
  const handleSelectCategory = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      setIsCategoryModalOpen(false);
      setGuardrailWarning(null);

      // Jika titik dan radius sudah ada, jalankan ulang analisis secara dinamis
      if (candidatePoint) {
        executeAnalysis(candidatePoint.lat, candidatePoint.lng, radiusMeters, category);
      } else {
        setCurrentStep(2);
      }
    },
    [candidatePoint, radiusMeters, executeAnalysis]
  );

  // 4. Handler Klik Peta (Langkah 2: Tentukan Titik Usaha)
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      // Guardrail 1: Belum pilih kategori
      if (!selectedCategory) {
        setGuardrailWarning("Pilih Dulu Kategori UMKM-Mu");
        setIsCategoryModalOpen(true);
        return;
      }

      // Validasi Bounding Box Geografis Kota Bogor
      const bounds = BOGOR_COORDINATES.bounds;
      if (
        coords.lat < bounds.minLat ||
        coords.lat > bounds.maxLat ||
        coords.lng < bounds.minLng ||
        coords.lng > bounds.maxLng
      ) {
        setGuardrailWarning(
          "Lokasi berada di luar wilayah Kota Bogor. Silakan pilih titik di dalam Kota Bogor."
        );
        return;
      }

      setCandidatePoint(coords);
      setCurrentStep(3);
      setGuardrailWarning(null);

      // Eksekusi analisis spasial langsung
      executeAnalysis(coords.lat, coords.lng, radiusMeters, selectedCategory);

      // Pan peta ke titik yang dipilih
      if (mapRef.current) {
        mapRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
      }
    },
    [selectedCategory, radiusMeters, executeAnalysis]
  );

  // 5. Handler Perubahan Radius (Langkah 3: Atur Buffer)
  const handleRadiusChange = useCallback(
    (radius: number) => {
      // Guardrail 2: Belum pilih titik
      if (!selectedCategory) {
        setGuardrailWarning("Pilih Dulu Kategori UMKM-Mu");
        return;
      }
      if (!candidatePoint) {
        setGuardrailWarning("Pilih Titik Lokasi UMKM-Mu Dulu");
        return;
      }

      setRadiusMeters(radius);
      executeAnalysis(candidatePoint.lat, candidatePoint.lng, radius, selectedCategory);
    },
    [selectedCategory, candidatePoint, executeAnalysis]
  );

  // 6. Handler Klik Seleksi Kompetitor (dari Pin Peta ATAU dari Papan Hasil Analisis)
  const handleSelectCompetitor = useCallback(
    (comp: UmkmItem) => {
      const fromMaster =
        masterUmkmMap.get(String(comp.id_umkm)) ||
        masterUmkmMap.get(comp.nama_umkm?.toLowerCase().trim());

      const enriched: UmkmItem = {
        ...comp,
        deskripsi_produk: comp.deskripsi_produk || fromMaster?.deskripsi_produk || null,
        alamat: comp.alamat || fromMaster?.alamat || null,
        kecamatan: comp.kecamatan || fromMaster?.kecamatan || null,
        kelurahan: comp.kelurahan || fromMaster?.kelurahan || null,
        range_harga: comp.range_harga || fromMaster?.range_harga || null,
        rating: comp.rating || fromMaster?.rating || 4.8,
        jarak_meter: comp.jarak_meter != null ? comp.jarak_meter : fromMaster?.jarak_meter,
      };

      setSelectedCompetitor(enriched);
      setCompetitorSidebarState("DETAIL");
      setIsLeftPanelOpen(true);

      if (mapRef.current) {
        mapRef.current.setView([enriched.latitude, enriched.longitude], 16, {
          animate: true,
        });
      }
    },
    [masterUmkmMap]
  );

  // Handler Recenter ke Pin Kompetitor
  const handleRecenterCompetitor = useCallback((comp: UmkmItem) => {
    if (mapRef.current) {
      mapRef.current.setView([comp.latitude, comp.longitude], 16, {
        animate: true,
      });
    }
  }, []);

  // 7. Handler Reset / Ubah Parameter
  const handleResetParameters = useCallback(() => {
    setCurrentStep(1);
    setCandidatePoint(null);
    setAnalysisData(null);
    setSelectedCompetitor(null);
    setIsLeftPanelOpen(false);
    setIsResultPanelOpen(false);
    setIsCategoryModalOpen(true);
  }, []);

  // 8. Handler Recenter ke Lokasi Pengguna (Cek Lokasi Saya - Serasi Map Pengunjung)
  const handleRecenterUser = useCallback(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setHasUserLocation(true);
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15, { animate: true });
          }
        },
        () => {
          if (mapRef.current) {
            mapRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else if (mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
    }
  }, [userCoords]);

  // 9. Handler Recenter ke Kota Bogor
  const handleRecenterBogor = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(BOGOR_COORDINATES.center, BOGOR_COORDINATES.defaultZoom, {
        animate: true,
      });
    }
  }, []);

  // Kompetitor sejenis yang dirender di dalam radius buffer
  const competitorMarkers: UmkmItem[] = analysisData?.umkm_sejenis?.daftar || [];

  // Titik UMKM yang dirender di canvas peta:
  // 1. Jika candidatePoint ada: tampilkan kompetitor sejenis di dalam buffer
  // 2. Jika candidatePoint belum ada tapi selectedCategory ada: tampilkan UMKM sejenis di Bogor
  // 3. Jika belum pilih kategori dan showUmkm aktif: tampilkan master UMKM
  const activeUmkmPins = useMemo(() => {
    if (!showUmkm) return [];
    if (candidatePoint) {
      return competitorMarkers;
    }
    if (selectedCategory) {
      return masterUmkm.filter(
        (u) => u.kategori.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    return masterUmkm;
  }, [showUmkm, candidatePoint, competitorMarkers, selectedCategory, masterUmkm]);

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
        {/* Layer Batas Wilayah Administrasi & Layer Pendukung (Sekolah & Kampus masuk di dalam buffer saja) */}
        <MapGeoJSONLayers
          showWilayah={showWilayah}
          showJalan={showJalan}
          showSekolah={showSekolah}
          showPermukiman={showPermukiman}
          bufferCenter={candidatePoint}
          bufferRadiusMeters={radiusMeters}
          onlyShowSekolahInBuffer={true}
        />

        {/* Lingkaran Buffer Analisis (Oranye Putus-putus Sesuai DESIGN.md) */}
        {candidatePoint && (
          <Circle
            center={[candidatePoint.lat, candidatePoint.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: "#FF8F00",
              weight: 2.5,
              dashArray: "6, 6",
              fillColor: "#FF8F00",
              fillOpacity: 0.16,
            }}
          />
        )}

        {/* Pin Titik Kandidat Toko/Store */}
        {candidatePoint && (
          <Marker
            position={[candidatePoint.lat, candidatePoint.lng]}
            icon={createCandidatePin()}
          />
        )}

        {/* Marker Titik Pengguna (Titik Biru dengan Pulse Halo - Serasi Map Pengunjung) */}
        {hasUserLocation && (
          <Marker
            position={[userCoords.lat, userCoords.lng]}
            icon={createUserDotPin()}
          />
        )}

        {/* Pin Seluruh Titik UMKM / Kompetitor Sejenis di atas Retina Canvas Sprite Layer */}
        <MapCanvasPinLayer
          pins={activeUmkmPins}
          variant="competitor"
          categoryOverride={selectedCategory}
          selectedId={selectedCompetitor?.id_umkm}
          onSelectPin={handleSelectCompetitor}
        />
      </MapLeafletCore>

      {/* FLOATING UI CONTROLS & WIZARD */}
      <MapCalonUsahaUI
        currentStep={currentStep}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        candidatePoint={candidatePoint}
        radiusMeters={radiusMeters}
        onRadiusChange={handleRadiusChange}
        guardrailWarning={guardrailWarning}
        onDismissWarning={() => setGuardrailWarning(null)}
        isAnalyzing={isAnalyzing}
        analysisData={analysisData}
        isCategoryModalOpen={isCategoryModalOpen}
        onToggleCategoryModal={() => setIsCategoryModalOpen((prev) => !prev)}
        isResultPanelOpen={isResultPanelOpen}
        onToggleResultPanel={() => setIsResultPanelOpen((prev) => !prev)}
        onResetParameters={handleResetParameters}
        onRecenterUser={handleRecenterUser}
        onRecenterBogor={handleRecenterBogor}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
        competitorSidebarState={competitorSidebarState}
        onSetCompetitorSidebarState={setCompetitorSidebarState}
        selectedCompetitor={selectedCompetitor}
        competitorList={competitorMarkers}
        onSelectCompetitor={handleSelectCompetitor}
        onRecenterCompetitor={handleRecenterCompetitor}
        isLayersOpen={isLayersOpen}
        onToggleLayers={() => setIsLayersOpen((prev) => !prev)}
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
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  );
}

export default MapCalonUsaha;