"use client";

import type L from "leaflet";

/**
 * 5 Kategori Resmi UMKM RINTIK Kota Bogor sesuai DESIGN.md
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Kuliner: "#E11D74",    // Magenta/Pink-Red
  Fashion: "#FF8F00",    // Oranye
  Jasa: "#000000",       // Hitam/Charcoal
  Kerajinan: "#2E8B3C",  // Hijau Daun
  Teknologi: "#2538B8",  // Biru Indigo/Royal
};

/**
 * Normalisasi nama kategori ke warna token resmi DESIGN.md
 */
export function getCategoryColor(category?: string | null): string {
  if (!category) return CATEGORY_COLORS.Fashion;
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("kulin") || normalized.includes("makan") || normalized.includes("minum")) {
    return CATEGORY_COLORS.Kuliner;
  }
  if (normalized.includes("fash") || normalized.includes("pakaian") || normalized.includes("baju")) {
    return CATEGORY_COLORS.Fashion;
  }
  if (normalized.includes("jasa") || normalized.includes("servis") || normalized.includes("service")) {
    return CATEGORY_COLORS.Jasa;
  }
  if (normalized.includes("kera") || normalized.includes("rajin") || normalized.includes("kriya")) {
    return CATEGORY_COLORS.Kerajinan;
  }
  if (normalized.includes("tekno") || normalized.includes("digital") || normalized.includes("it")) {
    return CATEGORY_COLORS.Teknologi;
  }

  // Pencocokan langsung dengan key
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (key.toLowerCase() === normalized) return color;
  }

  return CATEGORY_COLORS.Fashion;
}

let cachedLeaflet: typeof import("leaflet") | null = null;
function getLeaflet(): typeof import("leaflet") | null {
  if (typeof window === "undefined") return null;
  if (!cachedLeaflet) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cachedLeaflet = require("leaflet");
    } catch {
      cachedLeaflet = null;
    }
  }
  return cachedLeaflet;
}

/**
 * Client-safe helper untuk memastikan Leaflet L.divIcon tersedia.
 */
function safeDivIcon(options: L.DivIconOptions): L.DivIcon {
  const leaflet = getLeaflet();
  if (leaflet && typeof leaflet.divIcon === "function") {
    return leaflet.divIcon(options);
  }
  // SSR / Node.js Mock Fallback
  return { options } as unknown as L.DivIcon;
}

const categoryPinCache: Record<string, L.DivIcon> = {};

/**
 * 1. Pin Teardrop SVG Kategori UMKM (Kuliner, Fashion, Jasa, Kerajinan, Teknologi)
 */
export function createCategoryPin(category?: string | null, isSelected: boolean = false): L.DivIcon {
  const color = getCategoryColor(category);
  const cacheKey = `${color}_${isSelected}`;
  if (categoryPinCache[cacheKey]) {
    return categoryPinCache[cacheKey];
  }

  let icon: L.DivIcon;
  if (isSelected) {
    icon = safeDivIcon({
      className: "rintik-pin-category-selected",
      html: `
        <div style="position:relative; width:32px; height:40px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
          <svg width="32" height="40" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.8"/>
            <circle cx="14" cy="14" r="5.5" fill="#FFFFFF"/>
            <circle cx="14" cy="14" r="2.8" fill="${color}"/>
          </svg>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -36],
    });
  } else {
    icon = safeDivIcon({
      className: "rintik-pin-category",
      html: `
        <div style="position:relative; width:26px; height:34px; display:flex; align-items:center; justify-content:center;">
          <svg width="26" height="34" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.2"/>
            <circle cx="14" cy="14" r="4.5" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [26, 34],
      iconAnchor: [13, 34],
      popupAnchor: [0, -30],
    });
  }

  categoryPinCache[cacheKey] = icon;
  return icon;
}

/**
 * 2. Pin Fasilitas Pendidikan / Sekolah (Lingkaran Emerald dengan ikon Toga SVG)
 */
export function createSchoolPin(): L.DivIcon {
  return safeDivIcon({
    className: "rintik-pin-school",
    html: `
      <div style="background:#059669; color:#FFFFFF; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFFFFF; box-shadow:0 2px 6px rgba(0,0,0,0.25);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * 3. Pin Lokasi Pengguna (Titik Biru dengan Pulse Halo)
 */
export function createUserDotPin(): L.DivIcon {
  return safeDivIcon({
    className: "rintik-pin-user-dot",
    html: `
      <div style="position:relative; width:24px; height:24px; display:flex; align-items:center; justify-content:center;">
        <span style="position:absolute; width:24px; height:24px; border-radius:50%; background:rgba(37,99,235,0.25);"></span>
        <span style="position:relative; width:12px; height:12px; border-radius:50%; background:#2563EB; border:2px solid #FFFFFF; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

/**
 * 4. Pin Calon Lokasi Usaha (Pin Amber dengan Ikon Toko/Store SVG)
 */
export function createCandidatePin(): L.DivIcon {
  return safeDivIcon({
    className: "rintik-pin-candidate",
    html: `
      <div style="position:relative; width:36px; height:44px; display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.32));">
        <div style="background:#FF8F00; color:#FFFFFF; width:34px; height:34px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center; border:2.5px solid #FFFFFF;">
          <div style="transform:rotate(45deg); display:flex; align-items:center; justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -40],
  });
}

const competitorPinCache: Record<string, L.DivIcon> = {};

/**
 * 5. Pin Kompetitor (Pin Kategori dengan Indikator Ring Merah & State Terpilih)
 */
export function createCompetitorPin(category?: string | null, isSelected: boolean = false): L.DivIcon {
  const color = getCategoryColor(category);
  const cacheKey = `${color}_${isSelected}`;
  if (competitorPinCache[cacheKey]) {
    return competitorPinCache[cacheKey];
  }

  let icon: L.DivIcon;
  if (isSelected) {
    icon = safeDivIcon({
      className: "rintik-pin-competitor-selected",
      html: `
        <div style="position:relative; width:40px; height:48px; display:flex; flex-direction:column; align-items:center; cursor:pointer; filter:drop-shadow(0 4px 10px rgba(198,40,40,0.55)); transform:scale(1.15);">
          <div style="position:absolute; top:-4px; width:36px; height:36px; border-radius:50%; border:2.5px solid #C62828; animation:pulse 1.5s infinite; background:rgba(198,40,40,0.15); pointer-events:none;"></div>
          <svg width="34" height="42" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
            <circle cx="14" cy="14" r="3.2" fill="#C62828"/>
          </svg>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -42],
    });
  } else {
    icon = safeDivIcon({
      className: "rintik-pin-competitor",
      html: `
        <div style="position:relative; width:32px; height:40px; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          <div style="position:absolute; top:-2px; width:30px; height:30px; border-radius:50%; border:2px dashed #C62828; pointer-events:none;"></div>
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
            <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="${color}"/>
            <circle cx="14" cy="14" r="5" fill="#FFFFFF"/>
            <circle cx="14" cy="14" r="2.5" fill="#C62828"/>
          </svg>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 38],
      popupAnchor: [0, -34],
    });
  }

  competitorPinCache[cacheKey] = icon;
  return icon;
}

export const MapCustomPins = {
  getCategoryColor,
  createCategoryPin,
  createSchoolPin,
  createUserDotPin,
  createCandidatePin,
  createCompetitorPin,
  CATEGORY_COLORS,
};

export default MapCustomPins;
