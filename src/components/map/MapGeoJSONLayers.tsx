"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import {
  createCanvasPinOverlay,
  type CanvasPinItem,
  type CanvasPinOverlayHandle,
} from "./MapCanvasPinRenderer";

/**
 * Cache in-memory untuk menyimpan GeoJSON yang sudah dimuat agar tidak fetch berulang kali
 */
const geojsonMemoryCache: Record<string, FeatureCollection> = {};

export interface MapGeoJSONLayersProps {
  showWilayah?: boolean;
  showJalan?: boolean;
  showPermukiman?: boolean;
  showSekolah?: boolean;
  selectedKecamatan?: string;
  selectedKelurahan?: string;
  fitOnSelect?: boolean;
  onWilayahLoaded?: (data: FeatureCollection) => void;
  onSchoolClick?: (school: Feature<Geometry>) => void;
  bufferCenter?: { lat: number; lng: number } | null;
  bufferRadiusMeters?: number | null;
  onlyShowSekolahInBuffer?: boolean;
}

/**
 * Komponen Layer Spasial GeoJSON Terakselerasi HTML5 Canvas:
 * 1. Batas Wilayah Administrasi Kota Bogor (Canvas Renderer + smoothFactor)
 * 2. Highlight Poligon Garis Putus-putus Biru (Kecamatan / Kelurahan) + Auto FitBounds
 * 3. Jaringan Jalan Kota Bogor (Canvas Renderer + smoothFactor)
 * 4. Poligon Area Permukiman (Canvas Renderer + smoothFactor)
 * 5. Titik Fasilitas Sekolah / Kampus (Retina Canvas Sprite Layer + Popup)
 */
/**
 * Menghitung jarak geodesik bola bumi (Haversine formula) dalam meter.
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MapGeoJSONLayers({
  showWilayah = true,
  showJalan = false,
  showPermukiman = false,
  showSekolah = true,
  selectedKecamatan = "Semua",
  selectedKelurahan = "Semua",
  fitOnSelect = true,
  onWilayahLoaded,
  onSchoolClick,
  bufferCenter,
  bufferRadiusMeters,
  onlyShowSekolahInBuffer = false,
}: MapGeoJSONLayersProps) {
  const map = useMap();

  // State data GeoJSON
  const [wilayahData, setWilayahData] = useState<FeatureCollection | null>(null);
  const [jalanData, setJalanData] = useState<FeatureCollection | null>(null);
  const [permukimanData, setPermukimanData] = useState<FeatureCollection | null>(null);
  const [sekolahData, setSekolahData] = useState<FeatureCollection | null>(null);

  // Shared HTML5 Canvas Renderer untuk seluruh poligon & garis GeoJSON
  const canvasRendererRef = useRef<L.Canvas | null>(null);

  // Layer groups refs untuk manipulasi Leaflet
  const wilayahLayerRef = useRef<L.GeoJSON | null>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);
  const jalanLayerRef = useRef<L.GeoJSON | null>(null);
  const permukimanLayerRef = useRef<L.GeoJSON | null>(null);
  const sekolahOverlayRef = useRef<CanvasPinOverlayHandle<Feature<Geometry>> | null>(null);
  const schoolPopupRef = useRef<L.Popup | null>(null);

  // Helper mendapatkan instance L.Canvas bersama
  const getSharedCanvasRenderer = (): L.Canvas => {
    if (!canvasRendererRef.current) {
      canvasRendererRef.current = L.canvas({ padding: 0.4 });
    }
    return canvasRendererRef.current;
  };

  // Helper fetcher dengan cache
  const fetchGeoJson = async (url: string, fallbackUrl?: string): Promise<FeatureCollection | null> => {
    if (geojsonMemoryCache[url]) {
      return geojsonMemoryCache[url];
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as FeatureCollection;
        geojsonMemoryCache[url] = json;
        return json;
      }
    } catch (err) {
      console.warn(`Gagal memuat ${url}:`, err);
    }

    if (fallbackUrl) {
      try {
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const json = (await fallbackRes.json()) as FeatureCollection;
          geojsonMemoryCache[url] = json;
          return json;
        }
      } catch (err) {
        console.warn(`Gagal memuat fallback ${fallbackUrl}:`, err);
      }
    }

    return null;
  };

  // 1. Muat Wilayah Administrasi Kota Bogor
  useEffect(() => {
    if (!showWilayah) return;

    let isMounted = true;
    fetchGeoJson("/data/ADMINISTRASIDESA_AR_25K_KotaBogor.geojson", "/api/layers/wilayah").then((data) => {
      if (isMounted && data) {
        setWilayahData(data);
        if (onWilayahLoaded) {
          onWilayahLoaded(data);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [showWilayah, onWilayahLoaded]);

  // Render Base Wilayah Layer di atas HTML5 Canvas
  useEffect(() => {
    if (!map) return;

    if (wilayahLayerRef.current) {
      map.removeLayer(wilayahLayerRef.current);
      wilayahLayerRef.current = null;
    }

    if (showWilayah && wilayahData) {
      const renderer = getSharedCanvasRenderer();
      const layer = L.geoJSON(wilayahData, {
        style: () => ({
          renderer,
          smoothFactor: 1.5,
          color: "#1e293b",
          weight: 2,
          opacity: 0.85,
          fillColor: "#38bdf8",
          fillOpacity: 0.04,
        }),
        interactive: false,
      }).addTo(map);

      layer.bringToBack();
      wilayahLayerRef.current = layer;
    }

    return () => {
      if (wilayahLayerRef.current && map) {
        map.removeLayer(wilayahLayerRef.current);
        wilayahLayerRef.current = null;
      }
    };
  }, [map, showWilayah, wilayahData]);

  // 2. Render Highlight Poligon (Kecamatan / Kelurahan) dengan Garis Putus-putus Biru
  useEffect(() => {
    if (!map) return;

    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (!wilayahData || !wilayahData.features) return;

    const isAllKec = !selectedKecamatan || selectedKecamatan === "Semua";
    const isAllKel = !selectedKelurahan || selectedKelurahan === "Semua";

    if (isAllKec && isAllKel) {
      if (fitOnSelect && wilayahLayerRef.current) {
        const bounds = wilayahLayerRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      }
      return;
    }

    const matchingFeatures = wilayahData.features.filter((f) => {
      const p = (f.properties || {}) as Record<string, unknown>;
      const fKec = String(p.WADMKC || p.KECAMATAN || p.kecamatan || p.Kecamatan || p.NAMOBJ || "")
        .trim()
        .toLowerCase();
      const fKel = String(p.WADMKD || p.KELURAHAN || p.kelurahan || p.Kelurahan || p.DESA || p.desa || "")
        .trim()
        .toLowerCase();

      const matchKec = isAllKec || fKec.includes(selectedKecamatan.toLowerCase());
      const matchKel = isAllKel || fKel.includes(selectedKelurahan.toLowerCase());

      if (!isAllKel) return matchKel;
      if (!isAllKec) return matchKec;
      return false;
    });

    if (matchingFeatures.length > 0) {
      const renderer = getSharedCanvasRenderer();
      const featureCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: matchingFeatures,
      };
      const highlightGeoJson = L.geoJSON(featureCollection, {
        style: () => ({
          renderer,
          smoothFactor: 1.0,
          color: "#0284c7",
          weight: 4,
          opacity: 1,
          fillColor: "#38bdf8",
          fillOpacity: 0.25,
          dashArray: "4, 4",
        }),
        interactive: false,
      }).addTo(map);

      highlightGeoJson.bringToFront();
      highlightLayerRef.current = highlightGeoJson;

      if (fitOnSelect) {
        const bounds = highlightGeoJson.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 16,
            animate: true,
            duration: 1.2,
          });
        }
      }
    }

    return () => {
      if (highlightLayerRef.current && map) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
    };
  }, [map, wilayahData, selectedKecamatan, selectedKelurahan, fitOnSelect]);

  // 3. Jaringan Jalan Kota Bogor (Canvas Renderer + smoothFactor)
  useEffect(() => {
    if (!showJalan) {
      if (jalanLayerRef.current && map) {
        map.removeLayer(jalanLayerRef.current);
        jalanLayerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    if (!jalanData) {
      fetchGeoJson("/data/jalan_kota_bogor_final.geojson", "/api/layers/jalan").then((data) => {
        if (isMounted && data) {
          setJalanData(data);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [showJalan, jalanData, map]);

  useEffect(() => {
    if (!map) return;

    if (jalanLayerRef.current) {
      map.removeLayer(jalanLayerRef.current);
      jalanLayerRef.current = null;
    }

    if (showJalan && jalanData) {
      const renderer = getSharedCanvasRenderer();
      const layer = L.geoJSON(jalanData, {
        style: () => ({
          renderer,
          smoothFactor: 1.8,
          color: "#64748b",
          weight: 1.8,
          opacity: 0.7,
        }),
        interactive: false,
      }).addTo(map);

      jalanLayerRef.current = layer;
    }

    return () => {
      if (jalanLayerRef.current && map) {
        map.removeLayer(jalanLayerRef.current);
        jalanLayerRef.current = null;
      }
    };
  }, [map, showJalan, jalanData]);

  // 4. Poligon Area Permukiman (Canvas Renderer + smoothFactor 2.0 untuk 4.4MB Multipolygon)
  useEffect(() => {
    if (!showPermukiman) {
      if (permukimanLayerRef.current && map) {
        map.removeLayer(permukimanLayerRef.current);
        permukimanLayerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    if (!permukimanData) {
      fetchGeoJson(
        "/data/permukiman_kota_bogor_final(Multipolygon).geojson",
        "/api/layers/permukiman"
      ).then((data) => {
        if (isMounted && data) {
          setPermukimanData(data);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [showPermukiman, permukimanData, map]);

  useEffect(() => {
    if (!map) return;

    if (permukimanLayerRef.current) {
      map.removeLayer(permukimanLayerRef.current);
      permukimanLayerRef.current = null;
    }

    if (showPermukiman && permukimanData) {
      const renderer = getSharedCanvasRenderer();
      const layer = L.geoJSON(permukimanData, {
        style: () => ({
          renderer,
          smoothFactor: 2.0,
          color: "#ca8a04",
          weight: 1,
          fillColor: "#ca8a04",
          fillOpacity: 0.15,
        }),
        interactive: false,
      }).addTo(map);

      permukimanLayerRef.current = layer;
    }

    return () => {
      if (permukimanLayerRef.current && map) {
        map.removeLayer(permukimanLayerRef.current);
        permukimanLayerRef.current = null;
      }
    };
  }, [map, showPermukiman, permukimanData]);

  // 5. Titik Fasilitas Sekolah / Kampus (633 Titik di atas Retina Canvas Sprite Layer)
  useEffect(() => {
    if (!showSekolah) return;

    let isMounted = true;
    if (!sekolahData) {
      fetchGeoJson("/data/sekolah_kota_bogor_final.geojson", "/api/layers/sekolah").then((data) => {
        if (isMounted && data) {
          setSekolahData(data);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [showSekolah, sekolahData]);

  // Inisialisasi Canvas Overlay untuk Pin Sekolah
  useEffect(() => {
    if (!map) return;

    const handle = createCanvasPinOverlay<Feature<Geometry>>(map, {
      id: "rintik-school-pins",
      paneName: "rintikSchoolPinPane",
      zIndex: 560,
      variant: "school",
    });
    sekolahOverlayRef.current = handle;

    return () => {
      handle.destroy();
      sekolahOverlayRef.current = null;
      if (schoolPopupRef.current) {
        schoolPopupRef.current.remove();
        schoolPopupRef.current = null;
      }
    };
  }, [map]);

  // Sinkronisasi data Sekolah ke Canvas Overlay (difilter hanya di dalam buffer jika onlyShowSekolahInBuffer = true)
  useEffect(() => {
    if (!sekolahOverlayRef.current || !map) return;

    if (!showSekolah || !sekolahData || !sekolahData.features) {
      sekolahOverlayRef.current.updateData([], null, false);
      if (schoolPopupRef.current) {
        schoolPopupRef.current.remove();
        schoolPopupRef.current = null;
      }
      return;
    }

    // Jika mode buffer aktif namun belum ada titik/radius buffer, sembunyikan semua pin sekolah
    if (onlyShowSekolahInBuffer && (!bufferCenter || !bufferRadiusMeters || bufferRadiusMeters <= 0)) {
      sekolahOverlayRef.current.updateData([], null, false);
      if (schoolPopupRef.current) {
        schoolPopupRef.current.remove();
        schoolPopupRef.current = null;
      }
      return;
    }

    const items: CanvasPinItem<Feature<Geometry>>[] = [];
    sekolahData.features.forEach((feature, idx) => {
      if (!feature.geometry || feature.geometry.type !== "Point") return;
      const coords = (feature.geometry as unknown as { coordinates: number[] }).coordinates;
      if (!coords || coords.length < 2) return;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      // Filter: hanya masukkan jika berada di dalam radius buffer
      if (onlyShowSekolahInBuffer && bufferCenter && bufferRadiusMeters && bufferRadiusMeters > 0) {
        const dist = calculateDistanceMeters(bufferCenter.lat, bufferCenter.lng, lat, lng);
        if (dist > bufferRadiusMeters) {
          return;
        }
      }

      items.push({
        id: `school-${idx}`,
        lat,
        lng,
        data: feature,
      });
    });

    sekolahOverlayRef.current.updateData(items, null, true, (feature) => {
      const coords = (feature.geometry as unknown as { coordinates: number[] }).coordinates;
      const [lng, lat] = coords;
      const p = (feature.properties || {}) as Record<string, unknown>;
      const namaSekolah = String(p.nama || p.nama_sekolah || p.name || "Fasilitas Pendidikan");
      const jenjang = String(p.tingkat || p.jenjang || p.kategori || "Sekolah / Kampus");

      let bufferDistInfo = "";
      if (bufferCenter) {
        const d = Math.round(calculateDistanceMeters(bufferCenter.lat, bufferCenter.lng, lat, lng));
        bufferDistInfo = `
          <div style="font-size:10px; color:#059669; font-weight:700; margin-top:3px; display:flex; align-items:center; gap:4px;">
            <span>📍 Jarak di dalam buffer: ± ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${d} m`}</span>
          </div>
        `;
      }

      const popup = L.popup({ offset: [0, -10] })
        .setLatLng([lat, lng])
        .setContent(`
          <div style="font-size:12px; padding:4px; font-family:var(--font-sans);">
            <div style="font-size:10px; font-weight:800; color:#059669; text-transform:uppercase;">
              ${jenjang}
            </div>
            <div style="font-weight:700; color:#0f172a; margin-top:2px;">
              ${namaSekolah}
            </div>
            ${bufferDistInfo}
            <div style="font-size:10px; color:#64748b; margin-top:2px;">
              Potensi Pasar Pelajar dan Mahasiswa
            </div>
          </div>
        `)
        .openOn(map);

      schoolPopupRef.current = popup;

      if (onSchoolClick) {
        onSchoolClick(feature);
      }
    });
  }, [map, showSekolah, sekolahData, onSchoolClick, bufferCenter, bufferRadiusMeters, onlyShowSekolahInBuffer]);

  return null;
}

export default MapGeoJSONLayers;
