import type L from "leaflet";

export type TransportMode = "motor" | "mobil" | "jalan_kaki";

export interface RouteRequest {
  startLat: number;
  startLng: number;
  destLat: number;
  destLng: number;
  mode?: TransportMode;
  idUmkm?: string;
  timeoutMs?: number;
}

export interface RouteResult {
  success: boolean;
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  durationSeconds: number;
  coordinates: [number, number][]; // Urutan [latitude, longitude] untuk Leaflet polyline
  mode: TransportMode;
  isFallback: boolean;
  warning?: string;
}

/**
 * Menghitung jarak geodesic bola bumi (Haversine formula) dalam kilometer.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Estimasi durasi tempuh dalam menit berdasarkan jarak kilometer dan moda transportasi.
 * - Motor: 30 km/jam (~15% lebih gesit di Kota Bogor)
 * - Mobil: 22 km/jam (kecepatan rata-rata perkotaan Bogor)
 * - Jalan Kaki: 4.8 km/jam (~1.25 m/s)
 */
export function hitungDurasiMenit(distanceKm: number, mode: TransportMode = "motor"): number {
  let durasi = 0;
  if (mode === "motor") {
    durasi = Math.ceil((distanceKm / 30) * 60) + 1;
  } else if (mode === "mobil") {
    durasi = Math.ceil((distanceKm / 22) * 60) + 2;
  } else {
    // jalan_kaki
    durasi = Math.ceil((distanceKm / 4.8) * 60);
  }
  return Math.max(1, durasi);
}

/**
 * Membuat garis lurus fallback (geodesic straight line) saat OSRM offline, throttled, atau timeout.
 */
export function buatGarisLurusFallback(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  mode: TransportMode = "motor",
  reason: string = "Layanan OSRM tidak merespons atau timeout"
): RouteResult {
  const distanceKm = calculateHaversineDistanceKm(startLat, startLng, destLat, destLng);
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationMinutes = hitungDurasiMenit(distanceKm, mode);

  return {
    success: true,
    distanceKm,
    distanceMeters,
    durationMinutes,
    durationSeconds: durationMinutes * 60,
    coordinates: [
      [startLat, startLng],
      [destLat, destLng],
    ],
    mode,
    isFallback: true,
    warning: `Garis lurus fallback: ${reason}`,
  };
}

/**
 * Memanggil rute OSRM multi-moda dengan perlindungan timeout dan fallback garis lurus.
 */
export async function getMultiModalRoute(req: RouteRequest): Promise<RouteResult> {
  const mode = req.mode || "motor";
  const timeoutMs = req.timeoutMs || 8000;

  // 1. Jika idUmkm tersedia, utamakan endpoint backend Next.js /api/routing
  if (req.idUmkm) {
    try {
      const url = new URL("/api/routing", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
      url.searchParams.set("latitude", String(req.startLat));
      url.searchParams.set("longitude", String(req.startLng));
      url.searchParams.set("id_umkm", req.idUmkm);
      url.searchParams.set("mode", mode);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.geometry?.coordinates) {
          // OSRM coordinates format: [lng, lat] -> convert ke [lat, lng]
          const coords = (data.data.geometry.coordinates as [number, number][]).map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          const distanceMeters = Number(data.data.jarak_meter || 0);
          const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
          const durationMinutes = Number(data.data.durasi_menit || hitungDurasiMenit(distanceKm, mode));

          return {
            success: true,
            distanceKm,
            distanceMeters,
            durationMinutes,
            durationSeconds: Math.round(Number(data.data.durasi_detik || durationMinutes * 60)),
            coordinates: coords,
            mode,
            isFallback: false,
          };
        }
      }
    } catch (err) {
      console.warn("Backend /api/routing error/timeout, mencoba fallback:", err);
    }
  }

  // 2. Direct OSRM public server call dengan timeout
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${req.startLng},${req.startLat};${req.destLng},${req.destLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(osrmUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords = (route.geometry?.coordinates || []) as [number, number][];
        const coords = rawCoords.map((c) => [c[1], c[0]] as [number, number]);

        const distanceMeters = Math.round(route.distance || 0);
        const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));

        let durationSeconds = Number(route.duration || 0);
        if (mode === "jalan_kaki") {
          // Kecepatan jalan kaki ~1.25 m/s
          durationSeconds = Math.round(distanceMeters / 1.25);
        } else if (mode === "motor") {
          // Motor ~15% lebih cepat dari profil mobil OSRM
          durationSeconds = Math.round(durationSeconds * 0.85);
        }

        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

        return {
          success: true,
          distanceKm,
          distanceMeters,
          durationMinutes,
          durationSeconds,
          coordinates: coords,
          mode,
          isFallback: false,
        };
      }
    }
  } catch (err) {
    console.warn("OSRM direct routing error/timeout, mengaktifkan garis lurus fallback:", err);
  }

  // 3. Fallback garis lurus jika OSRM gagal
  return buatGarisLurusFallback(req.startLat, req.startLng, req.destLat, req.destLng, mode);
}

/**
 * Membuat Leaflet Polyline untuk rute navigasi.
 * Menggunakan warna Merah Sekunder (#C62828 / --brand-red) sesuai DESIGN.md.
 */
export function createRoutePolyline(
  leaflet: typeof L,
  coordinates: [number, number][],
  isFallback: boolean = false
): L.Polyline {
  if (isFallback) {
    return leaflet.polyline(coordinates, {
      color: "#C62828",
      weight: 4,
      opacity: 0.85,
      dashArray: "6, 6",
      lineJoin: "round",
      lineCap: "round",
    });
  }

  return leaflet.polyline(coordinates, {
    color: "#C62828",
    weight: 5,
    opacity: 0.9,
    lineJoin: "round",
    lineCap: "round",
  });
}

export const MapRoutingService = {
  getMultiModalRoute,
  calculateHaversineDistanceKm,
  hitungDurasiMenit,
  buatGarisLurusFallback,
  createRoutePolyline,
};

export default MapRoutingService;
