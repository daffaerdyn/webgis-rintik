"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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

interface FeatureCard {
  title: string;
  subtitle: string[];
  image: string;
  alt: string;
}

const JELAJAHI_CARDS: FeatureCard[] = [
  {
    title: "Cari UMKM Terdekat",
    subtitle: ["Cari UMKM", "Terdekat"],
    image: "/img/umkm/umkm-warkop.jpg",
    alt: "Cari UMKM Terdekat di Kota Bogor",
  },
  {
    title: "Filter Terpadu",
    subtitle: ["Filter", "Terpadu"],
    image: "/img/filter.png",
    alt: "Filter Terpadu Kategori dan Wilayah UMKM",
  },
  {
    title: "Panduan Rute",
    subtitle: ["Panduan", "Rute"],
    image: "/img/mark-location.jpg",
    alt: "Panduan Rute Navigasi ke Lokasi UMKM",
  },
];

const RISET_CARDS: FeatureCard[] = [
  {
    title: "Potensi Pasar Sekitar",
    subtitle: ["Potensi Pasar", "Sekitar"],
    image: "/img/Pemukiman.jpg",
    alt: "Analisis Potensi Pasar dan Permukiman Sekitar",
  },
  {
    title: "Aksesibilitas & Mobilitas",
    subtitle: ["Aksesibilitas &", "Mobilitas"],
    image: "/img/stasiun.jpg",
    alt: "Analisis Aksesibilitas Jalan dan Transportasi Publik",
  },
  {
    title: "Analisis Kompetitor",
    subtitle: ["Analisis", "Kompetitor"],
    image: "/img/competitor.jpg",
    alt: "Analisis Sebaran Kompetitor Usaha Sejenis",
  },
];

export function InformationFeatureSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="fungsi"
      className="relative w-full bg-transparent scroll-mt-20 py-14 sm:py-16 md:py-20 lg:py-28 px-5 sm:px-8 md:px-12 lg:px-20 xl:px-24 overflow-x-clip select-none transform-gpu"
    >
      {/* Unified Centered Container: 1 col mobile -> 2 equal cols tablet -> 3 cols desktop with center map */}
      <div className="relative z-10 w-full max-w-[1360px] 2xl:max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch lg:items-center gap-10 md:gap-8 xl:gap-12">
        {/* ================================================================ */}
        {/* LEFT COLUMN: JELAJAHI UMKM LOKAL (Left-aligned on all screens)   */}
        {/* ================================================================ */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full min-w-0 flex flex-col items-start text-left max-w-[540px] md:max-w-none mx-auto md:mx-0"
        >
          {/* Heading */}
          <h2 className="text-[1.5rem] sm:text-[1.75rem] lg:text-[28px] xl:text-[32px] font-black text-secondary tracking-tight leading-[1.18] mb-2.5 sm:mb-3 break-words min-w-0">
            JELAJAHI UMKM LOKAL
          </h2>

          {/* Pill Badge */}
          <span
            data-collide="true"
            className="inline-flex items-center px-3 py-1 rounded-md bg-amber-badge-bg text-amber-badge-ink text-xs sm:text-[13px] font-extrabold shadow-xs mb-3.5 sm:mb-4"
          >
            Eksplorasi Publik
          </span>

          {/* Subtitle / Description */}
          <p className="text-base leading-[1.6] font-medium text-amber-body-ink max-w-[460px] mb-5 sm:mb-6 lg:mb-7">
            Temukan produk dan jasa industri kreatif terbaik di Kota Bogor
            dengan panduan peta interaktif.
          </p>

          {/* 3 Horizontal Feature Cards (Proportional, Static Preview) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4 w-full max-w-[480px] mb-6 sm:mb-7 lg:mb-8">
            {JELAJAHI_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.45,
                  delay: prefersReducedMotion ? 0 : 0.08 + idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="min-w-0"
              >
                <div className="relative aspect-[1/1.08] sm:aspect-[1/1.05] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900 shadow-feature-card ring-1 ring-amber-900/15">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 30vw, (max-width: 1024px) 16vw, 160px"
                    className="object-cover"
                  />

                  {/* Subtle top vignette so light screenshots stay crisp against cream background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/15 pointer-events-none" />

                  {/* Golden Amber Multi-Stop Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-amber-card-from via-amber-badge-bg/92 to-transparent flex flex-col justify-end items-center pb-2 sm:pb-2.5 px-1.5 sm:px-2 text-center pointer-events-none">
                    {card.subtitle.map((line, lineIdx) => (
                      <span
                        key={lineIdx}
                        className="block text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-white leading-[1.18] tracking-tight drop-shadow-xs"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button -> /map/pengunjung */}
          <Link
            href="/map/pengunjung"
            className="group mt-auto lg:mt-0 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[48px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-surface-white hover:bg-brand-orange text-amber-cta-ink hover:text-white font-extrabold text-sm xl:text-[15px] border-2 border-brand-orange shadow-cta-orange hover:shadow-cta-orange-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <span>Jelajahi UMKM</span>
            <Icon
              icon="lucide:arrow-right"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Link>
        </motion.div>

        {/* Subtle structural hairline divider between pillars on mobile only (zero nested cards) */}
        <div
          aria-hidden="true"
          className="md:hidden w-full max-w-[540px] mx-auto border-t border-border-cream"
        />

        {/* ================================================================ */}
        {/* CENTER COLUMN: TARGET SLOT FOR TRAVELING BOGOR YELLOW MAP        */}
        {/* Ditampilkan pada Desktop (>= 1024px) agar simetris 3-kolom.      */}
        {/* Pada Mobile & Tablet (< 1024px), disembunyikan demi UX &         */}
        {/* keterbacaan optimal tanpa ruang kosong/redundansi peta.          */}
        {/* ================================================================ */}
        <div className="hidden lg:flex lg:w-auto flex-col items-center justify-center">
          <div
            id="fungsi-map-slot"
            className="relative lg:w-[300px] lg:h-[300px] xl:w-[360px] xl:h-[360px] 2xl:w-[380px] 2xl:h-[380px] flex items-center justify-center pointer-events-none"
          >
            {/* Soft warm ambient glow behind the Bogor map when it lands */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-6 rounded-full bg-primary/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: RISET LOKASI USAHA                                 */}
        {/* Left-aligned on Mobile & Tablet for clean shared reading edge;   */}
        {/* Right-aligned on Desktop (>= 1024px) mirroring the center map.   */}
        {/* ================================================================ */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full min-w-0 flex flex-col items-start text-left lg:items-end lg:text-right max-w-[540px] md:max-w-none mx-auto md:mx-0"
        >
          {/* Heading */}
          <h2 className="text-[1.5rem] sm:text-[1.75rem] lg:text-[28px] xl:text-[32px] font-black text-secondary tracking-tight leading-[1.18] mb-2.5 sm:mb-3 text-left lg:text-right break-words min-w-0">
            RISET LOKASI USAHA
          </h2>

          {/* Pill Badge */}
          <span
            data-collide="true"
            className="inline-flex items-center px-3 py-1 rounded-md bg-amber-badge-bg text-amber-badge-ink text-xs sm:text-[13px] font-extrabold shadow-xs mb-3.5 sm:mb-4 lg:ml-auto"
          >
            Fitur Unggulan
          </span>

          {/* Subtitle / Description */}
          <p className="text-base leading-[1.6] font-medium text-amber-body-ink max-w-[460px] mb-5 sm:mb-6 lg:mb-7 text-left lg:text-right">
            Lakukan telaah kelayakan awal calon lokasi bisnis secara terukur
            sebelum memutuskan menyewa tempat.
          </p>

          {/* 3 Horizontal Feature Cards (Proportional, Static Preview) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4 w-full max-w-[480px] mb-6 sm:mb-7 lg:mb-8 lg:ml-auto">
            {RISET_CARDS.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.45,
                  delay: prefersReducedMotion ? 0 : 0.08 + idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="min-w-0"
              >
                <div className="relative aspect-[1/1.08] sm:aspect-[1/1.05] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900 shadow-feature-card ring-1 ring-amber-900/15 text-center">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 30vw, (max-width: 1024px) 16vw, 160px"
                    className="object-cover"
                  />

                  {/* Subtle top vignette for cohesive visual depth */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/15 pointer-events-none" />

                  {/* Golden Amber Multi-Stop Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-amber-card-from via-amber-badge-bg/92 to-transparent flex flex-col justify-end items-center pb-2 sm:pb-2.5 px-1.5 sm:px-2 text-center pointer-events-none">
                    {card.subtitle.map((line, lineIdx) => (
                      <span
                        key={lineIdx}
                        className="block text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-white leading-[1.18] tracking-tight drop-shadow-xs"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button -> /map/calon-usaha */}
          <Link
            href="/map/calon-usaha"
            className="group mt-auto lg:mt-0 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[48px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-surface-white hover:bg-brand-orange text-amber-cta-ink hover:text-white font-extrabold text-sm xl:text-[15px] border-2 border-brand-orange shadow-cta-orange hover:shadow-cta-orange-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none motion-reduce:hover:transform-none lg:ml-auto"
          >
            <span>Riset Lokasi Usaha</span>
            <Icon
              icon="lucide:arrow-right"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Export alias matching the user's typo variant
export const IinformationFeaturSection = InformationFeatureSection;
