# DESIGN.md — Locked Design System for RINTIK WebGIS

**System Status:** LOCKED (Overrides random theme dealing in `no-aiSlop` / Hallmark & `taste-skill-main`)  
**Source of Truth:** [`../../docs/uiux/landingpage/`](../../docs/uiux/landingpage/), [`../../docs/uiux/map/`](../../docs/uiux/map/), and [`../../docs/panduan desain frontend.txt`](../../docs/panduan%20desain%20frontend.txt)  
**Brand:** RINTIK — *Ruang Informasi Titik Industri Kreatif* (Kota Bogor)

---

## 1. Hallmark (`no-aiSlop`) Pre-flight & Stamp Specification

Sesuai aturan **Hallmark v2.0.0 (`no-aiSlop`)**, berkas `src/app/globals.css` wajib mengawali baris pertamanya dengan *Hallmark Stamp* dan deklarasi token `:root`:

```css
/* hallmark:v2.0.0 | shape:scroll-atlas-workbench | theme:custom (rintik-bogor-locked) | genre:editorial | hero:full-bleed-stage | signature:interactive-bogor-yellow-map-choreography */
/* critique: contrasting warm beige background (#F5F5DC) against primary golden yellow (#FBC02D), secondary crimson red (#C62828), and optional amber orange (#FF8F00) anchors both the scroll story and floating Google-Maps-style spatial workbench */
/* waive: 47b (bespoke scroll choreography & shutter transition mandated by locked UI/UX in docs/uiux/landingpage) */
/* answered: F15 (unified container width, token-bound palette, and tactile button states across landing and map routes) */
```

---

## 2. Color Tokens (`:root` & Tailwind v4 `@theme`)

Dilarang keras menulis warna literal (`#hex`, `rgb()`, `hsl()`) di luar blok `:root` pada CSS. Gunakan variabel token resmi berikut:

- **Background**: `#F5F5DC`
- **Primer (Kuning)**: `#FBC02D`
- **Sekunder (Merah)**: `#C62828`
- **Oranye (Optional / Accent)**: `#FF8F00`
- **Putih & Hitam Normal**: `#FFFFFF` & `#000000`

```css
:root {
  /* Core Palette (Locked User Specification) */
  --color-bg: #F5F5DC;            /* Background Utama (Beige / Cream) */
  --color-primary: #FBC02D;       /* Primer (Kuning RINTIK: Peta Bogor, Menu Drawer, Shutter, Footer, Badge) */
  --color-secondary: #C62828;     /* Sekunder (Merah RINTIK: Teks Tentang, Kontainer Merah, Kartu Stat, Pin Kandidat) */
  --color-orange: #FF8F00;        /* Oranye Optional (Tombol CTA Utama, Buffer, Highlight) */
  --color-white: #FFFFFF;         /* Putih Normal */
  --color-black: #000000;         /* Hitam Normal */

  /* Semantic Surface & Brand Aliases */
  --bg-cream: #F5F5DC;            /* Latar utama Landing Page & Panel Floating Peta */
  --bg-surface-white: #FFFFFF;    /* Kartu item UMKM & kontainer grafik */
  --bg-surface-black: #000000;    /* Permukaan hitam normal */
  --bg-hero-overlay: rgba(0, 0, 0, 0.45);
  --bg-shutter-dark: #000000;     /* Latar celah tengah saat transisi shutter (landingpage-5 s/d 7) */

  --brand-amber: #FBC02D;         /* Alias Primer (#FBC02D) */
  --brand-red: #C62828;           /* Alias Sekunder (#C62828) */
  --brand-red-dark: #9E1F1F;      /* Hover / border merah sekunder */
  --brand-orange: #FF8F00;        /* Alias Oranye Optional (#FF8F00) */
  --brand-orange-hover: #E68100;  /* Hover tombol oranye */

  /* Typography & Ink Colors (Putih & Hitam Normal) */
  --ink-primary: #000000;         /* Teks hitam normal */
  --ink-secondary: #333333;       /* Teks subjudul & deskripsi sekunder */
  --ink-muted: #666666;           /* Teks metadata, sumber data, & caption */
  --ink-on-dark: #FFFFFF;         /* Teks putih normal di atas hero & kontainer merah */

  /* Borders & Focus */
  --border-cream: #E2E2C4;        /* Garis tepi halus di atas background #F5F5DC */
  --border-subtle: #E5E5E5;       /* Garis pemisah tipis di dalam kartu putih */
  --focus-ring: #FF8F00;          /* Warna outline :focus-visible instan */

  /* 5 Kategori Resmi UMKM RINTIK (Sesuai Mockup Map Pengunjung & Calon UMKM) */
  --cat-kuliner: #E11D74;         /* Magenta/Pink-Red — Kuliner */
  --cat-fashion: #FF8F00;         /* Oranye (#FF8F00) — Fashion */
  --cat-jasa: #000000;            /* Hitam/Charcoal — Jasa */
  --cat-kerajinan: #2E8B3C;       /* Hijau Daun — Kerajinan */
  --cat-teknologi: #2538B8;       /* Biru Indigo/Royal — Teknologi */

  /* Map Spatial Elements */
  --map-user-blue: #2563EB;       /* Titik biru lokasi pengguna */
  --map-user-halo: rgba(37, 99, 235, 0.2);
  --map-route-red: #C62828;       /* Garis polyline rute navigasi (Sekunder) */
  --map-buffer-stroke: #FF8F00;   /* Garis putus-putus lingkaran buffer analisis (Oranye) */
  --map-buffer-fill: rgba(255, 143, 0, 0.16);

  /* Typography Families */
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 3. Aturan Implementasi Komponen

1. Semua warna kategori di `src/lib/constants.ts` wajib diselaraskan dengan token kategori di atas (`Kuliner: #E11D74`, `Fashion: #FF8F00`, `Jasa: #000000`, `Kerajinan: #2E8B3C`, `Teknologi: #2538B8`).
2. Gunakan font `Plus Jakarta Sans` dari `next/font/google` di `src/app/layout.tsx`.
3. Jangan pernah menggunakan `transition: all` atau menganimasikan `width`/`height`/`top`/`left`. Untuk progress bar grafik dan statistik, gunakan `transform: scaleX(...)` dengan `transform-origin: left`.
