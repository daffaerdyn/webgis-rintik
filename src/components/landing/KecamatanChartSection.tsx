"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, RotateCcw } from "lucide-react";

interface DistrictStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
  rank: number;
  highlight: string;
}

const DISTRICT_DATA: DistrictStat[] = [
  {
    name: "Bogor Barat",
    count: 781,
    percentage: 26,
    color: "#C62828", // Sekunder RINTIK (Red - Highest)
    rank: 1,
    highlight: "Kawasan terpadat industri kreatif Kota Bogor",
  },
  {
    name: "Tanah Sareal",
    count: 531,
    percentage: 18,
    color: "#E11D74", // Magenta/Pink
    rank: 2,
    highlight: "Pusat jasa, retail & usaha konter",
  },
  {
    name: "Bogor Tengah",
    count: 499,
    percentage: 17,
    color: "#E11D74", // Magenta/Pink
    rank: 3,
    highlight: "Sentra kuliner favorit & oleh-oleh khas",
  },
  {
    name: "Bogor Utara",
    count: 493,
    percentage: 16,
    color: "#E11D74", // Magenta/Pink
    rank: 4,
    highlight: "Akses koridor Pajajaran & kafe modern",
  },
  {
    name: "Bogor Selatan",
    count: 429,
    percentage: 14,
    color: "#E11D74", // Magenta/Pink
    rank: 5,
    highlight: "Sentra kerajinan tangan & agrowisata",
  },
  {
    name: "Bogor Timur",
    count: 260,
    percentage: 9,
    color: "#E11D74", // Magenta/Pink
    rank: 6,
    highlight: "Kawasan paling lengang, potensi pasar baru",
  },
];

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

  const [isInView, setIsInView] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Animated counters
  const [stat1, setStat1] = useState(0); // 0 -> 26%
  const [stat2, setStat2] = useState(0); // 0 -> 2993
  const [districtCounts, setDistrictCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  const maxCount = 781;

  const playAnimation = () => {
    // Reset cleanups
    cleanupsRef.current.forEach((fn) => fn());
    cleanupsRef.current = [];

    // Reset initial values before rolling
    setStat1(0);
    setStat2(0);
    setDistrictCounts([0, 0, 0, 0, 0, 0]);
    setIsInView(true);

    // Stat 1: 0 -> 26%
    const c1 = animateCount(0, 26, 1600, 200, (val) => setStat1(val));
    cleanupsRef.current.push(c1);

    // Stat 2: 0 -> 2993
    const c2 = animateCount(0, 2993, 1900, 300, (val) => setStat2(val));
    cleanupsRef.current.push(c2);

    // District Progress Bars Numbers
    DISTRICT_DATA.forEach((d, i) => {
      const cd = animateCount(0, d.count, 1300, 250 + i * 80, (val) => {
        setDistrictCounts((prev) => {
          const next = [...prev];
          next[i] = val;
          return next;
        });
      });
      cleanupsRef.current.push(cd);
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let triggered = false;

    // Direct scroll tracker: triggers as soon as section top enters 85% of viewport
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
        // Reset when scrolled out, so re-entering re-triggers animation
        triggered = false;
      }
    };

    window.addEventListener("scroll", handleScrollOrIntersect, { passive: true });
    // Run immediately on mount (in case user reloaded right at the section)
    handleScrollOrIntersect();

    // Additional IntersectionObserver fallback
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!triggered) {
              triggered = true;
              playAnimation();
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      window.removeEventListener("scroll", handleScrollOrIntersect);
      observer.disconnect();
      cleanupsRef.current.forEach((fn) => fn());
    };
  }, []);

  const handleReplay = () => {
    setAnimationKey((prev) => prev + 1);
    playAnimation();
  };

  return (
    <section
      ref={sectionRef}
      id="statistik"
      className="relative w-full bg-transparent py-16 sm:py-20 px-6 sm:px-10 md:px-24 overflow-hidden select-none"
    >
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
        {/* ============================================================== */}
        {/* Left Column: Heading & Key Animated Metrics                    */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 text-left">
          {/* Badge */}
          <motion.div
            data-collide="true"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-block px-3.5 py-1.5 rounded-full bg-primary text-black text-xs font-bold mb-4 shadow-xs"
          >
            Dataset RINTIK
          </motion.div>

          {/* Heading - Fade in with slide up */}
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-3xl sm:text-4xl font-extrabold text-secondary leading-tight mb-4"
          >
            2.993 UMKM Tersebar di 6 Kecamatan
          </motion.h2>

          {/* Description - Fade in with slide up */}
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-stone-700 text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
          >
            Setiap titik di peta RINTIK berasal dari dataset yang sama. Bogor
            Barat menjadi kawasan terpadat dengan 781 UMKM, sedangkan Bogor
            Timur masih paling lengang, sebuah gambaran awal sebelum Anda
            menjelajah atau meriset lokasi usaha.
          </motion.p>

          {/* 3 Interactive Metric Cards with Counter Animations (0 -> Target) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-3.5 mb-6 max-w-xl w-full">
            {/* Stat 1: 0 -> 26% */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 20, scale: 0.95 }
              }
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="group bg-secondary text-white p-3 sm:p-4 rounded-xl text-center shadow-xs flex flex-col justify-between min-h-[110px] sm:min-h-[120px] select-none cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-black text-white group-hover:text-[var(--brand-orange)] transition-colors duration-200 tracking-tight">
                <span className="tabular-nums">{stat1}%</span>
              </div>
              <div className="text-[11px] sm:text-xs text-white/90 leading-tight mt-1">
                Konsentrasi Tertinggi (Bogor Barat)
              </div>
            </motion.div>

            {/* Stat 2: 0 -> 2.993 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 20, scale: 0.95 }
              }
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="group bg-secondary text-white p-3 sm:p-4 rounded-xl text-center shadow-xs flex flex-col justify-between min-h-[110px] sm:min-h-[120px] select-none cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center text-2xl sm:text-3xl font-black text-white group-hover:text-[var(--brand-orange)] transition-colors duration-200 tracking-tight">
                <span className="tabular-nums">
                  {stat2.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-white/90 leading-tight mt-1">
                Total UMKM Terverifikasi
              </div>
            </motion.div>

            {/* Stat 3: 23 Sep 2026 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={
                isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 20, scale: 0.95 }
              }
              transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
              className="group bg-secondary text-white p-3 sm:p-4 rounded-xl text-center shadow-xs flex flex-col justify-between min-h-[110px] sm:min-h-[120px] select-none cursor-pointer"
            >
              <div className="flex-1 flex items-center justify-center text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white group-hover:text-[var(--brand-orange)] transition-colors duration-200 tracking-tight whitespace-nowrap">
                <span>23 Sep 2026</span>
              </div>
              <div className="text-[11px] sm:text-xs text-white/90 leading-tight mt-1">
                Pembaruan Data Terakhir
              </div>
            </motion.div>
          </div>

          {/* Footnote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xs text-stone-500 italic"
          >
            Sumber: OpenStreetMap, verifikasi wilayah Kota Bogor, Google Maps.
          </motion.p>
        </div>

        {/* ============================================================== */}
        {/* Right Column: Interactive Progress Bars (Exact SS2 Layout)     */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={
            isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 25, scale: 0.98 }
          }
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg border border-stone-200/80"
        >
          {/* Header row inside card with replay button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
              Jumlah UMKM per Kecamatan
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReplay}
                title="Putar ulang animasi grafik"
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-stone-500 hover:text-secondary px-2.5 py-1 rounded-lg hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ulang</span>
              </button>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                6 Kecamatan
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mb-7">
            Total 2.993 UMKM, diurutkan dari terbanyak
          </p>

          {/* District Progress Bars List (Exact SS2 Single-line Layout) */}
          <div className="space-y-4 sm:space-y-5">
            {DISTRICT_DATA.map((district, index) => {
              const widthPct = (district.count / maxCount) * 100;
              const isHovered = hoveredDistrict === district.name;

              return (
                <div
                  key={district.name}
                  onMouseEnter={() => setHoveredDistrict(district.name)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  className="group relative flex items-center gap-2.5 sm:gap-4 p-1.5 -mx-1.5 rounded-xl transition-colors duration-150 hover:bg-stone-50/80 cursor-pointer"
                >
                  {/* District Name (Left Column) */}
                  <span className="w-24 sm:w-28 md:w-32 shrink-0 text-xs sm:text-sm font-bold text-stone-900 group-hover:text-secondary transition-colors">
                    {district.name}
                  </span>

                  {/* Progress Bar Track (Warm Beige/Cream Thick Pill) */}
                  <div className="flex-1 h-5 sm:h-6 bg-[#EFEBD9] rounded-full overflow-hidden relative shadow-inner/10">
                    <motion.div
                      key={`${district.name}-${animationKey}`}
                      className="h-full rounded-full transition-transform duration-150 group-hover:brightness-105"
                      style={{
                        backgroundColor: district.color,
                      }}
                      initial={{ width: "0%" }}
                      animate={
                        isInView
                          ? { width: `${widthPct}%` }
                          : { width: "0%" }
                      }
                      transition={{
                        duration: 1.2,
                        delay: 0.25 + index * 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>

                  {/* District Count (Number) */}
                  <span className="w-10 sm:w-12 text-right font-bold text-xs sm:text-sm text-stone-900 tabular-nums shrink-0">
                    {districtCounts[index]
                      ? districtCounts[index].toLocaleString("id-ID")
                      : "0"}
                  </span>

                  {/* Percentage (Right Column) */}
                  <span className="w-8 sm:w-10 text-right text-stone-500 font-medium text-xs sm:text-sm tabular-nums shrink-0">
                    {district.percentage}%
                  </span>

                  {/* Interactive Micro-Tooltip on Row Hover */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-7 left-28 sm:left-36 z-20 pointer-events-none bg-stone-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-md whitespace-nowrap"
                    >
                      Peringkat #{district.rank} • {district.highlight}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer inside card */}
          <div className="mt-8 pt-5 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-500">
            <span>
              Angka dihitung dari dataset yang sama dengan Peta Pengunjung dan
              Analisis Calon UMKM.
            </span>
            <Link
              href="/map/pengunjung"
              className="group inline-flex items-center gap-1 font-bold text-secondary hover:text-brand-red-dark shrink-0 transition-colors"
            >
              <span>Buka Peta</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
