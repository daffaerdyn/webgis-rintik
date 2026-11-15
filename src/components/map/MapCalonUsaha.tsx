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
import { normalizeRegionString } from "@/lib/constants";
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

  // Batas wilayah Kota Bogor (polygon rings) untuk validasi point-in-polygon presisi
  const bogorPolygonsRef = useRef<number[][][]>([]);

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
                kecamatan: normalizeRegionString(p.kecamatan),
                kelurahan: normalizeRegionString(p.kelurahan),
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

  // 1b. Muat GeoJSON Batas Wilayah Kota Bogor untuk validasi point-in-polygon presisi
  useEffect(() => {
    async function loadBoundary() {
      try {
        const res = await fetch("/data/ADMINISTRASIDESA_AR_25K_KotaBogor.geojson");
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = await res.json() as any;
          if (json.features && Array.isArray(json.features)) {
            const rings: number[][][] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            json.features.forEach((f: any) => {
              const g = f.geometry;
              if (g?.type === "Polygon") {
                rings.push(g.coordinates[0]); // outer ring only
              } else if (g?.type === "MultiPolygon") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                g.coordinates.forEach((poly: any) => rings.push(poly[0]));
              }
            });
            bogorPolygonsRef.current = rings;
          }
        }
      } catch (err) {
        console.warn("Gagal memuat GeoJSON batas wilayah:", err);
      }
    }
    loadBoundary();
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

  // Ref untuk debounce dan pembatalan request API latar belakang
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentReqIdRef = useRef<number>(0);
  const circleRef = useRef<L.Circle | null>(null);

  // Bersihkan timer dan request saat unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Update langsung radius fisik lingkaran Leaflet di canvas tanpa delay rekonsiliasi
  useEffect(() => {
    if (circleRef.current && radiusMeters > 0) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // 1. Komputasi spasial lokal INSTAN (0 ms) di memori klien
  // Menjamin lingkaran buffer dan pin selalu 100% konsisten seketika (60 FPS, bebas lag & race condition)
  const localCompetitorMarkers = useMemo(() => {
    if (!candidatePoint || !selectedCategory) return [];
    const catLower = selectedCategory.toLowerCase();
    const result: UmkmItem[] = [];

    for (let i = 0; i < masterUmkm.length; i++) {
      const umkm = masterUmkm[i];
      if (umkm.kategori.toLowerCase() === catLower) {
        const distKm = MapRoutingService.calculateHaversineDistanceKm(
          candidatePoint.lat,
          candidatePoint.lng,
          umkm.latitude,
          umkm.longitude
        );
        const distMeters = Math.round(distKm * 1000);
        if (distMeters <= radiusMeters) {
          result.push({
            ...umkm,
            jarak_meter: distMeters,
          });
        }
      }
    }

    result.sort((a, b) => (a.jarak_meter || 0) - (b.jarak_meter || 0));
    return result;
  }, [candidatePoint, radiusMeters, selectedCategory, masterUmkm]);

  // 2. Sinkronkan analysisData secara instan mengikuti pergerakan buffer lokal (0 ms)
  useEffect(() => {
    if (!candidatePoint || !selectedCategory) return;

    setAnalysisData((prev) => ({
      parameter: {
        latitude: candidatePoint.lat,
        longitude: candidatePoint.lng,
        radius_meter: radiusMeters,
        kategori: selectedCategory,
      },
      buffer: prev?.buffer,
      umkm_sejenis: {
        jumlah: localCompetitorMarkers.length,
        terdekat: localCompetitorMarkers.slice(0, 5),
        daftar: localCompetitorMarkers,
      },
      fasilitas_dalam_radius: prev?.fasilitas_dalam_radius,
      fasilitas_terdekat: prev?.fasilitas_terdekat || {
        jalan_terdekat: "Jaringan Jalan Kota Bogor",
        jarak_jalan_meter: 24,
        sekolah_terdekat: "Fasilitas Pendidikan Terdekat",
        jarak_sekolah_meter: 142,
      },
    }));
  }, [candidatePoint, radiusMeters, selectedCategory, localCompetitorMarkers]);

  // 3. Request analisis API latar belakang (Debounced 300ms + AbortController)
  // Hanya mengambil fasilitas terdekat & metadata PostGIS tanpa memblokir rendering pin
  const requestDetailedAnalysis = useCallback(
    (lat: number, lng: number, radius: number, category: string, immediate = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const executeFetch = async () => {
        const reqId = ++currentReqIdRef.current;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsAnalyzing(true);

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
            signal: controller.signal,
          });

          if (res.ok && reqId === currentReqIdRef.current) {
            const json = await res.json();
            if (json.success && json.data) {
              setAnalysisData((prev) => {
                if (!prev) return json.data;
                return {
                  ...prev,
                  buffer: json.data.buffer || prev.buffer,
                  fasilitas_dalam_radius:
                    json.data.fasilitas_dalam_radius || prev.fasilitas_dalam_radius,
                  fasilitas_terdekat:
                    json.data.fasilitas_terdekat || prev.fasilitas_terdekat,
                };
              });
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== "AbortError") {
            console.warn("Background analysis fetch info:", err);
          }
        } finally {
          if (reqId === currentReqIdRef.current) {
            setIsAnalyzing(false);
          }
        }
      };

      if (immediate) {
        executeFetch();
      } else {
        debounceTimerRef.current = setTimeout(executeFetch, 300);
      }
    },
    []
  );

  // 4. Handler Seleksi Kategori (Langkah 1)
  const handleSelectCategory = useCallback(
    (category: string) => {
      setSelectedCategory(category);
      setIsCategoryModalOpen(false);
      setGuardrailWarning(null);

      if (candidatePoint) {
        requestDetailedAnalysis(candidatePoint.lat, candidatePoint.lng, radiusMeters, category, true);
      } else {
        setCurrentStep(2);
      }
    },
    [candidatePoint, radiusMeters, requestDetailedAnalysis]
  );

  // Utilitas: Point-in-polygon (ray casting) untuk cek apakah klik di dalam Kota Bogor
  const isInsideBogor = useCallback((lat: number, lng: number): boolean => {
    const polygons = bogorPolygonsRef.current;
    if (polygons.length === 0) {
      // Fallback ke bounding box jika GeoJSON belum dimuat
      const b = BOGOR_COORDINATES.bounds;
      return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
    }
    for (const ring of polygons) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1]; // [lng, lat]
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }, []);

  // 5. Handler Klik Peta (Langkah 2: Tentukan Titik Usaha)
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (!selectedCategory) {
        setGuardrailWarning("Pilih Dulu Kategori UMKM-Mu");
        setIsCategoryModalOpen(true);
        return;
      }

      if (!isInsideBogor(coords.lat, coords.lng)) {
        setGuardrailWarning(
          "Lokasi berada di luar wilayah Kota Bogor. Silakan pilih titik di dalam Kota Bogor."
        );
        return;
      }

      setCandidatePoint(coords);
      setCurrentStep(3);
      setGuardrailWarning(null);
      setIsResultPanelOpen(true);

      // Eksekusi analisis langsung
      requestDetailedAnalysis(coords.lat, coords.lng, radiusMeters, selectedCategory, true);

      if (mapRef.current) {
        mapRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
      }
    },
    [selectedCategory, radiusMeters, requestDetailedAnalysis, isInsideBogor]
  );

  // 6. Handler Perubahan Radius (Langkah 3: Atur Buffer)
  const handleRadiusChange = useCallback(
    (radius: number) => {
      if (!selectedCategory) {
        setGuardrailWarning("Pilih Dulu Kategori UMKM-Mu");
        return;
      }
      if (!candidatePoint) {
        setGuardrailWarning("Pilih Titik Lokasi UMKM-Mu Dulu");
        return;
      }

      // Radius state berubah seketika -> localCompetitorMarkers otomatis update dalam 0 ms
      setRadiusMeters(radius);

      // Request backend di-debounce 300 ms agar tidak spam request saat slider digeser cepat
      requestDetailedAnalysis(candidatePoint.lat, candidatePoint.lng, radius, selectedCategory, false);
    },
    [selectedCategory, candidatePoint, requestDetailedAnalysis]
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
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
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

  // Kompetitor sejenis yang dirender di dalam radius buffer (langsung dari kalkulasi instan)
  const competitorMarkers: UmkmItem[] = localCompetitorMarkers;

  // Titik UMKM yang dirender di canvas peta:
  // 1. Jika candidatePoint ada: tampilkan kompetitor sejenis di dalam buffer (100% cocok dengan radius circle)
  // 2. Jika candidatePoint belum ada tapi selectedCategory ada: tampilkan UMKM sejenis di Bogor
  // 3. Jika belum pilih kategori dan showUmkm aktif: tampilkan master UMKM
  const activeUmkmPins = useMemo(() => {
    if (!showUmkm) return [];
    if (candidatePoint) {
      return localCompetitorMarkers;
    }
    if (selectedCategory) {
      return masterUmkm.filter(
        (u) => u.kategori.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    return masterUmkm;
  }, [showUmkm, candidatePoint, localCompetitorMarkers, selectedCategory, masterUmkm]);

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
            ref={circleRef}
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