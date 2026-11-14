<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RINTIK WebGIS Frontend & Fullstack Agent Rules (`rintik-app/webgis-rintik`)

Aplikasi ini adalah implementasi utama **RINTIK (Ruang Informasi Titik Industri Kreatif)** menggunakan **Next.js 16.4.3 (App Router)**, **React 19.3.0**, **TypeScript 5**, **Tailwind CSS v4**, **Leaflet + React-Leaflet**, dan **Supabase PostGIS**.

---

## 1. Aturan Utama & Larangan Keras

1. **Kepatuhan Mutlak pada UI/UX (`../../docs/uiux/`) & Panduan Desain (`../../docs/panduan desain frontend.txt`)**:
   - **DILARANG** membuat desain atau layout di luar mockup yang ada pada `../../docs/uiux/landingpage/` dan `../../docs/uiux/map/`.
   - Setiap tombol **`Riset Lokasi Usaha`** di Landing Page wajib mengarah ke `/map/calon-usaha`.
   - Setiap tombol **`Jelajahi UMKM`** di Landing Page wajib mengarah ke `/map/pengunjung`.
   - Semua pop-up, filter, statistik, radius, dan layer pada peta wajib menerapkan perilaku **toggleable** (klik tombol A → tampilkan informasi A; klik tombol A lagi → sembunyikan informasi A).
2. **Kepatuhan Mutlak pada Skill `no-aiSlop` (`../../.agents/skills/no-aiSlop/SKILL.md`)**:
   - Wajib mematuhi [`../../DESIGN.md`](../../DESIGN.md) dan [`./DESIGN.md`](./DESIGN.md).
   - Semua warna dan jenis huruf wajib didefinisikan pada `:root` / `@theme` di `src/app/globals.css`. Tidak boleh ada warna hex atau `font-family` liar di luar blok token.
   - Baris pertama `src/app/globals.css` wajib memuat *Hallmark Stamp* beserta deklarasi `waive` untuk sistem desain kustom RINTIK.
   - Jangan pernah menggunakan `transition: all` atau menganimasikan `width`, `height`, `top`, `left`. Gunakan `transform` (`translate3d`, `scaleX`, `scaleY`) dan `opacity`.
   - Wajib menggunakan `overflow-x: clip` pada `html` dan `body` di halaman Landing Page, serta menyediakan fallback `prefers-reduced-motion: reduce`.
3. **Penggunaan Aset Resmi (`../../docs/img/`)**:
   - Seluruh gambar yang ditampilkan pada UI wajib berasal dari `../../docs/img/` yang disalin ke `public/img/`.

---

## 2. Integrasi 4 Skill Utama di Dalam `rintik-app/webgis-rintik`

1. **`gsap-skills-main` (`../../.agents/skills/gsap-skills-main/`)**:
   - Gunakan `gsap`, `@gsap/react` (`useGSAP`), dan `gsap/ScrollTrigger` untuk koreografi scroll Landing Page (`src/app/page.tsx` dan komponen di `src/components/landing/`).
   - Selalu daftarkan plugin di sisi klien: `gsap.registerPlugin(useGSAP, ScrollTrigger)`.
   - Gunakan `useGSAP(() => { ... }, { scope: containerRef })` agar seluruh tween dan ScrollTrigger otomatis dibersihkan (*revert*) saat komponen *unmount*.
   - Gunakan **Framer Motion (`framer-motion`)** untuk animasi progress bar grafik kecamatan (mengisi dari `0` ke penuh) dan animasi section *Langkah Riset*.
2. **`no-aiSlop` (`../../.agents/skills/no-aiSlop/`)**:
   - Jalankan linter anti-slop (`node ../../.agents/skills/no-aiSlop/scripts/sloplint.mjs`) untuk memastikan tidak ada pola AI-slop.
3. **`taste-skill-main` (`../../.agents/skills/taste-skill-main/`)**:
   - Terapkan standar tipografi `Plus Jakarta Sans`, batas kiri-kanan kontainer yang sejajar, dan mikro-interaksi hover yang halus.
4. **`mcp-google-map-main` (`../../.agents/skills/mcp-google-map-main/`)**:
   - Terapkan prinsip interaksi Google Maps pada `/map/pengunjung` dan `/map/calon-usaha`: kanvas peta 100% layar (`100dvh`), kontrol mengambang (*floating pills*), panel kiri/kanan yang dapat dibuka-tutup (*toggleable*), rute multi-moda (`Motor`, `Mobil`, `Jalan kaki`), serta atribusi sumber data yang jelas.

---

## 3. Struktur Direktori Target (`src/`)

```text
src/
├── app/
│   ├── globals.css                  # Hallmark stamp + :root design tokens + Tailwind v4
│   ├── layout.tsx                   # Plus Jakarta Sans font + metadata RINTIK
│   ├── page.tsx                     # Landing Page RINTIK (8-stage scroll choreography + fixed menu)
│   ├── map/
│   │   ├── pengunjung/
│   │   │   └── page.tsx             # Halaman Map Pengunjung (Eksplorasi, Filter, Statistik, Rute)
│   │   └── calon-usaha/
│   │       └── page.tsx             # Halaman Map Calon UMKM (3-Step Guided Flow & Spatial Analysis)
│   └── api/                         # Backend Route Handlers (JANGAN RUSAK KONTRAK API INI)
│       ├── analysis/buffer/route.ts
│       ├── analysis/location/route.ts
│       ├── layers/jalan/route.ts
│       ├── layers/poi/route.ts
│       ├── layers/sekolah/route.ts
│       ├── layers/wilayah/route.ts
│       ├── routing/route.ts
│       ├── umkm/route.ts
│       ├── umkm/[id]/route.ts
│       ├── umkm/map/route.ts
│       ├── umkm/nearby/route.ts
│       └── umkm/statistics/route.ts
├── components/
│   ├── landing/                     # Komponen modular Landing Page (Hero, AboutMap, Fungsi, Grafik, Langkah, ShutterFooter, MenuOverlay)
│   └── map/                         # Komponen Peta hasil migrasi map-rintik + integrasi API
│       ├── VisitorMapCanvas.tsx     # Leaflet canvas untuk Map Pengunjung (SSR false)
│       ├── CandidateMapCanvas.tsx   # Leaflet canvas untuk Map Calon Usaha (SSR false)
│       ├── MapCustomPins.ts         # Custom SVG Pin & School/POI Pin dari map-rintik
│       └── ...                      # Floating Pill Bars, Toggleable Panels, Onboarding Tooltips
└── lib/
    ├── constants.ts                 # Kategori warna, daftar 6 Kecamatan & 68 Kelurahan Kota Bogor
    └── supabase.ts                  # Klien Supabase
```

---

## 4. Kontrak API Backend yang Sudah Tersedia

Gunakan endpoint internal berikut untuk menyuplai data ke peta dan panel UI:

- `GET /api/umkm/map?min_lng=106.70&min_lat=-6.68&max_lng=106.88&max_lat=-6.50[&kategori=...&kecamatan=...&kelurahan=...&search=...&latitude=...&longitude=...&radius=...]`
- `GET /api/umkm?page=1[&kategori=...&kecamatan=...&kelurahan=...&search=...&latitude=...&longitude=...&radius=...&sort=...]`
- `GET /api/umkm/[id]`
- `GET /api/umkm/nearby?latitude=...&longitude=...&limit=10[&kategori=...]`
- `GET /api/umkm/statistics[?kategori=...&kecamatan=...&kelurahan=...]`
- `GET /api/routing?latitude=...&longitude=...&id_umkm=...&mode=motor|mobil|jalan_kaki`
- `POST /api/analysis/location` (body: `{ latitude, longitude, radius, kategori }`)
- `GET /api/layers/wilayah`
- `GET /api/layers/jalan?min_lng=...&min_lat=...&max_lng=...&max_lat=...`
- `GET /api/layers/sekolah?min_lng=...&min_lat=...&max_lng=...&max_lat=...`
- `GET /api/layers/poi?min_lng=...&min_lat=...&max_lng=...&max_lat=...`
- Fallback GeoJSON statis di `public/data/` (hasil migrasi `map-rintik/rintik-webgis/data/`) untuk layer `permukiman` dan ketahanan offline.
