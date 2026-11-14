"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface SplitLogoProps {
  isMenuOpen?: boolean;
  onLogoClick?: () => void;
  className?: string;
}

function isRectOverlapping(r1: DOMRect, r2: DOMRect): boolean {
  return !(
    r2.bottom <= r1.top ||
    r2.top >= r1.bottom ||
    r2.right <= r1.left ||
    r2.left >= r1.right
  );
}

export function SplitLogo({
  isMenuOpen = false,
  onLogoClick,
  className = "w-28 sm:w-32 md:w-36",
}: SplitLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [logoState, setLogoState] = useState<{
    mode: "all-white" | "all-red" | "split";
    splitY: number | null;
  }>({
    mode: "all-white",
    splitY: null,
  });

  useEffect(() => {
    let animationFrameId: number;

    const evaluateContrast = () => {
      // 1. If menu drawer is open, background is bright primary yellow -> always Red logo
      if (isMenuOpen) {
        setLogoState((prev) =>
          prev.mode === "all-red" ? prev : { mode: "all-red", splitY: null }
        );
        return;
      }

      const container = containerRef.current;
      if (!container) {
        animationFrameId = requestAnimationFrame(evaluateContrast);
        return;
      }

      const logoRect = container.getBoundingClientRect();
      if (logoRect.width === 0 || logoRect.height === 0) {
        animationFrameId = requestAnimationFrame(evaluateContrast);
        return;
      }

      // 2. Check Hero Section seam transition (#beranda)
      const hero = document.getElementById("beranda");
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        // Entire logo inside Hero -> 100% white
        if (heroRect.bottom >= logoRect.bottom) {
          setLogoState((prev) =>
            prev.mode === "all-white" && prev.splitY === null
              ? prev
              : { mode: "all-white", splitY: null }
          );
          return;
        }
        // Crossing Hero bottom boundary -> horizontal split
        if (
          heroRect.bottom > logoRect.top &&
          heroRect.bottom < logoRect.bottom
        ) {
          const splitY = Math.round(heroRect.bottom - logoRect.top);
          setLogoState({
            mode: "split",
            splitY,
          });
          return;
        }
      }

      // 3. Scan specifically marked candidate collision elements with [data-collide="true"]
      // Highly optimized: avoids global DOM layout thrashing and prevents scroll stutter on mobile/tablet
      const candidateElements = document.querySelectorAll<HTMLElement>("[data-collide='true']");
      let hasCollision = false;

      for (let i = 0; i < candidateElements.length; i++) {
        const el = candidateElements[i];

        // Skip zero-dimension elements
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

        // Skip invisible elements (e.g. opacity: 0 before appearing)
        const opacity = el.style.opacity || window.getComputedStyle(el).opacity;
        if (opacity === "0" || el.style.visibility === "hidden" || el.style.display === "none") {
          continue;
        }

        const elRect = el.getBoundingClientRect();
        if (isRectOverlapping(logoRect, elRect)) {
          hasCollision = true;
          break;
        }
      }

      if (hasCollision) {
        // Colliding with text, red card, or photo -> WHITE logo
        setLogoState((prev) =>
          prev.mode === "all-white" && prev.splitY === null
            ? prev
            : { mode: "all-white", splitY: null }
        );
      } else {
        // Over pure cream background or yellow background -> RED logo
        setLogoState((prev) =>
          prev.mode === "all-red" && prev.splitY === null
            ? prev
            : { mode: "all-red", splitY: null }
        );
      }
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(evaluateContrast);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    evaluateContrast();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMenuOpen]);

  // Compute CSS clip paths and opacity for both layers
  let whiteClipPath = "none";
  let redClipPath = "inset(100% 0 0 0)"; // completely clipped/hidden
  let isWhiteOpaque = true;
  let isRedOpaque = false;

  if (isMenuOpen || logoState.mode === "all-red") {
    whiteClipPath = "inset(0 0 100% 0)";
    redClipPath = "none";
    isWhiteOpaque = false;
    isRedOpaque = true;
  } else if (logoState.mode === "all-white") {
    whiteClipPath = "none";
    redClipPath = "inset(100% 0 0 0)";
    isWhiteOpaque = true;
    isRedOpaque = false;
  } else if (logoState.mode === "split" && logoState.splitY !== null) {
    // Top part over dark Hero: White logo visible from top down to splitY
    whiteClipPath = `inset(0 0 calc(100% - ${logoState.splitY}px) 0)`;
    // Bottom part over bright Cream: Red logo visible from splitY down to bottom
    redClipPath = `inset(${logoState.splitY}px 0 0 0)`;
    isWhiteOpaque = true;
    isRedOpaque = true;
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-auto flex items-center select-none pointer-events-auto ${className}`}
    >
      <Link
        href="#beranda"
        onClick={onLogoClick}
        aria-label="Logo RINTIK - Kembali ke Beranda"
        className="relative block w-full h-auto outline-none focus:outline-none focus-visible:outline-none select-none"
      >
        {/* Layer 1: White Logo (for collisions with black text, red text, cards, dark sections) */}
        <div
          style={{
            clipPath: whiteClipPath,
            opacity: isWhiteOpaque ? 1 : 0,
          }}
          className="relative w-full h-auto flex items-center transition-opacity duration-150 will-change-[clip-path,opacity]"
        >
          <Image
            src="/img/LOGO/white.png"
            alt="Logo RINTIK Putih"
            width={218}
            height={54}
            priority
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Layer 2: Red Logo (for clean cream & yellow backgrounds) */}
        <div
          style={{
            clipPath: redClipPath,
            opacity: isRedOpaque ? 1 : 0,
          }}
          className="absolute inset-0 w-full h-auto flex items-center transition-opacity duration-150 will-change-[clip-path,opacity]"
          aria-hidden="true"
        >
          <Image
            src="/img/LOGO/red.png"
            alt="Logo RINTIK Merah"
            width={218}
            height={54}
            priority
            className="w-full h-auto object-contain"
          />
        </div>
      </Link>
    </div>
  );
}
