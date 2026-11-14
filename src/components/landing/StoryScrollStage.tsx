"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  // Hindari recalculation ScrollTrigger saat address bar mobile muncul/tenggelam (menghilangkan stutter)
  ScrollTrigger.config({
    ignoreMobileResize: true,
  });
}

export function StoryScrollStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const photoLeftRef = useRef<HTMLDivElement>(null);
  const photoRightRef = useRef<HTMLDivElement>(null);
  const storyTextRef = useRef<HTMLDivElement>(null);
  const storyTextParagraphRef = useRef<HTMLParagraphElement>(null);
  const redBgRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapCarryRef = useRef<HTMLDivElement>(null);
  const mapInnerScaleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Dynamic calculation for responsive horizontal and vertical shifts
      const isMobile = () => window.innerWidth < 640;

      // Posisi Y peta di mobile: dinaikkan ke -155px sehingga tepat setengah bagian peta (125px) keluar offside di atas kotak merah
      const getInitialCenterMapY = () => (isMobile() ? -155 : 0);
      // Posisi Y teks di mobile: digeser ke bawah ke +110px agar proporsional di bawah peta
      const getInitialCenterTextY = () => (isMobile() ? 110 : 0);
      // Posisi Y kotak merah di mobile: digeser sedikit ke bawah ke +40px
      const getRedBoxY = () => (isMobile() ? 40 : 0);

      const getShiftMapX = () => {
        if (window.innerWidth >= 1200) return 380;
        if (window.innerWidth >= 1024) return 290;
        if (window.innerWidth >= 768) return 205;
        if (window.innerWidth >= 640) return 150;
        return 0; // mobile is vertically stacked
      };

      const getShiftTextX = () => {
        if (window.innerWidth >= 1200) return -250;
        if (window.innerWidth >= 1024) return -200;
        if (window.innerWidth >= 768) return -135;
        if (window.innerWidth >= 640) return -110;
        return 0; // mobile is vertically stacked
      };

      const getShiftMapY = () => (isMobile() ? -155 : 0);
      const getShiftTextY = () => (isMobile() ? 110 : 0);

      // Fungsi untuk menghitung posisi awal Y peta agar tersembunyi 100% di balik Hero
      // Peta mobile diperbesar ke 250px (halfHeight: 125px)
      const getInitialHiddenY = () => {
        const isDesk = window.innerWidth >= 768;
        const mapHalfHeight = isDesk ? 215 : isMobile() ? 125 : 135;
        return -(window.innerHeight * 0.5 + mapHalfHeight + 45);
      };

      // Kalkulasi dinamis jarak vertikal & skala menuju slot tengah InformationFeatureSection (#fungsi-map-slot)
      const getTargetDeltaY = () => {
        if (!containerRef.current) return 680;
        const stageH = containerRef.current.offsetHeight;
        const fungsiEl = document.getElementById("fungsi");
        const slotEl = document.getElementById("fungsi-map-slot");
        if (!fungsiEl || !slotEl) return stageH * 0.85;
        const fungsiRect = fungsiEl.getBoundingClientRect();
        const slotRect = slotEl.getBoundingClientRect();
        const slotCenterFromFungsiTop =
          slotRect.top - fungsiRect.top + slotRect.height * 0.5;
        return stageH * 0.5 + slotCenterFromFungsiTop;
      };

      const getTargetScale = () => {
        if (!mapRef.current) return 0.84;
        const slotEl = document.getElementById("fungsi-map-slot");
        if (!slotEl) return 0.84;
        const mapW =
          mapRef.current.offsetWidth || (window.innerWidth < 640 ? 250 : 420);
        const slotW = slotEl.offsetWidth || 350;
        return Number((slotW / mapW).toFixed(3));
      };

      // ----------------------------------------------------------------------
      // INITIAL STATE SEBELUM SCROLL
      // ----------------------------------------------------------------------
      // 1. Peta kuning bertengger di atas, tersembunyi sepenuhnya di balik Hero
      // Menggunakan xPercent: -50, yPercent: -50 agar dead center tanpa konflik Tailwind translate
      gsap.set(mapRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getInitialHiddenY(),
        scale: 1,
        opacity: 1,
      });

      // Wrapper transisi menuju section InformationFeatureSection tetap netral selama di StoryScrollStage
      gsap.set(mapCarryRef.current, {
        x: 0,
        y: 0,
      });
      gsap.set(mapInnerScaleRef.current, {
        scale: 1,
      });

      // 2. Teks cerita RINTIK berada di posisi awal yang proporsional
      // Desktop/tablet: dead center (y: 0, x: 0); Mobile: terpusat vertikal di bawah peta (y: 80)
      gsap.set(storyTextRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getInitialCenterTextY(),
        scale: 1,
        opacity: 1,
        color: "#C62828",
      });

      if (storyTextParagraphRef.current) {
        gsap.set(storyTextParagraphRef.current, {
          color: "#C62828",
        });
      }

      // 3. Foto UMKM siap di sisi kiri dan kanan (hanya desktop/tablet)
      gsap.set([photoLeftRef.current, photoRightRef.current], {
        opacity: 1,
        scale: 1,
      });

      // 4. Wadah merah disembunyikan di awal
      gsap.set(redBgRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getRedBoxY(),
        opacity: 0,
        scale: 0.97,
      });

      // ====================================================================
      // TAHAP 1: TURUNNYA PETA KUNING DARI BALIK HERO KE POSISI AWAL
      // Desktop/tablet: meluncur ke tengah (y: 0).
      // Mobile: meluncur ke slot atas (y: -85) tepat di atas teks tanpa menutupi kata-kata.
      // ====================================================================
      gsap.fromTo(
        mapRef.current,
        {
          y: getInitialHiddenY,
        },
        {
          y: getInitialCenterMapY,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "top top",
            scrub: true,
            fastScrollEnd: true,
            invalidateOnRefresh: true,
          },
        }
      );

      // ====================================================================
      // MASTER TIMELINE (PINNED SEPANJANG SS2 -> SS3 -> SS4)
      // Koreografi kontinu & mulus:
      // 1. Hold SS2: Peta kuning mantap di posisi awal, teks cerita terbaca jelas.
      // 2. Transisi SS2 -> SS3: Foto memudar keluar, teks & peta bergeser ke posisi masing-masing.
      // 3. Transisi SS3 -> SS4: Wadah merah muncul membungkus teks & peta secara proporsional.
      // 4. Hold SS4: Kartu merah stabil sebelum transisi ke section FUNGSI.
      // ====================================================================
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: () =>
            window.innerWidth < 768
              ? "+=1400"
              : window.innerWidth < 1024
              ? "+=1700"
              : "+=2200",
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: window.innerWidth < 768 ? 0.3 : 0.6,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
          onEnter: () => {
            if (mapRef.current) gsap.set(mapRef.current, { y: getInitialCenterMapY() });
            if (storyTextRef.current) gsap.set(storyTextRef.current, { y: getInitialCenterTextY() });
            if (redBgRef.current) gsap.set(redBgRef.current, { y: getRedBoxY() });
          },
          onEnterBack: () => {
            if (mapRef.current) gsap.set(mapRef.current, { y: getInitialCenterMapY() });
            if (storyTextRef.current) gsap.set(storyTextRef.current, { y: getInitialCenterTextY() });
            if (redBgRef.current) gsap.set(redBgRef.current, { y: getRedBoxY() });
          },
        },
      });

      // 1. TAHAP SS2 HOLD (0 -> 0.5):
      masterTl.to({}, { duration: 0.5 });

      // 2. TAHAP SS2 -> SS3 (0.5 -> 1.8):
      // Foto UMKM memudar, teks & peta bergerak proporsional tanpa saling menabrak
      masterTl
        .to(
          [photoLeftRef.current, photoRightRef.current],
          {
            opacity: 0,
            scale: 0.94,
            duration: 0.9,
            ease: "power1.inOut",
          },
          0.5
        )
        .to(
          storyTextRef.current,
          {
            x: getShiftTextX,
            y: getShiftTextY,
            duration: 1.3,
            ease: "power1.inOut",
          },
          0.5
        )
        .to(
          mapRef.current,
          {
            x: getShiftMapX,
            y: getShiftMapY,
            duration: 1.3,
            ease: "power1.inOut",
          },
          0.5
        );

      // 3. TAHAP SS3 -> SS4 (1.4 -> 2.4):
      // Munculnya wadah merah sekunder secara halus dan teks bertransformasi
      // warna dari merah (#C62828) ke putih (#FFFFFF) dengan blending bertahap.
      masterTl
        .to(
          redBgRef.current,
          {
            opacity: 1,
            scale: 1,
            y: getRedBoxY,
            duration: 1.0,
            ease: "power1.out",
          },
          1.4
        )
        .to(
          storyTextRef.current,
          {
            color: "#FFFFFF",
            duration: 1.0,
            ease: "power1.out",
          },
          1.4
        );

      if (storyTextParagraphRef.current) {
        masterTl.to(
          storyTextParagraphRef.current,
          {
            color: "#FFFFFF",
            duration: 1.0,
            ease: "power1.out",
          },
          1.4
        );
      }

      // 4. TAHAP SS4 HOLD (2.4 -> 3.0):
      masterTl.to({}, { duration: 0.6 }, 2.4);

      // ====================================================================
      // SETELAH SEMUA STEP STORYSCROLLSTAGE SELESAI
      // Membawa peta kuning secara presisi menuju slot tengah InformationFeatureSection (#fungsi-map-slot)
      // ====================================================================
      const toFungsiTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: () =>
            masterTl.scrollTrigger ? masterTl.scrollTrigger.end : "bottom top",
          end: () =>
            masterTl.scrollTrigger
              ? masterTl.scrollTrigger.end + getTargetDeltaY()
              : "+=700",
          scrub: window.innerWidth < 768 ? 0.3 : 0.6,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
        },
      });

      toFungsiTl
        .fromTo(
          mapCarryRef.current,
          {
            x: 0,
            y: 0,
          },
          {
            x: () => -getShiftMapX(),
            y: () => getTargetDeltaY() - getInitialCenterMapY(),
            ease: "power1.inOut",
            immediateRender: false,
          },
          0
        )
        .fromTo(
          mapInnerScaleRef.current,
          {
            scale: 1,
          },
          {
            scale: getTargetScale,
            ease: "power1.inOut",
            immediateRender: false,
          },
          0
        );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative w-full h-dvh min-h-dvh bg-transparent overflow-visible selection:bg-primary selection:text-black z-20 pointer-events-none transform-gpu will-change-transform"
    >
      {/* Anchor target for smooth navigation from Hero */}
      <div
        id="tentang"
        className="absolute top-0 left-0 w-1 h-1 pointer-events-none"
      />

      {/* Stage View Container (Always centered vertically in viewport) */}
      <div className="relative z-10 w-full h-dvh flex items-center justify-center px-4 sm:px-8 md:px-10 lg:px-20 xl:px-24">
        {/* Photo 1: Left / Top-Left (umkm-seblak.jpg) */}
        <div
          ref={photoLeftRef}
          className="absolute left-6 sm:left-10 md:left-24 top-20 sm:top-24 md:top-32 z-10 hidden sm:block w-36 h-48 sm:w-44 sm:h-56 md:w-52 md:h-64 rounded-2xl overflow-hidden shadow-xl border-2 border-white/90 bg-white select-none pointer-events-none transform-gpu will-change-transform"
        >
          <div className="relative w-full h-full">
            <Image
              src="/img/umkm/umkm-seblak.jpg"
              alt="UMKM Kuliner Kota Bogor"
              fill
              sizes="(max-width: 768px) 176px, 208px"
              className="object-cover"
            />
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 rounded-lg text-center shadow">
              Kuliner Kreatif
            </div>
          </div>
        </div>

        {/* Photo 2: Right / Bottom-Right (umkm-konter.jpg) */}
        <div
          ref={photoRightRef}
          className="absolute right-6 sm:right-10 md:right-24 bottom-12 sm:bottom-16 md:bottom-20 z-10 hidden sm:block w-36 h-48 sm:w-44 sm:h-56 md:w-52 md:h-64 rounded-2xl overflow-hidden shadow-xl border-2 border-white/90 bg-white select-none pointer-events-none transform-gpu will-change-transform"
        >
          <div className="relative w-full h-full">
            <Image
              src="/img/umkm/umkm-konter.jpg"
              alt="UMKM Jasa & Retail Kota Bogor"
              fill
              sizes="(max-width: 768px) 176px, 208px"
              className="object-cover"
            />
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 rounded-lg text-center shadow">
              Jasa &amp; Perdagangan
            </div>
          </div>
        </div>

        {/* Main Center Story Frame */}
        <div className="relative w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto flex items-center justify-center min-h-[420px] sm:min-h-[360px] md:min-h-[320px] lg:min-h-[420px]">
          {/* Red Background Box: responsif proporsional portrait di mobile, 2-kolom di tablet & desktop */}
          <div
            ref={redBgRef}
            data-collide="true"
            className="absolute left-1/2 top-1/2 z-10 w-[90%] sm:w-[94%] md:w-full max-w-[340px] sm:max-w-[580px] md:max-w-[680px] lg:max-w-5xl xl:max-w-[1260px] 2xl:max-w-[1320px] h-[390px] sm:h-[300px] md:h-[300px] lg:h-[350px] xl:h-[360px] rounded-3xl bg-secondary shadow-2xl pointer-events-none border border-white/10 opacity-0 transform-gpu will-change-transform"
          />

          {/* Unified Story Text Element - margin whitespace sangat lega (50px kiri/kanan) terhadap kotak merah */}
          <div
            ref={storyTextRef}
            className="absolute left-1/2 top-1/2 z-20 w-full max-w-[240px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[480px] xl:max-w-[640px] px-1 sm:px-3 text-left select-none pointer-events-none transform-gpu will-change-transform"
          >
            <p
              ref={storyTextParagraphRef}
              className="font-bold text-[12.5px] sm:text-[14px] md:text-[15px] lg:text-[18px] xl:text-[20px] text-inherit leading-[1.65] sm:leading-[1.58] md:leading-[1.6] lg:leading-[1.65] tracking-tight drop-shadow-sm"
            >
              RINTIK (Ruang Informasi Titik Industri Kreatif) adalah platform Web
              GIS yang memetakan persebaran UMKM di Kota Bogor, bertujuan untuk
              memudahkan masyarakat menemukan industri kreatif lokal sekaligus
              membantu pelaku usaha melakukan riset awal kelayakan lokasi bisnis
              melalui analisis geospasial yang praktis dan terukur.
            </p>
          </div>

          {/* Outer Carry Wrapper: diam (0,0) selama semua step StoryScrollStage, */}
          {/* baru bergerak turun ke tengah InformationFeatureSection setelah StoryScrollStage beres */}
          <div
            ref={mapCarryRef}
            className="absolute inset-0 z-30 pointer-events-none select-none transform-gpu will-change-transform"
          >
            {/* Yellow Bogor Map - diperbesar ke 250px dan keluar offside setengah bagian ke atas kotak merah */}
            <div
              ref={mapRef}
              data-yellow-map="true"
              className="absolute left-1/2 top-1/2 z-30 w-[250px] h-[250px] sm:w-56 sm:h-56 md:w-[270px] md:h-[270px] lg:w-[360px] lg:h-[360px] xl:w-[430px] xl:h-[430px] drop-shadow-2xl pointer-events-none select-none transform-gpu will-change-transform"
            >
              <div
                ref={mapInnerScaleRef}
                className="relative w-full h-full transform-gpu will-change-transform"
              >
                <Image
                  src="/img/map+location.png"
                  alt="Peta Kuning Kota Bogor dengan Titik Lokasi UMKM"
                  fill
                  priority
                  sizes="(max-width: 640px) 250px, (max-width: 768px) 224px, (max-width: 1024px) 270px, 430px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
