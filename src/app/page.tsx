"use client";

import { useState } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StoryStageWrapper } from "@/components/landing/StoryStageWrapper";
import { ResearchStepsSection } from "@/components/landing/ResearchStepsSection";

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative min-h-dvh w-full bg-bg-cream text-stone-900 selection:bg-primary selection:text-black">
      {/* Top Fixed Floating Navigation and Drawer */}
      <LandingNavbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />

      {/* Main Landing Page 8-Stage Choreography Flow */}
      <main className="w-full relative">
        {/* Stage 1: Hero Section with Logo & Menu Option inside Container */}
        <HeroSection
          isMenuOpen={isMenuOpen}
          onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
        />

        {/* Stages 2 to 4C: Unified Story, Features, & District Statistics with 1 Continuous Background */}
        <StoryStageWrapper />

        {/* Stage 4D, 5, 6, 7, 8: 3-Step Guided Research & Shutter Closing to Amber Footer */}
        <ResearchStepsSection />
      </main>
    </div>
  );
}
