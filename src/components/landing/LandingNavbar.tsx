"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitLogo } from "./SplitLogo";

interface MenuItem {
  id: string;
  label: string;
  href: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "beranda", label: "BERANDA", href: "#beranda" },
  { id: "tentang", label: "TENTANG", href: "#tentang" },
  { id: "fungsi", label: "FUNGSI", href: "#fungsi" },
];

interface LandingNavbarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

export function LandingNavbar({
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
}: LandingNavbarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isControlled ? controlledSetIsOpen! : setInternalIsOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => {
    setIsOpen(false);
    setHoveredMenu(null);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    closeMenu();
    const targetId = href.replace("#", "");
    const smoother = ScrollSmoother.get();
    if (targetId === "beranda") {
      if (smoother) {
        smoother.scrollTo(0, true);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    const elem = document.getElementById(targetId);
    if (elem) {
      if (smoother) {
        smoother.scrollTo(elem, true, "top top");
      } else {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Variants for vertical Text Mask Reveal
  const maskContainerVariants: Variants = {
    closed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    open: {
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.08,
      },
    },
  };

  const maskItemVariants: Variants = {
    closed: {
      y: "120%",
      opacity: 0,
      transition: {
        duration: 0.38,
        ease: [0.65, 0, 1, 0.4],
      },
    },
    open: {
      y: "0%",
      opacity: 1,
      transition: {
        duration: 0.52,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <>
      {/* ============================================================== */}
      {/* Top Fixed Header Bar (z-[60]: ALWAYS on top of yellow drawer)   */}
      {/* Positioned comfortably below top border with ample breathing room */}
      {/* ============================================================== */}
      <header className="fixed top-0 left-0 w-full z-[60] px-5 sm:px-8 md:px-12 lg:px-24 pt-5 sm:pt-7 md:pt-8 lg:pt-9 pt-[max(1.25rem,env(safe-area-inset-top))] pointer-events-none">
        <div className="w-full flex items-center justify-between">
          {/* Persistent Split-Color Logo: strict locked size and position */}
          <SplitLogo
            isMenuOpen={isOpen}
            onLogoClick={closeMenu}
            className="w-28 sm:w-32 md:w-36"
          />

          {/* Toggle / Close Button: wrapper box rotates +90deg on hover, -90deg back on leave */}
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
            className={`w-11 h-11 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shadow-md cursor-pointer pointer-events-auto transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:rotate-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 ${
              isOpen
                ? "bg-secondary border border-secondary shadow-secondary/30"
                : "bg-primary border border-secondary/20 shadow-black/20 hover:brightness-105"
            }`}
          >
            {/* Smart Morphing Icon (2 bold lines <-> X) without internal hover rotation */}
            <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none">
              {/* Top Line (bold h-[3px]) */}
              <span
                className={`absolute h-[3px] w-4.5 rounded-full transition-all duration-300 ease-in-out ${
                  isOpen
                    ? "bg-primary translate-y-0 rotate-45"
                    : "bg-secondary -translate-y-1.5 rotate-0"
                }`}
              />
              {/* Bottom Line (bold h-[3px]) */}
              <span
                className={`absolute h-[3px] w-4.5 rounded-full transition-all duration-300 ease-in-out ${
                  isOpen
                    ? "bg-primary translate-y-0 -rotate-45"
                    : "bg-secondary translate-y-1.5 rotate-0"
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* AnimatePresence for Slide-Down Drawer (z-50, BEHIND fixed header) */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay: darkened and softly blurred for high contrast and focus */}
            <motion.div
              key="landing-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 1, 0.4] }}
              onClick={closeMenu}
              aria-hidden="true"
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 pointer-events-auto"
            />

            {/* Slide-Down Top Drawer with slow-start fast-finish acceleration (ease-in) */}
            <motion.div
              key="landing-drawer"
              initial={{ y: "-100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "-100%" }}
              transition={{
                duration: 0.55,
                ease: [0.65, 0, 1, 0.4], // Setengah waktu lambat dulu, lalu setengah waktu berikutnya melesat cepat
              }}
              style={{ willChange: "transform" }}
              className="fixed top-0 left-0 w-full min-h-[56dvh] max-h-[85dvh] bg-primary z-50 shadow-2xl flex flex-col justify-between px-5 pt-5 pb-12 sm:px-8 sm:pt-7 sm:pb-14 md:px-12 md:pt-8 md:pb-16 lg:px-24 lg:pt-9 lg:pb-20 border-b-2 border-secondary/20 pt-[max(1.25rem,env(safe-area-inset-top))]"
            >
              {/* Top Header Spacer Row inside Drawer (matches fixed Header height so red line aligns) */}
              <div
                className="w-full flex items-center justify-between h-11 pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-28 sm:w-32 md:w-36 h-full" />
                <div className="w-11 h-11" />
              </div>

              {/* Center Navigation Links: Truly vertically centered with balanced optical rhythm */}
              <motion.nav
                aria-label="Menu Utama"
                variants={maskContainerVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="flex-1 flex flex-col items-center justify-center gap-3.5 sm:gap-4 md:gap-6 py-2 my-auto"
              >
                {MENU_ITEMS.map((item) => {
                  const isHovered = hoveredMenu === item.id;
                  const isOtherHovered = hoveredMenu !== null && !isHovered;

                  return (
                    <div key={item.id} className="overflow-hidden py-1 px-4">
                      <motion.div variants={maskItemVariants}>
                        <a
                          href={item.href}
                          onClick={(e) => handleNavClick(e, item.href)}
                          onMouseEnter={() => setHoveredMenu(item.id)}
                          onMouseLeave={() => setHoveredMenu(null)}
                          className={`group relative block select-none text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-widest text-center focus-visible:outline-2 focus-visible:outline-secondary rounded-md transition-[color,opacity,transform] duration-300 py-1.5 px-6 min-h-[44px] flex items-center justify-center ${
                            isHovered
                              ? "text-black opacity-100 scale-[1.03]"
                              : isOtherHovered
                              ? "text-secondary opacity-30"
                              : "text-secondary opacity-100"
                          }`}
                        >
                          {/* Rolling Text Reveal Viewport */}
                          <div className="relative overflow-hidden h-[1.3em]">
                            <div className="flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1/2">
                              {/* 1st Line (initial view) */}
                              <span className="block h-[1.3em] leading-[1.3em] text-center">
                                {item.label}
                              </span>
                              {/* 2nd Line (rolls up from below on hover) */}
                              <span className="block h-[1.3em] leading-[1.3em] text-center">
                                {item.label}
                              </span>
                            </div>
                          </div>
                        </a>
                      </motion.div>
                    </div>
                  );
                })}
              </motion.nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
