"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, RotateCcw } from "lucide-react";

interface DistrictStat {
  name: string;
  count: number;
  percentage: number;
  colorVar: string;
  rank: number;
  highlight: string;
}

const DISTRICT_DATA: DistrictStat[] = [
  {
    name: "Bogor Barat",
    count: 781,
    percentage: 26,
    colorVar: "var(--brand-red)", // Sekunder RINTIK (Red - Highest)
    rank: 1,
    highlight: "Kawasan terpadat industri kreatif Kota Bogor",
  },
  {
    name: "Tanah Sareal",
    count: 531,
    percentage: 18,
    colorVar: "var(--cat-kuliner)", // Magenta/Pink
    rank: 2,
    highlight: "Pusat jasa, retail & usaha konter",
  },
  {
    name: "Bogor Tengah",
    count: 499,
    percentage: 17,
    colorVar: "var(--cat-kuliner)", // Magenta/Pink
    rank: 3,
    highlight: "Sentra kuliner favorit & oleh-oleh khas",
  },
  {
    name: "Bogor Utara",
    count: 493,
    percentage: 16,
    colorVar: "var(--cat-kuliner)", // Magenta/Pink
    rank: 4,
    highlight: "Akses koridor Pajajaran & kafe modern",
  },
  {
    name: "Bogor Selatan",
    count: 429,
    percentage: 14,
    colorVar: "var(--cat-kuliner)", // Magenta/Pink
    rank: 5,
    highlight: "Sentra kerajinan tangan & agrowisata",
  },
  {
    name: "Bogor Timur",
    count: 260,
    percentage: 9,
    colorVar: "var(--cat-kuliner)", // Magenta/Pink
    rank: 6,
    highlight: "Kawasan paling lengang, potensi pasar baru",
  },
];

const TOTAL_UMKM = 2993;
const MAX_DISTRICT_COUNT = 781;

// Pure high-performance requestAnimationFrame count-up driver (60/120fps smooth)
function animateCount(
  from: number,
  to: number,
  durationMs: number,
  delayMs: number,
  onUpdate: (latest: number) => void
): () => void {
  let frameId: number;

  const timerId = setTimeout(() => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutExpo curve for dynamic start and velvety smooth finish
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(from + (to - from) * ease);
      onUpdate(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        onUpdate(to);
      }
    };
    frameId = requestAnimationFrame(tick);
  }, delayMs);

  return () => {
    clearTimeout(timerId);
    cancelAnimationFrame(frameId);
  };
}

export function KecamatanChartSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cleanupsRef = useRef<(() => void)[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const [isInView, setIsInView] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [activeDistrict, setActiveDistrict] = useState<string | null>(null);

  // Animated counters (fallback immediately to real totals when reduced motion is active)
  const [stat1, setStat1] = useState(26);
  const [stat2, setStat2] = useState(TOTAL_UMKM);
  const [districtCounts, setDistrictCounts] = useState<number[]>(
    DISTRICT_DATA.map((d) => d.count)
  );

  const playAnimation = useCallback(() => {
    cleanupsRef.current.forEach((fn) => fn());
    cleanupsRef.current = [];
    setIsInView(true);

    if (prefersReducedMotion) {
      setStat1(26);
      setStat2(TOTAL_UMKM);
      setDistrictCounts(DISTRICT_DATA.map((d) => d.count));
      return;
    }

    setStat1(0);
    setStat2(0);
    setDistrictCounts([0, 0, 0, 0, 0, 0]);

    // Stat 1: 0 -> 26%
    cleanupsRef.current.push(
      animateCount(0, 26, 1500, 180, (val) => setStat1(val))
    );

    // Stat 2: 0 -> 2.993
    cleanupsRef.current.push(
      animateCount(0, TOTAL_UMKM, 1800, 260, (val) => setStat2(val))
    );

    // District Progress Bars Numbers
    DISTRICT_DATA.forEach((d, i) => {
      cleanupsRef.current.push(
        animateCount(0, d.count, 1250, 220 + i * 75, (val) => {
          setDistrictCounts((prev) => {
            const next = [...prev];
            next[i] = val;
            return next;
          });
        })
      );
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let triggered = false;

    const handleScrollOrIntersect = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inViewNow = rect.top <= window.innerHeight * 0.85 && rect.bottom >= 100;

      if (inViewNow) {
        if (!triggered) {
          triggered = true;
          playAnimation();
        }
      } else if (rect.top > window.innerHeight || rect.bottom < 0) {
        triggered = false;
      }
    };

    window.addEventListener("scroll", handleScrollOrIntersect, { passive: true });
    window.addEventListener("rintik:scroll-update", handleScrollOrIntersect, {
      passive: true,
    });
    handleScrollOrIntersect();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            playAnimation();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      window.removeEventListener("scroll", handleScrollOrIntersect);
      window.removeEventListener("rintik:scroll-update", handleScrollOrIntersect);
      observer.disconnect();
      cleanupsRef.current.forEach((fn) => fn());
    };
  }, [playAnimation]);

  const handleReplay = () => {
    setAnimationKey((prev) => prev + 1);
    playAnimation();
  };

  const handleToggleDistrict = (name: string) => {
    setActiveDistrict((prev) => (prev === name ? null : name));
  };

  return (
    <section
      ref={sectionRef}
      id="statistik"
      className="relative w-full bg-transparent scroll-mt-20 py-14 sm:py-16 md:py-20 px-5 sm:px-8 md:px-12 lg:px-20 xl:px-24 overflow-x-clip select-none"
    >
      <div className="relative z-10 w-full max-w-[1360px] 2xl:max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 xl:gap-14 items-center">
        {/* ============================================================== */}
        {/* Left Column: Heading & Key Animated Metrics                    */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 text-left min-w-0 max-w-3xl lg:max-w-none mx-auto lg:mx-0 w-full">
          {/* Heading */}
          <motion.h2
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: 0.06, ease: "easeOut" }}
            className="text-[1.625rem] sm:text-3xl md:text-4xl font-extrabold text-secondary leading-[1.2] tracking-tight mb-3 sm:mb-4 break-words min-w-0"
          >
            2.993 UMKM Tersebar di 6 Kecamatan
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
            className="text-stone-700 text-base leading-[1.6] text-left mb-6 sm:mb-7 max-w-xl"
          >
            Setiap titik di peta RINTIK berasal dari dataset yang sama. Bogor
            Barat menjadi kawasan terpadat dengan 781 UMKM, sedangkan Bogor
            Timur masih paling lengang, sebuah gambaran awal sebelum Anda
            menjelajah atau meriset lokasi usaha.
          </motion.p>

          {/* 3 Metric Cards: 2+1 balanced Bento on mobile (< 640px) -> 3 equal columns on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5 max-w-xl lg:max-w-none w-full">
            {/* Stat 1: 0 -> 26% */}
            <motion.div
              data-collide="true"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: 0.16, ease: "easeOut" }}
              className="bg-secondary text-white px-3.5 py-4 sm:p-4 rounded-xl text-center shadow-xs flex flex-col justify-between min-h-[104px] sm:min-h-[120px] min-w-0"
            >
              <div className="flex-1 flex items-center justify-center text-[1.75rem] sm:text-3xl font-black text-white tracking-tight leading-none">
                <span className="tabular-nums">{stat1}%</span>
              </div>
              <div className="text-xs text-white/92 leading-snug mt-2">
                Konsentrasi Tertinggi (Bogor Barat)
              </div>
            </motion.div>

            {/* Stat 2: 0 -> 2.993 */}
            <motion.div
              data-collide="true"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
              className="bg-secondary text-white px-3.5 py-4 sm:p-4 rounded-xl text-center shadow-xs flex flex-col justify-between min-h-[104px] sm:min-h-[120px] min-w-0"
            >
              <div className="flex-1 flex items-center justify-center text-[1.75rem] sm:text-3xl font-black text-white tracking-tight leading-none">
                <span className="tabular-nums">
                  {stat2.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="text-xs text-white/92 leading-snug mt-2">
                Total UMKM Terverifikasi
              </div>
            </motion.div>

            {/* Stat 3: 23 Sep 2026 (Full-width horizontal strip on mobile so date never clips; 3rd column on sm+) */}
            <motion.div
              data-collide="true"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: 0.28, ease: "easeOut" }}
              className="col-span-2 sm:col-span-1 bg-secondary text-white px-4 py-3.5 sm:p-4 rounded-xl shadow-xs flex flex-row-reverse sm:flex-col items-center justify-between gap-3 sm:gap-0 sm:text-center min-h-[56px] sm:min-h-[120px] min-w-0"
            >
              <div className="sm:flex-1 flex items-center justify-center text-base sm:text-lg md:text-xl xl:text-[22px] font-black text-white tracking-tight whitespace-nowrap tabular-nums">
                <span>23 Sep 2026</span>
              </div>
              <div className="text-xs text-white/92 leading-snug sm:mt-2 text-left sm:text-center">
                Pembaruan Data Terakhir
              </div>
            </motion.div>
          </div>

          {/* Footnote */}
          <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">
            Sumber: OpenStreetMap, verifikasi wilayah Kota Bogor, Google Maps.
          </p>
        </div>

        {/* ============================================================== */}
        {/* Right Column: Interactive Progress Bars Card                   */}
        {/* Mobile: 2-line full-width bar layout for true data legibility  */}
        {/* Tablet & Desktop (sm+): Single-line aligned horizontal bars    */}
        {/* ============================================================== */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.99 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
          className="lg:col-span-7 min-w-0 w-full max-w-3xl lg:max-w-none mx-auto lg:mx-0 bg-white/55 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 shadow-chart-card border border-white/70"
        >
          {/* Header row inside card with replay button & non-wrapping badge */}
          <div className="flex items-start sm:items-center justify-between gap-3 mb-1.5">
            <h3 className="text-lg sm:text-2xl font-bold text-stone-900 leading-snug min-w-0">
              Jumlah UMKM per Kecamatan
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReplay}
                aria-label="Putar ulang animasi grafik"
                title="Putar ulang animasi grafik"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:text-secondary hover:bg-white/70 active:scale-95 transition-[color,background-color,transform] cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="hidden sm:inline">Ulang</span>
              </button>
              <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-white/75 border border-stone-200/80 text-stone-700 whitespace-nowrap shrink-0">
                6 Kecamatan
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-stone-600 mb-5 sm:mb-7">
            Total 2.993 UMKM, diurutkan dari terbanyak. Ketuk kecamatan untuk
            detail.
          </p>

          {/* District Progress Bars List */}
          <div className="space-y-2.5 sm:space-y-3.5">
            {DISTRICT_DATA.map((district, index) => {
              const widthPct = (district.count / MAX_DISTRICT_COUNT) * 100;
              const isSelected = activeDistrict === district.name;

              return (
                <div key={district.name} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleDistrict(district.name)}
                    aria-expanded={isSelected}
                    className={`group w-full text-left flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 px-2.5 py-2 -mx-2.5 rounded-xl min-h-[44px] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus-ring ${
                      isSelected ? "bg-white/80" : "hover:bg-white/55"
                    }`}
                  >
                    {/* Top row on mobile (Name left, Count & % right); split into columns via sm:contents on sm+ */}
                    <div className="flex items-baseline justify-between gap-2 w-full sm:contents">
                      {/* District Name */}
                      <span className="sm:w-28 md:w-32 sm:shrink-0 sm:order-1 text-sm font-bold text-stone-900 group-hover:text-secondary transition-colors">
                        {district.name}
                      </span>

                      {/* Count & Percentage */}
                      <div className="flex items-baseline gap-2.5 sm:gap-3 shrink-0 sm:order-3">
                        <span className="font-extrabold text-sm text-stone-900 tabular-nums sm:w-12 sm:text-right">
                          {districtCounts[index]
                            ? districtCounts[index].toLocaleString("id-ID")
                            : "0"}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-stone-600 tabular-nums w-9 sm:w-10 text-right">
                          {district.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Full-width Progress Bar Track (GPU-composited scaleX, zero width layout thrashing) */}
                    <div className="w-full sm:flex-1 sm:order-2 h-3 sm:h-5 bg-track-cream rounded-full overflow-hidden relative">
                      <motion.div
                        key={`${district.name}-${animationKey}`}
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: district.colorVar,
                          transformOrigin: "left center",
                        }}
                        initial={prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                        animate={
                          isInView || prefersReducedMotion
                            ? { scaleX: 1 }
                            : { scaleX: 0 }
                        }
                        transition={{
                          duration: prefersReducedMotion ? 0 : 1.1,
                          delay: prefersReducedMotion ? 0 : 0.2 + index * 0.08,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </button>

                  {/* Touch & Keyboard Accessible Inline Detail Insight (No off-screen tooltip clipping) */}
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="mt-1 mb-1 px-3 py-2 rounded-lg bg-white/85 border border-border-cream/80 text-xs text-stone-700 flex items-start gap-2 leading-snug"
                      >
                        <span className="font-extrabold text-secondary shrink-0 tabular-nums">
                          #{district.rank}
                        </span>
                        <span>{district.highlight}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Footer inside card */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-stone-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs sm:text-[13px] text-stone-600">
            <span className="leading-relaxed">
              Angka dihitung dari dataset yang sama dengan Peta Pengunjung dan
              Analisis Calon UMKM.
            </span>
            <Link
              href="/map/pengunjung"
              className="group inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 py-1 font-bold text-secondary hover:text-brand-red-dark shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring rounded"
            >
              <span>Buka Peta</span>
              <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
