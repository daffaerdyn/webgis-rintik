"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);
  ScrollTrigger.config({
    ignoreMobileResize: true,
  });
}

interface LandingSmoothScrollProps {
  children: ReactNode;
}

export function LandingSmoothScroll({ children }: LandingSmoothScrollProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!wrapperRef.current || !contentRef.current) return;

      const mm = gsap.matchMedia();
      let isDisposed = false;

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const smoother = ScrollSmoother.create({
          wrapper: wrapperRef.current,
          content: contentRef.current,
          smooth: 1.05,
          smoothTouch: false,
          effects: true,
          ignoreMobileResize: true,
          onUpdate: () => {
            window.dispatchEvent(new Event("rintik:scroll-update"));
          },
        });

        if (typeof document !== "undefined" && document.fonts?.ready) {
          document.fonts.ready.then(() => {
            if (!isDisposed) {
              ScrollTrigger.refresh();
            }
          });
        }

        return () => {
          smoother.kill();
        };
      });

      return () => {
        isDisposed = true;
        mm.revert();
      };
    },
    { scope: wrapperRef }
  );

  return (
    <div id="smooth-wrapper" ref={wrapperRef} className="z-10">
      <div id="smooth-content" ref={contentRef} className="bg-transparent">
        {children}
      </div>
    </div>
  );
}
