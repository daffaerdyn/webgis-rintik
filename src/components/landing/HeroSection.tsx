"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

// Desktop Carousel Photography (>= 1024px / lg)
const DESKTOP_CAROUSEL_IMAGES = [
  {
    src: "/img/umkm/carousel/carousel1.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 1 (Desktop)",
  },
  {
    src: "/img/umkm/carousel/carousel2.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 2 (Desktop)",
  },
  {
    src: "/img/umkm/carousel/carousel3.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 3 (Desktop)",
  },
  {
    src: "/img/umkm/carousel/carousel4.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 4 (Desktop)",
  },
  {
    src: "/img/umkm/carousel/carousel5.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 5 (Desktop)",
  },
];

// Mobile & Tablet Carousel Photography (< 1024px, file MT_carousel1-5.jpg)
const MOBILE_TABLET_CAROUSEL_IMAGES = [
  {
    src: "/img/umkm/carousel/MT_carousel1.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 1 (Mobile & Tablet)",
  },
  {
    src: "/img/umkm/carousel/MT_carousel2.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 2 (Mobile & Tablet)",
  },
  {
    src: "/img/umkm/carousel/MT_carousel3.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 3 (Mobile & Tablet)",
  },
  {
    src: "/img/umkm/carousel/MT_carousel4.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 4 (Mobile & Tablet)",
  },
  {
    src: "/img/umkm/carousel/MT_carousel5.jpg",
    alt: "UMKM Industri Kreatif Kota Bogor - Carousel 5 (Mobile & Tablet)",
  },
];

interface HeroSectionProps {
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

export function HeroSection({}: HeroSectionProps = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play carousel smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DESKTOP_CAROUSEL_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="beranda"
      className="relative z-30 min-h-dvh w-full flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-24 py-4 md:py-6 overflow-hidden bg-black text-left"
    >
      {/* Background Carousel with Smooth Fade & Real Bogor UMKM Photography */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Desktop Carousel (Screen >= 1024px / lg) */}
        <div className="hidden lg:block absolute inset-0">
          {DESKTOP_CAROUSEL_IMAGES.map((item, idx) => (
            <div
              key={item.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Mobile & Tablet Carousel (Screen < 1024px, file awalan MT_carousel1-5) */}
        <div className="block lg:hidden absolute inset-0">
          {MOBILE_TABLET_CAROUSEL_IMAGES.map((item, idx) => (
            <div
              key={item.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                priority={idx === 0}
                sizes="(max-width: 1023px) 100vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Soft Vignette Overlay: slightly darker at bottom & left for sharp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/50" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Top Spacer Row (Logo & Navigation Toggle are fixed persistently by LandingNavbar at z-[60]) */}
      <div
        className="relative z-20 w-full h-16 sm:h-20 md:h-24 lg:h-28 pointer-events-none"
        aria-hidden="true"
      />

      {/* Hero Bottom Body: Left-aligned layout matching mockup with calibrated responsive scales */}
      <main className="relative z-10 w-full max-w-7xl pb-4 sm:pb-6 md:pb-8 lg:pb-6 pt-12 sm:pt-16 md:pt-20 flex flex-col items-start text-left mt-auto">
        {/* Outline Peta Kota Bogor (Ukuran proporsional mobile: w-11, tablet: w-16, desktop: w-20) */}
        <div className="mb-2.5 sm:mb-3 md:mb-4 select-none pointer-events-none">
          <Image
            src="/img/map-outline.png"
            alt="Outline Peta Wilayah Kota Bogor"
            width={64}
            height={78}
            priority
            className="w-11 sm:w-13 md:w-16 lg:w-20 h-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Title: Clean, Bold, Left-Aligned with fluid typographic hierarchy */}
        <h1 className="text-[1.65rem] sm:text-3xl md:text-[2.25rem] lg:text-[2.65rem] font-bold text-white tracking-tight leading-[1.2] sm:leading-[1.22] md:leading-[1.2] mb-3 sm:mb-3.5 md:mb-4 text-left max-w-none w-full drop-shadow-md">
          Pemetaan &amp; Analisis Spasial Industri Kreatif Kota Bogor
        </h1>

        {/* Subtitle Description: optimal reading measure and high legibility */}
        <p className="text-[0.9375rem] sm:text-base md:text-[1.0625rem] lg:text-lg text-white/90 sm:text-white/95 max-w-xl md:max-w-2xl lg:max-w-3xl mb-6 sm:mb-7 md:mb-8 leading-relaxed font-normal text-left drop-shadow">
          Temukan UMKM kreatif lokal terdekat atau lakukan riset calon lokasi usaha berbasis data spasial secara praktis
        </p>

        {/* Dual Call-To-Action Buttons: Equal flex balance on mobile, auto-fit on tablet & desktop */}
        <div className="flex flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Primary CTA: Solid Orange Button "Riset Lokasi Usaha" */}
          <Link
            href="/map/calon-usaha"
            className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center min-h-[44px] sm:min-h-[48px] px-4 sm:px-7 py-2.5 sm:py-3 rounded-lg bg-[#FF8F00] hover:bg-[#FFA000] text-black font-semibold text-[13px] sm:text-base border border-[#FF8F00] hover:border-[#FFA000] shadow-[0_4px_14px_0_rgba(255,143,0,0.30)] hover:shadow-[0_8px_24px_0_rgba(255,143,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8F00] motion-reduce:transition-none motion-reduce:hover:transform-none text-center"
          >
            <span>Riset Lokasi Usaha</span>
          </Link>

          {/* Secondary CTA: Semi-transparent Outline Orange Button "Jelajahi UMKM" */}
          <Link
            href="/map/pengunjung"
            className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center min-h-[44px] sm:min-h-[48px] px-4 sm:px-7 py-2.5 sm:py-3 rounded-lg bg-black/45 hover:bg-[#FF8F00] text-white hover:text-black font-semibold text-[13px] sm:text-base border-2 border-[#FF8F00] backdrop-blur-md shadow-[0_4px_14px_0_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_0_rgba(255,143,0,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:transform-none text-center"
          >
            <span>Jelajahi UMKM</span>
          </Link>
        </div>
      </main>

      {/* Bottom Scroll Indicator centered with continuous lightweight bounce animation */}
      <footer className="relative z-10 w-full flex justify-center pb-2 pt-2 sm:pb-3 sm:pt-3 md:pb-4">
        <motion.a
          href="#tentang"
          aria-label="Scroll menuju bagian Tentang Kami"
          animate={{
            y: [0, 6, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-flex flex-col items-center gap-1 text-white/90 hover:text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary drop-shadow cursor-pointer select-none min-h-[44px] min-w-[44px] justify-center"
        >
          <span className="text-[11px] sm:text-xs font-medium tracking-wide">
            Scroll
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white/90" />
        </motion.a>
      </footer>
    </section>
  );
}
