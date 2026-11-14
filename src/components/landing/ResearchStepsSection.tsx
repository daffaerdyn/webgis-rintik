"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, CheckCircle2, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

interface StepItem {
  number: string;
  title: string;
  badge: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  points: string[];
}

const RESEARCH_STEPS: StepItem[] = [
  {
    number: "01",
    title: "Tentukan Titik Usaha",
    badge: "Langkah Pertama",
    description:
      "Pilih jenis usahamu dan tandai koordinat calon ruko langsung di peta Kota Bogor.",
    imageSrc: "/img/point-location.jpg",
    imageAlt: "Tentukan Titik Lokasi Usaha di Peta Bogor",
    points: [
      "Pilih dari 5 kategori resmi industri kreatif",
      "Klik koordinat tepat pada peta interaktif",
      "Validasi batas administrasi Kota Bogor",
    ],
  },
  {
    number: "02",
    title: "Atur Radius Analisis & Kompetitor",
    badge: "Langkah Kedua",
    description:
      "Tentukan jangkauan area buffer yang ingin diteliti (misal: 250m, 500m, atau 1 km) untuk melihat sebaran kompetitor.",
    imageSrc: "/img/map-buffer.jpg",
    imageAlt: "Atur Radius Analisis Buffer dan Deteksi Kompetitor",
    points: [
      "Slider radius fleksibel dari 250m hingga 5km",
      "Visualisasi lingkaran buffer oranye real-time",
      "Deteksi otomatis UMKM sejenis di dalam zona",
    ],
  },
  {
    number: "03",
    title: "Dapatkan Insight Spasial & Keputusan Terbaik",
    badge: "Langkah Ketiga",
    description:
      "Sistem otomatis menghitung jumlah kompetitor sejenis serta jarak ke jalan utama, pemukiman, dan fasilitas publik terdekat.",
    imageSrc: "/img/map-route.jpg",
    imageAlt: "Dapatkan Insight Spasial dan Hasil Analisis Lokasi",
    points: [
      "Metrik jarak ke stasiun, sekolah, & jalan utama",
      "Ringkasan kepadatan dan potensi pasar sekitar",
      "Rekomendasi objektif pendukung keputusan sewa",
    ],
  },
];

export function ResearchStepsSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const dimOverlayRef = useRef<HTMLDivElement>(null);
  const shutterTopRef = useRef<HTMLDivElement>(null);
  const shutterBottomRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !rootRef.current) return;

      // Initial GPU-composited state (ss2):
      // Shutters are 51dvh tall and parked 100% off-screen via translate3d (yPercent),
      // avoiding layout reflow (height) so opening/closing is 100% sub-pixel smooth.
      gsap.set(shutterTopRef.current, {
        yPercent: -100,
        force3D: true,
      });
      gsap.set(shutterBottomRef.current, {
        yPercent: 100,
        force3D: true,
      });
      gsap.set(
        [
          dimOverlayRef.current,
          text1Ref.current,
          text2Ref.current,
          footerRef.current,
        ],
        {
          opacity: 0,
        }
      );
      if (footerRef.current) {
        gsap.set(footerRef.current, { pointerEvents: "none" });
      }
      if (contentWrapperRef.current) {
        gsap.set(contentWrapperRef.current, {
          filter: "blur(0px)",
        });
      }

      // Master Pinned Timeline:
      // - Long scroll distance (+=5800) so shutter movement is slow and deliberate
      // - High scrub smoothing (scrub: 1.2) so wheel/trackpad scrolling glides silkily
      //   without steps or jumps when scrolling down or back up
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "bottom bottom",
          end: "+=5800",
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });

      // ------------------------------------------------------------------
      // 1. CONTINUOUS SHUTTER GLIDE & PROGRESSIVE BLUR (t = 0 -> 8.6)
      // Using unbroken linear interpolation ("none") across the scroll range
      // so the 2 yellow divs never stop-and-start ("patah-patah") mid-scroll.
      // ------------------------------------------------------------------
      // Phase A (t = 0 -> 2.0, ss2 -> ss3): Shutters glide in to cover navbar (~22% screen)
      tl.to(
        shutterTopRef.current,
        {
          yPercent: -56,
          ease: "none",
          duration: 2.0,
        },
        0
      )
        .to(
          shutterBottomRef.current,
          {
            yPercent: 56,
            ease: "none",
            duration: 2.0,
          },
          0
        )
        // Phase B (t = 2.0 -> 7.4, ss3 -> ss4 -> ss6): Gentle, slow inward glide
        // while "Pilih lokasi tepat." (ss4) and "Wujudkan bisnis hebat." (ss6) appear
        .to(
          shutterTopRef.current,
          {
            yPercent: -16,
            ease: "none",
            duration: 5.4,
          },
          2.0
        )
        .to(
          shutterBottomRef.current,
          {
            yPercent: 16,
            ease: "none",
            duration: 5.4,
          },
          2.0
        )
        // Phase C (t = 7.4 -> 8.8, ss6 -> ss9): Shutters finish closing 100% seamlessly
        .to(
          shutterTopRef.current,
          {
            yPercent: 0,
            ease: "none",
            duration: 1.4,
          },
          7.4
        )
        .to(
          shutterBottomRef.current,
          {
            yPercent: 0,
            ease: "none",
            duration: 1.4,
          },
          7.4
        );

      // Continuous progressive blur & darkening of ResearchSteps layer (t = 0 -> 8.0)
      tl.to(
        contentWrapperRef.current,
        {
          filter: "blur(18px)",
          ease: "none",
          duration: 8.0,
        },
        0
      ).to(
        dimOverlayRef.current,
        {
          opacity: 0.78,
          ease: "none",
          duration: 8.0,
        },
        0
      );

      // ------------------------------------------------------------------
      // 2. TEXT CHOREOGRAPHY ALONG THE CONTINUOUS GLIDE
      // ------------------------------------------------------------------
      // ss4: "Pilih lokasi tepat." (fades in after ss3, holds, then fades out)
      tl.fromTo(
        text1Ref.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, ease: "power2.out", duration: 0.9 },
        2.1
      )
        .to(
          text1Ref.current,
          {
            opacity: 0,
            y: -10,
            ease: "power2.in",
            duration: 0.8,
          },
          4.1
        )

        // ss6: "Wujudkan bisnis hebat." (fades in as slit narrows further, holds, fades out)
        .fromTo(
          text2Ref.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.9 },
          5.0
        )
        .to(
          text2Ref.current,
          {
            opacity: 0,
            y: -10,
            ease: "power2.in",
            duration: 0.8,
          },
          6.9
        );

      // ------------------------------------------------------------------
      // 3. FULL-SCREEN AMBER FOOTER REVEAL (ss9, t = 8.7 -> 10.0)
      // ------------------------------------------------------------------
      tl.fromTo(
        footerRef.current,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          ease: "power2.out",
          duration: 1.1,
          onStart: () => {
            if (footerRef.current) {
              footerRef.current.style.pointerEvents = "auto";
            }
          },
          onReverseComplete: () => {
            if (footerRef.current) {
              footerRef.current.style.pointerEvents = "none";
            }
          },
        },
        8.7
      ).to({}, { duration: 0.6 }, 9.8);
    },
    { scope: rootRef }
  );

  const handleScrollTo = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    if (targetId === "beranda") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {/* ================================================================ */}
      {/* PINNED SECTION: Research Steps (01, 02, 03 + CTA Button)         */}
      {/* Normal stacking order so LandingNavbar (z-[60]) stays visible    */}
      {/* until the top yellow shutter (z-[70]) descends in ss3.           */}
      {/* ================================================================ */}
      <section
        ref={sectionRef}
        id="langkah-riset"
        className="w-full bg-bg-cream pt-20 pb-16 px-6 sm:px-10 md:px-24 border-t border-border-cream selection:bg-secondary selection:text-white"
      >
        <div
          ref={contentWrapperRef}
          style={{ willChange: "filter" }}
          className="max-w-6xl mx-auto"
        >
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-primary text-black text-xs font-bold mb-3 shadow-xs">
              Alur Riset Terarah
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-secondary leading-tight mb-4">
              Riset Lokasi dalam 3 Langkah Cepat
            </h2>
            <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
              Lakukan telaah kelayakan awal calon lokasi usaha secara sistematis
              sebelum membuat keputusan sewa ruko melalui panduan berbasis data
              spasial.
            </p>
          </div>

          {/* 3 Alternating Step Cards */}
          <div className="space-y-10">
            {RESEARCH_STEPS.map((step, index) => {
              const isEven = index % 2 === 1;

              return (
                <motion.article
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`flex flex-col ${
                    isEven ? "md:flex-row-reverse" : "md:flex-row"
                  } items-center gap-8 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-md hover:-translate-y-0.5 transition-transform duration-200`}
                >
                  {/* Image Container */}
                  <div className="relative w-full md:w-5/12 h-64 sm:h-72 rounded-2xl overflow-hidden shrink-0 border border-stone-100">
                    <Image
                      src={step.imageSrc}
                      alt={step.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 42vw"
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-secondary text-primary text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      {step.number}
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="w-full md:w-7/12 text-left">
                    <span className="text-xs font-bold text-secondary">
                      {step.badge}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-6">
                      {step.description}
                    </p>

                    {/* Bullet Highlights */}
                    <ul className="space-y-2 mb-6">
                      {step.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-700"
                        >
                          <CheckCircle2 className="w-4 h-4 text-cat-kerajinan shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* Bottom CTA to start research */}
          <div className="text-center mt-14">
            <Link
              href="/map/calon-usaha"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-secondary text-white font-bold text-sm sm:text-base shadow-lg hover:bg-brand-red-dark active:scale-95 transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Compass className="w-5 h-5" />
              <span>Mulai Riset Lokasi Usaha Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FIXED VIEWPORT OVERLAYS (GPU-composited via translate3d)         */}
      {/* ================================================================ */}

      {/* Dimming Overlay in the slit (z-[65]) */}
      <div
        ref={dimOverlayRef}
        aria-hidden="true"
        className="fixed inset-0 bg-black z-[65] opacity-0 pointer-events-none"
      />

      {/* Top Amber Shutter (z-[70] > Navbar z-[60]): fixed 51dvh height, animated via yPercent */}
      <div
        ref={shutterTopRef}
        aria-hidden="true"
        style={{ willChange: "transform" }}
        className="fixed top-0 left-0 w-full h-[51dvh] bg-primary z-[70] pointer-events-none"
      />

      {/* Bottom Amber Shutter (z-[70]): fixed 51dvh height, animated via yPercent */}
      <div
        ref={shutterBottomRef}
        aria-hidden="true"
        style={{ willChange: "transform" }}
        className="fixed bottom-0 left-0 w-full h-[51dvh] bg-primary z-[70] pointer-events-none"
      />

      {/* Central Slit Texts (z-[75]): ss4 & ss6 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[75] flex items-center justify-center pointer-events-none px-6"
      >
        {/* Text 1 (ss4): "Pilih lokasi tepat." */}
        <div
          ref={text1Ref}
          className="absolute inset-0 flex items-center justify-center opacity-0"
        >
          <h2 className="text-white text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center drop-shadow-lg select-none px-4">
            Pilih lokasi tepat.
          </h2>
        </div>

        {/* Text 2 (ss6): "Wujudkan bisnis hebat." */}
        <div
          ref={text2Ref}
          className="absolute inset-0 flex items-center justify-center opacity-0"
        >
          <h2 className="text-white text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center drop-shadow-lg select-none px-4">
            Wujudkan bisnis hebat.
          </h2>
        </div>
      </div>

      {/* Full-Screen Amber Footer (z-[80]): ss9 */}
      <footer
        ref={footerRef}
        className="fixed inset-0 z-[80] bg-primary flex flex-col items-center justify-center px-6 sm:px-10 md:px-24 py-10 sm:py-14 text-center opacity-0 pointer-events-none selection:bg-black selection:text-primary"
      >
        <div className="w-full max-w-4xl lg:max-w-5xl flex flex-col items-center justify-between h-full max-h-[600px] sm:max-h-[680px] md:max-h-[740px] lg:max-h-[800px] my-auto">
          {/* Top: Red Vertical Logo & Subtitle */}
          <div className="flex flex-col items-center">
            <Image
              src="/img/LOGO/red-vertical.png"
              alt="Logo RINTIK Merah"
              width={286}
              height={178}
              priority
              className="h-24 sm:h-32 md:h-40 lg:h-42 w-auto object-contain mx-auto mb-4 sm:mb-6 select-none"
            />
            <div className="space-y-1 sm:space-y-2">
              <p className="text-secondary font-bold text-base sm:text-xl md:text-2xl lg:text-3xl tracking-normal sm:tracking-wide text-center leading-snug sm:leading-relaxed">
                RINTIK — Ruang Informasi Titik Industri Kreatif
              </p>
              <p className="text-secondary font-bold text-base sm:text-xl md:text-2xl lg:text-3xl tracking-normal sm:tracking-wide text-center leading-snug sm:leading-relaxed">
                Kota Bogor, Jawa Barat.
              </p>
            </div>
          </div>

          {/* Middle: Black Bold Hashtag Statement */}
          <div className="my-auto py-3 sm:py-5">
            <h2 className="text-black font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-tight text-center select-none">
              #Terpetakan.
            </h2>
          </div>

          {/* Bottom: Red Navigation Links & Copyright */}
          <div className="w-full flex flex-col items-center gap-4 sm:gap-5">
            <nav
              aria-label="Navigasi Footer RINTIK"
              className="flex items-center justify-center gap-8 sm:gap-14 md:gap-16 text-xs sm:text-sm md:text-base font-extrabold text-secondary tracking-widest"
            >
              <a
                href="#beranda"
                onClick={(e) => handleScrollTo(e, "beranda")}
                className="hover:text-black transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:rounded"
              >
                BERANDA
              </a>
              <a
                href="#tentang"
                onClick={(e) => handleScrollTo(e, "tentang")}
                className="hover:text-black transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:rounded"
              >
                TENTANG
              </a>
              <a
                href="#fungsi"
                onClick={(e) => handleScrollTo(e, "fungsi")}
                className="hover:text-black transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:rounded"
              >
                FUNGSI
              </a>
            </nav>

            <p className="text-secondary font-semibold text-xs sm:text-sm tracking-wide">
              &copy; 2026 RINTIK. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
