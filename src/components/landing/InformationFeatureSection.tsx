"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon, addIcon } from "@iconify/react";

// Pre-register official Iconify icons to ensure 100% offline and instantaneous rendering
addIcon("lucide:map", {
  width: 24,
  height: 24,
  body: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0zm.894.211v15M9 3.236v15"/>`,
});

addIcon("tabler:target-arrow", {
  width: 24,
  height: 24,
  body: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="M13 3.055A9 9 0 1 0 20.941 11"/><path d="M15 6v3h3l3-3h-3V3zm0 3l-3 3"/></g>`,
});

addIcon("lucide:arrow-right", {
  width: 24,
  height: 24,
  body: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7l-7 7"/>`,
});

addIcon("lucide:arrow-up-right", {
  width: 24,
  height: 24,
  body: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M7 7h10v10M7 17L17 7"/>`,
});

interface FeatureCard {
  title: string;
  subtitle: string[];
  image: string;
  alt: string;
  href: string;
}

const JELAJAHI_CARDS: FeatureCard[] = [
  {
    title: "Cari UMKM Terdekat",
    subtitle: ["Cari UMKM", "Terdekat"],
    image: "/img/umkm/umkm-warkop.jpg",
    alt: "Cari UMKM Terdekat di Kota Bogor",
    href: "/map/pengunjung",
  },
  {
    title: "Filter Terpadu",
    subtitle: ["Filter", "Terpadu"],
    image: "/img/filter.png",
    alt: "Filter Terpadu Kategori dan Wilayah UMKM",
    href: "/map/pengunjung",
  },
  {
    title: "Panduan Rute",
    subtitle: ["Panduan", "Rute"],
    image: "/img/mark-location.jpg",
    alt: "Panduan Rute Navigasi ke Lokasi UMKM",
    href: "/map/pengunjung",
  },
];

const RISET_CARDS: FeatureCard[] = [
  {
    title: "Potensi Pasar Sekitar",
    subtitle: ["Potensi Pasar", "Sekitar"],
    image: "/img/Pemukiman.jpg",
    alt: "Analisis Potensi Pasar dan Permukiman Sekitar",
    href: "/map/calon-usaha",
  },
  {
    title: "Aksesibilitas & Mobilitas",
    subtitle: ["Aksesibilitas &", "Mobilitas"],
    image: "/img/stasiun.jpg",
    alt: "Analisis Aksesibilitas Jalan dan Transportasi Publik",
    href: "/map/calon-usaha",
  },
  {
    title: "Analisis Kompetitor",
    subtitle: ["Analisis", "Kompetitor"],
    image: "/img/competitor.jpg",
    alt: "Analisis Sebaran Kompetitor Usaha Sejenis",
    href: "/map/calon-usaha",
  },
];

export function InformationFeatureSection() {
  return (
    <section
      id="fungsi"
      className="relative w-full bg-transparent py-20 sm:py-24 lg:py-28 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-24 overflow-hidden select-none transform-gpu"
    >
      {/* Unified Centered Container with Equal Left/Right Columns & Auto-Sized Center Map */}
      <div className="relative z-10 w-full max-w-[1360px] 2xl:max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-12 lg:gap-8 xl:gap-12">
        {/* ================================================================ */}
        {/* LEFT COLUMN: JELAJAHI UMKM LOKAL (Left-aligned)                  */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-start text-left max-w-[500px] lg:max-w-none mx-auto lg:mx-0"
        >
          {/* Map Outline Icon */}
          <div className="mb-4 sm:mb-5 text-[#1E293B] inline-flex items-center justify-center rounded-2xl transition-transform duration-300 hover:scale-105">
            <Icon
              icon="lucide:map"
              className="w-12 h-12 sm:w-14 sm:h-14 text-[#1E293B]"
              aria-hidden="true"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] font-black text-secondary tracking-tight leading-[1.15] mb-3">
            JELAJAHI UMKM LOKAL
          </h2>

          {/* Pill Badge */}
          <span
            data-collide="true"
            className="inline-flex items-center px-3.5 py-1 rounded-md bg-[#F59E0B] text-[#78350F] text-xs sm:text-[13px] font-extrabold tracking-wide shadow-xs mb-4"
          >
            Eksplorasi Publik
          </span>

          {/* Subtitle / Description */}
          <p className="text-sm sm:text-[15.5px] xl:text-base font-medium text-[#7C2D12] leading-[1.65] max-w-[460px] mb-7">
            Temukan produk dan jasa industri kreatif terbaik di Kota Bogor
            dengan panduan peta interaktif.
          </p>

          {/* 3 Horizontal Feature Cards (Proportional, Interactive, High-Contrast) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[480px] mb-8">
            {JELAJAHI_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: 0.12 + idx * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={card.href}
                  aria-label={`${card.title} — Buka Peta Pengunjung`}
                  className="group relative block aspect-[1/1.05] w-full rounded-2xl overflow-hidden bg-stone-900 shadow-[0_8px_20px_-6px_rgba(120,53,15,0.18)] hover:shadow-[0_16px_28px_-6px_rgba(245,158,11,0.35)] ring-1 ring-amber-900/15 hover:ring-2 hover:ring-[#F59E0B] hover:-translate-y-1.5 transition-[transform,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 32vw, 160px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  />

                  {/* Subtle top vignette so light screenshots stay crisp against cream background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10 pointer-events-none" />

                  {/* Hover Action Badge (Top-Right) */}
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-xs text-white flex items-center justify-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-[opacity,transform] duration-200 pointer-events-none">
                    <Icon icon="lucide:arrow-up-right" className="w-3.5 h-3.5" />
                  </div>

                  {/* Golden Amber Multi-Stop Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#D97706] via-[#F59E0B]/90 to-transparent flex flex-col justify-end items-center pb-2.5 sm:pb-3 px-2 text-center pointer-events-none">
                    {card.subtitle.map((line, lineIdx) => (
                      <span
                        key={lineIdx}
                        className="block text-[11.5px] sm:text-xs xl:text-[13px] font-extrabold text-white leading-[1.2] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA Button -> /map/pengunjung */}
          <Link
            href="/map/pengunjung"
            className="group inline-flex items-center justify-center gap-2.5 px-7 py-3 sm:py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#E08A00] text-[#652B0D] font-extrabold text-xs sm:text-sm xl:text-[15px] shadow-[0_6px_16px_-3px_rgba(245,158,11,0.4)] hover:shadow-[0_10px_22px_-3px_rgba(245,158,11,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-[transform,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-[#F59E0B]"
          >
            <span>Jelajahi UMKM</span>
            <Icon
              icon="lucide:arrow-right"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </motion.div>

        {/* ================================================================ */}
        {/* CENTER COLUMN: TARGET SLOT FOR TRAVELING BOGOR YELLOW MAP        */}
        {/* Peta kuning dari StoryScrollStage bergerak (Smart Animate)       */}
        {/* turun dan mendarat presisi di slot tengah ini saat discroll.     */}
        {/* ================================================================ */}
        <div className="w-full lg:w-auto flex flex-col items-center justify-center order-first lg:order-none py-2 lg:py-0">
          <div
            id="fungsi-map-slot"
            className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-[300px] lg:h-[300px] xl:w-[360px] xl:h-[360px] 2xl:w-[380px] 2xl:h-[380px] flex items-center justify-center pointer-events-none"
          >
            {/* Soft warm ambient glow behind the Bogor map when it lands */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-6 rounded-full bg-[#FBC02D]/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: RISET LOKASI USAHA (Right-aligned)                 */}
        {/* ================================================================ */}
        <motion.div
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-end text-right max-w-[500px] lg:max-w-none mx-auto lg:mx-0"
        >
          {/* Target Arrow Icon */}
          <div className="mb-4 sm:mb-5 text-[#1E293B] inline-flex items-center justify-center rounded-2xl transition-transform duration-300 hover:scale-105">
            <Icon
              icon="tabler:target-arrow"
              className="w-12 h-12 sm:w-14 sm:h-14 text-[#1E293B]"
              aria-hidden="true"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] font-black text-secondary tracking-tight leading-[1.15] mb-3 text-right">
            RISET LOKASI USAHA
          </h2>

          {/* Pill Badge */}
          <span
            data-collide="true"
            className="inline-flex items-center px-3.5 py-1 rounded-md bg-[#F59E0B] text-[#78350F] text-xs sm:text-[13px] font-extrabold tracking-wide shadow-xs mb-4 ml-auto"
          >
            Fitur Unggulan
          </span>

          {/* Subtitle / Description */}
          <p className="text-sm sm:text-[15.5px] xl:text-base font-medium text-[#7C2D12] leading-[1.65] max-w-[460px] mb-7 text-right">
            Lakukan telaah kelayakan awal calon lokasi bisnis secara terukur
            sebelum memutuskan menyewa tempat.
          </p>

          {/* 3 Horizontal Feature Cards (Proportional, Interactive, High-Contrast) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[480px] mb-8 ml-auto">
            {RISET_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: 0.12 + idx * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={card.href}
                  aria-label={`${card.title} — Buka Peta Analisis Calon Usaha`}
                  className="group relative block aspect-[1/1.05] w-full rounded-2xl overflow-hidden bg-stone-900 shadow-[0_8px_20px_-6px_rgba(120,53,15,0.18)] hover:shadow-[0_16px_28px_-6px_rgba(245,158,11,0.35)] ring-1 ring-amber-900/15 hover:ring-2 hover:ring-[#F59E0B] hover:-translate-y-1.5 transition-[transform,box-shadow] duration-300 text-center focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 32vw, 160px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                  />

                  {/* Subtle top vignette for cohesive visual depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10 pointer-events-none" />

                  {/* Hover Action Badge (Top-Right) */}
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-xs text-white flex items-center justify-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-[opacity,transform] duration-200 pointer-events-none">
                    <Icon icon="lucide:arrow-up-right" className="w-3.5 h-3.5" />
                  </div>

                  {/* Golden Amber Multi-Stop Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#D97706] via-[#F59E0B]/90 to-transparent flex flex-col justify-end items-center pb-2.5 sm:pb-3 px-2 text-center pointer-events-none">
                    {card.subtitle.map((line, lineIdx) => (
                      <span
                        key={lineIdx}
                        className="block text-[11.5px] sm:text-xs xl:text-[13px] font-extrabold text-white leading-[1.2] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA Button -> /map/calon-usaha */}
          <Link
            href="/map/calon-usaha"
            className="group inline-flex items-center justify-center gap-2.5 px-7 py-3 sm:py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#E08A00] text-[#652B0D] font-extrabold text-xs sm:text-sm xl:text-[15px] shadow-[0_6px_16px_-3px_rgba(245,158,11,0.4)] hover:shadow-[0_10px_22px_-3px_rgba(245,158,11,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-[transform,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-[#F59E0B] ml-auto"
          >
            <span>Riset Lokasi Usaha</span>
            <Icon
              icon="lucide:arrow-right"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Export alias matching the user's typo variant
export const IinformationFeaturSection = InformationFeatureSection;
