"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { StoryScrollStage } from "./StoryScrollStage";
import { InformationFeatureSection } from "./InformationFeatureSection";
import { KecamatanChartSection } from "./KecamatanChartSection";
import { usePortalTarget } from "./usePortalTarget";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function StoryStageWrapper() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const backdropHost = usePortalTarget("landing-fixed-backdrop");

  useGSAP(
    () => {
      if (!backdropHost || !wrapperRef.current || !sphereRef.current) return;

      // ====================================================================
      // BACKGROUND TETAP ADA & BERGERAK PARALAKS HALUS DI VIEWPORT
      // Dipasang melalui portal di #landing-fixed-backdrop (di luar #smooth-wrapper)
      // sehingga tetap viewport-fixed sambil mendapat efek paralaks halus
      // sepanjang 3 section: StoryScrollStage -> InformationFeatureSection -> KecamatanChartSection
      // ====================================================================
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top 90%",
        end: "bottom 15%",
        onToggle: (self) => {
          if (!sphereRef.current) return;
          gsap.to(sphereRef.current, {
            autoAlpha: self.isActive ? 0.2 : 0,
            duration: 0.4,
            ease: "power1.out",
            overwrite: "auto",
          });
        },
      });

      gsap.fromTo(
        sphereRef.current,
        { y: 48, scale: 1.04 },
        {
          y: -48,
          scale: 0.98,
          ease: "none",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    },
    { scope: wrapperRef, dependencies: [backdropHost], revertOnUpdate: true }
  );

  const sphereBackdrop = (
    <div
      className="pointer-events-none select-none fixed top-[58%] -translate-y-1/2 right-0 translate-x-[40%] lg:translate-x-[42%] xl:translate-x-[45%] w-[750px] sm:w-[950px] md:w-[1150px] lg:w-[1300px] xl:w-[1450px] 2xl:w-[1600px] aspect-square z-0"
      aria-hidden="true"
    >
      <div
        ref={sphereRef}
        style={{ willChange: "transform, opacity" }}
        className="relative w-full h-full opacity-0"
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
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className="relative w-full bg-transparent"
    >
      {backdropHost ? createPortal(sphereBackdrop, backdropHost) : sphereBackdrop}

      {/* 3 Section Bertaut di Layer Atas (z-10, latar transparan) */}
      <div className="relative z-10 w-full">
        <StoryScrollStage />
        <InformationFeatureSection />
        <KecamatanChartSection />
      </div>
    </div>
  );
}
