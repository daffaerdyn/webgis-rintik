"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  ScrollTrigger.config({
    ignoreMobileResize: true,
  });
}

export function StoryScrollStage() {
  const stageRootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  // Dedicated 1-wrapper = 1-timeline parallax & choreography refs
  const photoLeftEntryRef = useRef<HTMLDivElement>(null);
  const photoLeftRef = useRef<HTMLDivElement>(null);
  const photoRightEntryRef = useRef<HTMLDivElement>(null);
  const photoRightRef = useRef<HTMLDivElement>(null);

  const storyTextEntryRef = useRef<HTMLDivElement>(null);
  const storyTextShiftRef = useRef<HTMLDivElement>(null);
  const storyTextRedRef = useRef<HTMLDivElement>(null);
  const storyTextWhiteRef = useRef<HTMLDivElement>(null);

  const redBgRef = useRef<HTMLDivElement>(null);

  const mapCarryRef = useRef<HTMLDivElement>(null);
  const mapEntryRef = useRef<HTMLDivElement>(null);
  const mapShiftRef = useRef<HTMLDivElement>(null);
  const mapInnerScaleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const isMobile = () => window.innerWidth < 640;

      // Posisi Y peta di mobile: -155px agar tepat setengah bagian atas keluar di atas kotak merah
      const getInitialCenterMapY = () => (isMobile() ? -155 : 0);
      // Posisi Y teks di mobile: +110px agar proporsional di bawah peta
      const getInitialCenterTextY = () => (isMobile() ? 110 : 0);
      // Posisi Y kotak merah di mobile: +40px
      const getRedBoxY = () => (isMobile() ? 40 : 0);

      const getShiftMapX = () => {
        if (window.innerWidth >= 1200) return 380;
        if (window.innerWidth >= 1024) return 290;
        if (window.innerWidth >= 768) return 205;
        if (window.innerWidth >= 640) return 150;
        return 0;
      };

      const getShiftTextX = () => {
        if (window.innerWidth >= 1200) return -250;
        if (window.innerWidth >= 1024) return -200;
        if (window.innerWidth >= 768) return -135;
        if (window.innerWidth >= 640) return -110;
        return 0;
      };

      // Hitung posisi awal Y peta agar tersembunyi 100% di balik Hero
      const getInitialHiddenY = () => {
        const isDesk = window.innerWidth >= 768;
        const mapHalfHeight = isDesk ? 215 : isMobile() ? 125 : 135;
        return -(window.innerHeight * 0.5 + mapHalfHeight + 45);
      };

      const getMasterPinDistance = () => {
        if (window.innerWidth < 768) return "+=1300";
        if (window.innerWidth < 1024) return "+=1600";
        return "+=2050";
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
        if (!mapEntryRef.current) return 0.84;
        const slotEl = document.getElementById("fungsi-map-slot");
        if (!slotEl) return 0.84;
        const mapW =
          mapEntryRef.current.offsetWidth ||
          (window.innerWidth < 640 ? 250 : 420);
        const slotW = slotEl.offsetWidth || 350;
        return Number((slotW / mapW).toFixed(3));
      };

      // ====================================================================
      // SMOOTH MULTI-PLANE PARALLAX + PINNED CHOREOGRAPHY
      // Setiap timeline hanya mengontrol wrapper miliknya sendiri sehingga
      // tidak ada rebutan properti atau lonjakan ("patah-patah") antar tahap.
      // ====================================================================
      // Initial GPU-composited states
      gsap.set(mapEntryRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getInitialHiddenY(),
        scale: 0.92,
        opacity: 1,
        force3D: true,
      });
      gsap.set(mapShiftRef.current, { x: 0, y: 0, force3D: true });
      gsap.set(mapCarryRef.current, { x: 0, y: 0, force3D: true });
      gsap.set(mapInnerScaleRef.current, { scale: 1, force3D: true });

      gsap.set(storyTextEntryRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getInitialCenterTextY() + 34,
        opacity: 0.85,
        force3D: true,
      });
      gsap.set(storyTextShiftRef.current, { x: 0, y: 0, force3D: true });
      gsap.set(storyTextRedRef.current, { opacity: 1 });
      gsap.set(storyTextWhiteRef.current, { opacity: 0 });

      gsap.set(photoLeftEntryRef.current, {
        y: 80,
        scale: 0.94,
        rotation: -1.5,
        force3D: true,
      });
      gsap.set(photoRightEntryRef.current, {
        y: 145,
        scale: 0.93,
        rotation: 1.5,
        force3D: true,
      });
      gsap.set([photoLeftRef.current, photoRightRef.current], {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        force3D: true,
      });

      gsap.set(redBgRef.current, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: getRedBoxY(),
        opacity: 0,
        scale: 0.95,
        force3D: true,
      });

      // ------------------------------------------------------------------
      // TAHAP 1: MULTI-PLANE PARALLAX ENTRY (Hero -> Stage 2)
      // Foto kiri, foto kanan, teks tengah, & peta kuning meluncur di
      // kedalaman paralaks berbeda hingga tepat sejajar di "top top".
      // ------------------------------------------------------------------
      const entryTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      entryTl
        .fromTo(
          mapEntryRef.current,
          { y: getInitialHiddenY, scale: 0.92 },
          {
            y: getInitialCenterMapY,
            scale: 1,
            ease: "none",
            duration: 1,
          },
          0
        )
        .fromTo(
          photoLeftEntryRef.current,
          { y: 80, scale: 0.94, rotation: -1.5 },
          {
            y: 0,
            scale: 1,
            rotation: 0,
            ease: "none",
            duration: 1,
          },
          0
        )
        .fromTo(
          photoRightEntryRef.current,
          { y: 145, scale: 0.93, rotation: 1.5 },
          {
            y: 0,
            scale: 1,
            rotation: 0,
            ease: "none",
            duration: 1,
          },
          0
        )
        .fromTo(
          storyTextEntryRef.current,
          {
            y: () => getInitialCenterTextY() + 34,
            opacity: 0.85,
          },
          {
            y: getInitialCenterTextY,
            opacity: 1,
            ease: "none",
            duration: 1,
          },
          0
        );

      // ------------------------------------------------------------------
      // TAHAP 2 -> 4: MASTER PINNED TIMELINE (SS2 -> SS3 -> SS4)
      // Scrub: true disinkronkan mulus oleh ScrollSmoother tanpa double-lag
      // dan tanpa dead-zone freeze di awal pin.
      // ------------------------------------------------------------------
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: getMasterPinDistance,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // Respon mikro paralaks langsung saat pin dimulai (t = 0 -> 0.25)
      masterTl
        .to(
          photoLeftRef.current,
          { y: -10, duration: 0.25, ease: "none" },
          0
        )
        .to(
          photoRightRef.current,
          { y: 10, duration: 0.25, ease: "none" },
          0
        );

      // SS2 -> SS3 (t = 0.2 -> 1.65): Foto memudar dengan pemisahan paralaks,
      // teks & peta bergeser ke kiri dan kanan
      masterTl
        .to(
          photoLeftRef.current,
          {
            x: -36,
            y: -56,
            opacity: 0,
            scale: 0.91,
            duration: 1.0,
            ease: "power1.inOut",
          },
          0.2
        )
        .to(
          photoRightRef.current,
          {
            x: 36,
            y: 56,
            opacity: 0,
            scale: 0.91,
            duration: 1.0,
            ease: "power1.inOut",
          },
          0.2
        )
        .to(
          storyTextShiftRef.current,
          {
            x: getShiftTextX,
            duration: 1.4,
            ease: "sine.inOut",
          },
          0.25
        )
        .to(
          mapShiftRef.current,
          {
            x: getShiftMapX,
            duration: 1.4,
            ease: "sine.inOut",
          },
          0.25
        );

      // SS3 -> SS4 (t = 1.25 -> 2.35): Kontainer merah masuk & teks
      // crossfade GPU-only dari merah ke putih tanpa repaint CPU
      masterTl
        .fromTo(
          redBgRef.current,
          { y: getRedBoxY, opacity: 0, scale: 0.95 },
          {
            y: getRedBoxY,
            opacity: 1,
            scale: 1,
            duration: 1.1,
            ease: "power2.out",
          },
          1.25
        )
        .to(
          storyTextRedRef.current,
          {
            opacity: 0,
            duration: 0.95,
            ease: "power1.out",
          },
          1.3
        )
        .to(
          storyTextWhiteRef.current,
          {
            opacity: 1,
            duration: 0.95,
            ease: "power1.out",
          },
          1.3
        )
        // SS4 hold singkat (2.35 -> 2.7)
        .to({}, { duration: 0.35 }, 2.35);

      // ------------------------------------------------------------------
      // TAHAP LANJUTAN (DESKTOP >= 1024px): TRANSFER PETA KE #fungsi
      // y linear ("none") mengimbangi scroll keluar section 1:1 tanpa
      // tersendat; x & scale meluncur melengkung mulus ke #fungsi-map-slot.
      // ------------------------------------------------------------------
      const desktopMm = gsap.matchMedia();
      desktopMm.add("(min-width: 1024px)", () => {
        const toFungsiTl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: () =>
              masterTl.scrollTrigger
                ? masterTl.scrollTrigger.end
                : "bottom top",
            end: () =>
              masterTl.scrollTrigger
                ? masterTl.scrollTrigger.end + getTargetDeltaY()
                : "+=700",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        toFungsiTl
          .fromTo(
            mapCarryRef.current,
            { y: 0 },
            {
              y: () => getTargetDeltaY() - getInitialCenterMapY(),
              ease: "none",
              immediateRender: false,
            },
            0
          )
          .fromTo(
            mapCarryRef.current,
            { x: 0 },
            {
              x: () => -getShiftMapX(),
              ease: "sine.inOut",
              immediateRender: false,
            },
            0
          )
          .fromTo(
            mapInnerScaleRef.current,
            { scale: 1 },
            {
              scale: getTargetScale,
              ease: "sine.inOut",
              immediateRender: false,
            },
            0
          );

        return () => {
          gsap.set(mapCarryRef.current, { x: 0, y: 0 });
          gsap.set(mapInnerScaleRef.current, { scale: 1 });
        };
      });

      return () => {
        desktopMm.revert();
      };
    },
    { scope: stageRootRef }
  );

  return (
    <div ref={stageRootRef} className="relative w-full">
      {/* Anchor target di luar elemen yang di-pin agar klik #tentang selalu akurat */}
      <div
        id="tentang"
        className="absolute top-0 left-0 w-1 h-1 pointer-events-none"
        aria-hidden="true"
      />

      {/* CATATAN: Jangan pasang transform-gpu / will-change-transform pada elemen pin (containerRef) */}
      <section
        ref={containerRef}
        className="relative w-full h-dvh min-h-dvh bg-transparent overflow-visible selection:bg-primary selection:text-black z-20 pointer-events-none"
      >
        {/* Stage View Container (Always centered vertically in viewport) */}
        <div className="relative z-10 w-full h-dvh flex items-center justify-center px-4 sm:px-8 md:px-10 lg:px-20 xl:px-24">
          {/* Photo 1: Left / Top-Left (umkm-seblak.jpg) */}
          <div
            ref={photoLeftEntryRef}
            style={{ willChange: "transform" }}
            className="absolute left-6 sm:left-10 md:left-24 top-20 sm:top-24 md:top-32 z-10 hidden sm:block select-none pointer-events-none"
          >
            <div
              ref={photoLeftRef}
              style={{ willChange: "transform, opacity" }}
              className="w-36 h-48 sm:w-44 sm:h-56 md:w-52 md:h-64 rounded-2xl overflow-hidden shadow-xl border-2 border-white/90 bg-white"
            >
              <div className="relative w-full h-full">
                <Image
                  src="/img/umkm/umkm-seblak.jpg"
                  alt="UMKM Kuliner Kota Bogor"
                  fill
                  sizes="(max-width: 768px) 176px, 208px"
                  className="object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/85 text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 rounded-lg text-center shadow">
                  Kuliner Kreatif
                </div>
              </div>
            </div>
          </div>

          {/* Photo 2: Right / Bottom-Right (umkm-konter.jpg) */}
          <div
            ref={photoRightEntryRef}
            style={{ willChange: "transform" }}
            className="absolute right-6 sm:right-10 md:right-24 bottom-12 sm:bottom-16 md:bottom-20 z-10 hidden sm:block select-none pointer-events-none"
          >
            <div
              ref={photoRightRef}
              style={{ willChange: "transform, opacity" }}
              className="w-36 h-48 sm:w-44 sm:h-56 md:w-52 md:h-64 rounded-2xl overflow-hidden shadow-xl border-2 border-white/90 bg-white"
            >
              <div className="relative w-full h-full">
                <Image
                  src="/img/umkm/umkm-konter.jpg"
                  alt="UMKM Jasa & Retail Kota Bogor"
                  fill
                  sizes="(max-width: 768px) 176px, 208px"
                  className="object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/85 text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 rounded-lg text-center shadow">
                  Jasa &amp; Perdagangan
                </div>
              </div>
            </div>
          </div>

          {/* Main Center Story Frame */}
          <div className="relative w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto flex items-center justify-center min-h-[420px] sm:min-h-[360px] md:min-h-[320px] lg:min-h-[420px]">
            {/* Red Background Box */}
            <div
              ref={redBgRef}
              data-collide="true"
              style={{ willChange: "transform, opacity" }}
              className="absolute left-1/2 top-1/2 z-10 w-[90%] sm:w-[94%] md:w-full max-w-[340px] sm:max-w-[580px] md:max-w-[680px] lg:max-w-5xl xl:max-w-[1260px] 2xl:max-w-[1320px] h-[390px] sm:h-[300px] md:h-[300px] lg:h-[350px] xl:h-[360px] rounded-3xl bg-secondary shadow-2xl pointer-events-none border border-white/10 opacity-0"
            />

            {/* Unified Story Text Element (GPU-only opacity crossfade merah -> putih) */}
            <div
              ref={storyTextEntryRef}
              style={{ willChange: "transform, opacity" }}
              className="absolute left-1/2 top-1/2 z-20 w-full max-w-[240px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[480px] xl:max-w-[640px] px-1 sm:px-3 text-left select-none pointer-events-none"
            >
              <div
                ref={storyTextShiftRef}
                style={{ willChange: "transform" }}
                className="relative w-full"
              >
                {/* Layer Merah (Tahap 2 -> 3) */}
                <div
                  ref={storyTextRedRef}
                  style={{ willChange: "opacity" }}
                  className="relative w-full text-secondary"
                >
                  <h2 className="font-extrabold text-[19px] sm:text-[22px] md:text-[26px] lg:text-[32px] xl:text-[36px] text-inherit leading-[1.18] sm:leading-[1.2] tracking-tight mb-2 sm:mb-3 md:mb-3.5">
                    Tentang RINTIK
                  </h2>
                  <p className="font-bold text-[12px] sm:text-[13.5px] md:text-[14.5px] lg:text-[17px] xl:text-[19px] text-inherit leading-[1.62] sm:leading-[1.58] md:leading-[1.6] lg:leading-[1.65] tracking-tight opacity-95">
                    RINTIK (Ruang Informasi Titik Industri Kreatif) adalah platform Web
                    GIS yang memetakan persebaran UMKM di Kota Bogor, bertujuan untuk
                    memudahkan masyarakat menemukan industri kreatif lokal sekaligus
                    membantu pelaku usaha melakukan riset awal kelayakan lokasi bisnis
                    melalui analisis geospasial yang praktis dan terukur.
                  </p>
                </div>

                {/* Layer Putih (Tahap 4 di atas kartu merah, GPU opacity only) */}
                <div
                  ref={storyTextWhiteRef}
                  aria-hidden="true"
                  style={{ willChange: "opacity" }}
                  className="absolute inset-0 w-full text-white opacity-0"
                >
                  <h2 className="font-extrabold text-[19px] sm:text-[22px] md:text-[26px] lg:text-[32px] xl:text-[36px] text-inherit leading-[1.18] sm:leading-[1.2] tracking-tight mb-2 sm:mb-3 md:mb-3.5">
                    Tentang RINTIK
                  </h2>
                  <p className="font-bold text-[12px] sm:text-[13.5px] md:text-[14.5px] lg:text-[17px] xl:text-[19px] text-inherit leading-[1.62] sm:leading-[1.58] md:leading-[1.6] lg:leading-[1.65] tracking-tight opacity-95">
                    RINTIK (Ruang Informasi Titik Industri Kreatif) adalah platform Web
                    GIS yang memetakan persebaran UMKM di Kota Bogor, bertujuan untuk
                    memudahkan masyarakat menemukan industri kreatif lokal sekaligus
                    membantu pelaku usaha melakukan riset awal kelayakan lokasi bisnis
                    melalui analisis geospasial yang praktis dan terukur.
                  </p>
                </div>
              </div>
            </div>

            {/* Outer Carry Wrapper: diam selama StoryScrollStage, lalu meluncur ke #fungsi */}
            <div
              ref={mapCarryRef}
              style={{ willChange: "transform" }}
              className="absolute inset-0 z-30 pointer-events-none select-none"
            >
              {/* Entry Parallax Wrapper */}
              <div
                ref={mapEntryRef}
                data-yellow-map="true"
                style={{ willChange: "transform" }}
                className="absolute left-1/2 top-1/2 z-30 w-[250px] h-[250px] sm:w-56 sm:h-56 md:w-[270px] md:h-[270px] lg:w-[360px] lg:h-[360px] xl:w-[430px] xl:h-[430px] pointer-events-none select-none"
              >
                {/* Master Pin Shift Wrapper */}
                <div
                  ref={mapShiftRef}
                  style={{ willChange: "transform" }}
                  className="relative w-full h-full"
                >
                  {/* Scale Transfer Wrapper */}
                  <div
                    ref={mapInnerScaleRef}
                    style={{ willChange: "transform" }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src="/img/map+location.png"
                      alt="Peta Kuning Kota Bogor dengan Titik Lokasi UMKM"
                      fill
                      priority
                      sizes="(max-width: 640px) 250px, (max-width: 768px) 224px, (max-width: 1024px) 270px, 430px"
                      className="object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
