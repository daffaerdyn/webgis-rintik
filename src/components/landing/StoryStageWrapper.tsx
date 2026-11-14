"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { StoryScrollStage } from "./StoryScrollStage";
import { InformationFeatureSection } from "./InformationFeatureSection";
import { KecamatanChartSection } from "./KecamatanChartSection";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function StoryStageWrapper() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!wrapperRef.current || !sphereRef.current) return;

      // ====================================================================
      // BACKGROUND TETAP ADA & TIDAK IKUT BERGERAK (FIXED & STATIONARY)
      // Persis sesuai mockup ss ke-2:
      // - Background tetap diam (tidak ikut bergerak/scrolling) di viewport
      // - Selalu aktif dan tampak sepanjang 3 section:
      //   StoryScrollStage -> InformationFeatureSection -> KecamatanChartSection
      // - Otomatis memudar saat kembali ke Hero atau masuk ke ResearchSteps
      // ====================================================================
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top 90%",
        end: "bottom 15%",
        onToggle: (self) => {
          gsap.to(sphereRef.current, {
            autoAlpha: self.isActive ? 0.2 : 0,
            duration: 0.4,
            ease: "power1.out",
          });
        },
      });
    },
    { scope: wrapperRef }
  );

  return (
    <div
      ref={wrapperRef}
      className="relative w-full bg-bg-cream"
    >
      {/* ============================================================== */}
      {/* SATU-SATUNYA BACKGROUND TUNGGAL (FIXED, DIAM DI VIEWPORT)       */}
      {/* - Tetap ada & tidak bergerak saat discroll                    */}
      {/* - Menempel di separuh kanan layar (~50-55% terlihat di kanan) */}
      {/* - Posisi vertikal digeser agak ke bawah (top-[58%])           */}
      {/* - Transparansi tepat 20% (opacity: 0.2)                        */}
      {/* ============================================================== */}
      <div
        ref={sphereRef}
        className="pointer-events-none select-none fixed top-[58%] -translate-y-1/2 right-0 translate-x-[40%] lg:translate-x-[42%] xl:translate-x-[45%] w-[750px] sm:w-[950px] md:w-[1150px] lg:w-[1300px] xl:w-[1450px] 2xl:w-[1600px] aspect-square z-0 opacity-0 transform-gpu"
        aria-hidden="true"
      >
        <Image
          src="/img/bg-landingpage.png"
          alt="Latar Belakang Peta RINTIK Kota Bogor"
          fill
          sizes="(max-width: 1024px) 1150px, (max-width: 1440px) 1450px, 1600px"
          className="object-contain"
          priority
        />
      </div>

      {/* 3 Section Bertaut di Layer Atas (z-10, latar transparan) */}
      <div className="relative z-10 w-full">
        <StoryScrollStage />
        <InformationFeatureSection />
        <KecamatanChartSection />
      </div>
    </div>
  );
}
