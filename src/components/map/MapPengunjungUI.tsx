"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Layers,
  MapPin,
  Store,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Crosshair,
  BarChart2,
  Bike,
  Car,
  Footprints,
  Info,
  RotateCcw,
  Star,
} from "lucide-react";
import type { TransportMode, RouteResult } from "./MapRoutingService";
import {
  KATEGORI_RINTIK,
  DAFTAR_KECAMATAN,
  KECAMATAN_KELURAHAN_BOGOR,
  TOTAL_UMKM_VALID,
  STATISTIK_KECAMATAN_RINTIK,
} from "@/lib/constants";

export interface UmkmItem {
  id_umkm: string;
  nama_umkm: string;
  kategori: string;
  deskripsi_produk?: string | null;
  alamat?: string | null;
  kecamatan?: string | null;
  kelurahan?: string | null;
  latitude: number;
  longitude: number;
  range_harga?: string | null;
  rating?: number | null;
  jarak_meter?: number | null;
  foto_url?: string;
}

export type PriceSortOrder = "none" | "asc" | "desc";
export type RatingSortOrder = "none" | "desc" | "asc";

/**
 * Ekstraksi angka nominal harga (min, max) dari string range_harga
 * contoh: "Rp 15.000 - Rp 45.000" => min: 15000, max: 45000
 */
export function parsePriceRange(rangeStr?: string | null): { min: number; max: number } {
  if (!rangeStr) return { min: 0, max: 0 };
  const matches = rangeStr.replace(/\./g, "").match(/\d+/g);
  if (!matches || matches.length === 0) return { min: 0, max: 0 };
  const num1 = parseInt(matches[0], 10) || 0;
  const num2 = matches.length > 1 ? parseInt(matches[1], 10) || num1 : num1;
  return {
    min: Math.min(num1, num2),
    max: Math.max(num1, num2),
  };
}

export type VisitorSidebarState = "LIST" | "DETAIL" | "ROUTE" | "EMPTY";

export interface MapPengunjungUIProps {
  // Pencarian & Filter
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  selectedKecamatan: string;
  onSelectKecamatan: (kec: string) => void;
  selectedKelurahan: string;
  onSelectKelurahan: (kel: string) => void;
  radiusMeters: number;
  onRadiusChange: (radius: number) => void;
  categoryCounts: Record<string, number>;
  onClearFilters: () => void;

  // Filter & Urutan Angka (Harga) & Rating (Bisa salah satu atau keduanya)
  priceSort: PriceSortOrder;
  onPriceSortChange: (order: PriceSortOrder) => void;
  ratingSort: RatingSortOrder;
  onRatingSortChange: (order: RatingSortOrder) => void;

  // Toggleable Panels State (Google Maps Style)
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  isRadiusOpen: boolean;
  onToggleRadius: () => void;
  isStatisticsOpen: boolean;
  onToggleStatistics: () => void;
  isLayersOpen: boolean;
  onToggleLayers: () => void;

  // Sidebar States (1: LIST, 2: DETAIL, 3: ROUTE, 4: EMPTY)
  sidebarState: VisitorSidebarState;
  onSetSidebarState: (state: VisitorSidebarState) => void;

  // Data UMKM & Seleksi
  umkmList: UmkmItem[];
  totalFilteredCount: number;
  selectedUmkm: UmkmItem | null;
  onSelectUmkm: (umkm: UmkmItem) => void;

  // Rute Navigasi
  routeResult: RouteResult | null;
  routeMode: TransportMode;
  onSelectRouteMode: (mode: TransportMode) => void;
  isRoutingLoading: boolean;
  isSettingOrigin: boolean;
  onToggleSetOrigin: () => void;

  // Layers Control
  showUmkm: boolean;
  onToggleShowUmkm: () => void;
  showWilayah: boolean;
  onToggleShowWilayah: () => void;
  showJalan: boolean;
  onToggleShowJalan: () => void;
  showSekolah: boolean;
  onToggleShowSekolah: () => void;
  showPermukiman: boolean;
  onToggleShowPermukiman: () => void;

  // Recenter & Zoom Actions
  onRecenterUser: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}


export function MapPengunjungUI({
  searchKeyword,
  onSearchChange,
  selectedCategories,
  onToggleCategory,
  selectedKecamatan,
  onSelectKecamatan,
  selectedKelurahan,
  onSelectKelurahan,
  radiusMeters,
  onRadiusChange,
  categoryCounts,
  onClearFilters,
  priceSort,
  onPriceSortChange,
  ratingSort,
  onRatingSortChange,
  isLeftPanelOpen,
  onToggleLeftPanel,
  isFilterOpen,
  onToggleFilter,
  isRadiusOpen,
  onToggleRadius,
  isStatisticsOpen,
  onToggleStatistics,
  isLayersOpen,
  onToggleLayers,
  sidebarState,
  onSetSidebarState,
  umkmList,
  totalFilteredCount,
  selectedUmkm,
  onSelectUmkm,
  routeResult,
  routeMode,
  onSelectRouteMode,
  isRoutingLoading,
  isSettingOrigin,
  onToggleSetOrigin,
  showUmkm,
  onToggleShowUmkm,
  showWilayah,
  onToggleShowWilayah,
  showJalan,
  onToggleShowJalan,
  showSekolah,
  onToggleShowSekolah,
  showPermukiman,
  onToggleShowPermukiman,
  onRecenterUser,
  onZoomIn,
  onZoomOut,
}: MapPengunjungUIProps) {
  const kelurahanOptions =
    selectedKecamatan && selectedKecamatan !== "Semua"
      ? KECAMATAN_KELURAHAN_BOGOR[selectedKecamatan] || []
      : [];

  // Hitung jumlah filter aktif (Kategori non-default, Kecamatan, Kelurahan, Harga, Rating)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length < 5) count += 1;
    if (selectedKecamatan !== "Semua") count += 1;
    if (selectedKelurahan !== "Semua") count += 1;
    if (priceSort !== "none") count += 1;
    if (ratingSort !== "none") count += 1;
    return count;
  }, [selectedCategories, selectedKecamatan, selectedKelurahan, priceSort, ratingSort]);

  const hasActiveFilter = activeFilterCount > 0;

  // Batasi jumlah kartu yang dirender di DOM awal (50 item) + infinite scroll otomatis agar ringan
  const [visibleCount, setVisibleCount] = useState<number>(50);

  useEffect(() => {
    setVisibleCount(50);
  }, [umkmList]);

  const visibleUmkmList = useMemo(() => {
    return umkmList.slice(0, visibleCount);
  }, [umkmList, visibleCount]);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      if (visibleCount < umkmList.length) {
        setVisibleCount((prev) => Math.min(prev + 50, umkmList.length));
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-[var(--font-sans)]">
      {/* 1. TOP-LEFT CONTROLS: STANDALONE BACK/MAP BUTTON + SEARCH PILL + FILTER BUTTON + RADIUS BUTTON */}
      <div className={`absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-auto pointer-events-auto flex flex-col lg:flex-row lg:items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-32px)] ${
        (isFilterOpen || isRadiusOpen) ? "z-50" : "z-30"
      }`}>
        {/* ROW 1: Standalone Back Button + Search Bar Pill + (Mobile-only Statistik Button) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* A. STANDALONE BUTTON KEMBALI / MAP */}
          <Link
            href="/"
            title="Kembali ke Beranda"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--bg-surface-white)] shadow-md border border-[var(--border-subtle)] hover:bg-[var(--color-bg)] active:scale-[0.98] text-[var(--ink-primary)] transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* B. SEARCH INPUT PILL */}
          <div className="flex-1 sm:flex-initial flex items-center bg-[var(--bg-surface-white)] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-[var(--border-subtle)] sm:w-[260px] md:w-[300px] gap-2 min-w-0">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari UMKM, kelurahan, ke..."
              className="w-full text-xs sm:text-base bg-transparent outline-none text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] truncate"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-0.5 rounded-full focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] shrink-0"
                title="Hapus kata kunci"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Search className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
          </div>

          {/* MOBILE-ONLY STATISTIK BUTTON */}
          <button
            type="button"
            onClick={onToggleStatistics}
            className={`sm:hidden flex items-center justify-center w-9 h-9 rounded-full shadow-md border transition-colors shrink-0 active:scale-[0.98] ${
              isStatisticsOpen
                ? "bg-[var(--brand-red)] text-white border-[var(--brand-red)]"
                : "bg-[var(--bg-surface-white)] text-[var(--brand-red)] border-[var(--border-subtle)]"
            }`}
            title="Statistik Persebaran"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>

        {/* ROW 2: Filter Button + Radius Button (Clean horizontal chips, no overflow trap on tablet) */}
        <div className="flex items-center gap-1.5 sm:gap-2 py-0.5 sm:py-0">
          {/* C. FILTER BUTTON & FLOATING POPOVER */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleFilter}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-md border transition-all whitespace-nowrap shrink-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer ${hasActiveFilter
                ? "bg-[var(--brand-orange)] text-white border-[var(--brand-orange)] shadow-orange-500/20"
                : isFilterOpen
                  ? "bg-[var(--bg-surface-white)] text-[var(--brand-orange)] border-[var(--brand-orange)] ring-2 ring-[var(--brand-orange)]/20"
                  : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
                }`}
              title="Buka Filter Kategori, Wilayah, dan Urutan Data"
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Filter</span>
              {hasActiveFilter && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-[var(--brand-orange)] text-[10px] sm:text-xs font-black flex items-center justify-center shadow-xs">
                  {activeFilterCount}
                </span>
              )}
              {isFilterOpen ? (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--ink-muted)]" />
              )}
            </button>

            {/* Backdrop Mobile untuk Filter */}
            {isFilterOpen && (
              <div
                className="fixed inset-0 bg-black/40 z-40 sm:hidden pointer-events-auto animate-in fade-in duration-150"
                onClick={onToggleFilter}
              />
            )}

            {/* FLOATING FILTER POPOVER CARD */}
            {isFilterOpen && (
              <div
                className={`fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-3 sm:bottom-auto sm:top-full sm:mt-2 bg-[var(--bg-surface-white)] rounded-2xl p-4 sm:p-5 shadow-2xl border border-[var(--border-subtle)] sm:w-[440px] max-h-[80vh] sm:max-h-[85vh] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3.5 sm:gap-4 pointer-events-auto ${isLeftPanelOpen ? "sm:left-16" : "sm:left-0"
                  }`}
              >
                {/* Header with Title + Live Result + Reset */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[var(--brand-orange)] shrink-0">
                      <Filter className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--ink-primary)]">Filter & Urutan UMKM</h3>
                      <p className="text-xs text-[var(--ink-muted)]">Kategori, wilayah, harga & rating</p>
                    </div>
                  </div>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[var(--brand-red)] hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                      title="Reset Semua Filter"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Section 1: Kategori Usaha (Multi-select) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                      Kategori Usaha
                    </span>
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      {selectedCategories.length} dari 5 aktif
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(KATEGORI_RINTIK).map((cat) => {
                      const isEnabled = selectedCategories.includes(cat.id);
                      const count = categoryCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => onToggleCategory(cat.id)}
                          style={{
                            backgroundColor: isEnabled ? cat.warna : "var(--color-bg)",
                            color: isEnabled ? "var(--color-white)" : "var(--ink-primary)",
                            borderColor: isEnabled ? cat.warna : "var(--border-subtle)",
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${isEnabled ? "shadow-xs font-bold" : "opacity-75 hover:opacity-100"
                            }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: isEnabled ? "var(--color-white)" : cat.warna,
                            }}
                          />
                          <span>{cat.nama}</span>
                          <span
                            className={`text-[11px] ${isEnabled ? "text-white/90" : "text-[var(--ink-muted)]"
                              }`}
                          >
                            ({count.toLocaleString("id-ID")})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Wilayah Administrasi (Kecamatan & Kelurahan side-by-side) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                    Wilayah Administrasi
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dropdown Kecamatan */}
                    <div className="relative">
                      <select
                        value={selectedKecamatan}
                        onChange={(e) => onSelectKecamatan(e.target.value)}
                        className={`w-full appearance-none text-xs font-semibold pl-3 pr-8 py-2 rounded-xl border outline-none cursor-pointer focus:ring-2 focus:ring-[var(--focus-ring)] ${selectedKecamatan !== "Semua"
                          ? "bg-orange-50 text-[var(--brand-orange)] border-orange-300 font-bold"
                          : "bg-[var(--color-bg)] text-[var(--ink-primary)] border-[var(--border-cream)]"
                          }`}
                      >
                        <option value="Semua" className="bg-white text-[var(--ink-primary)]">Kecamatan: Semua</option>
                        {DAFTAR_KECAMATAN.map((kec) => (
                          <option key={kec} value={kec} className="bg-white text-[var(--ink-primary)]">
                            {kec}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedKecamatan !== "Semua" ? "text-[var(--brand-orange)]" : "text-[var(--ink-muted)]"}`} />
                    </div>

                    {/* Dropdown Kelurahan */}
                    <div className="relative">
                      <select
                        value={selectedKelurahan}
                        onChange={(e) => onSelectKelurahan(e.target.value)}
                        disabled={selectedKecamatan === "Semua"}
                        className={`w-full appearance-none text-xs font-semibold pl-3 pr-8 py-2 rounded-xl border outline-none cursor-pointer focus:ring-2 focus:ring-[var(--focus-ring)] ${selectedKecamatan === "Semua"
                          ? "bg-gray-100 text-[var(--ink-muted)] border-gray-200 cursor-not-allowed opacity-60"
                          : selectedKelurahan !== "Semua"
                            ? "bg-orange-50 text-[var(--brand-orange)] border-orange-300 font-bold"
                            : "bg-[var(--color-bg)] text-[var(--ink-primary)] border-[var(--border-cream)]"
                          }`}
                      >
                        <option value="Semua" className="bg-white text-[var(--ink-primary)]">
                          {selectedKecamatan === "Semua" ? "Kelurahan: Pilih Kec." : "Kelurahan: Semua"}
                        </option>
                        {kelurahanOptions.map((kel) => (
                          <option key={kel} value={kel} className="bg-white text-[var(--ink-primary)]">
                            {kel}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedKelurahan !== "Semua" ? "text-[var(--brand-orange)]" : "text-[var(--ink-muted)]"}`} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Urutkan Angka & Rating (Bisa salah satu atau keduanya) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ink-secondary)] uppercase tracking-wider">
                      Urutkan Angka & Rating
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] font-medium">Bisa salah satu / keduanya</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dropdown Harga */}
                    <div className="relative">
                      <select
                        value={priceSort}
                        onChange={(e) => onPriceSortChange(e.target.value as PriceSortOrder)}
                        className={`w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-[var(--focus-ring)] ${priceSort !== "none"
                          ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                          : "bg-[var(--color-bg)] text-[var(--ink-primary)] border-[var(--border-cream)]"
                          }`}
                      >
                        <option value="none" className="bg-white text-[var(--ink-primary)]">Harga: Terkait</option>
                        <option value="asc" className="bg-white text-[var(--ink-primary)]">Harga: Terendah</option>
                        <option value="desc" className="bg-white text-[var(--ink-primary)]">Harga: Terbesar</option>
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${priceSort !== "none" ? "text-white" : "text-[var(--ink-muted)]"}`} />
                    </div>

                    {/* Dropdown Rating */}
                    <div className="relative">
                      <select
                        value={ratingSort}
                        onChange={(e) => onRatingSortChange(e.target.value as RatingSortOrder)}
                        className={`w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-[var(--focus-ring)] ${ratingSort !== "none"
                          ? "bg-[var(--brand-orange)] text-white border-[var(--brand-orange-hover)] shadow-xs"
                          : "bg-[var(--color-bg)] text-[var(--ink-primary)] border-[var(--border-cream)]"
                          }`}
                      >
                        <option value="none" className="bg-white text-[var(--ink-primary)]">Rating: Terkait</option>
                        <option value="desc" className="bg-white text-[var(--ink-primary)]">Rating: Terbesar</option>
                        <option value="asc" className="bg-white text-[var(--ink-primary)]">Rating: Terendah</option>
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${ratingSort !== "none" ? "text-white" : "text-[var(--ink-muted)]"}`} />
                    </div>
                  </div>
                </div>

                {/* Footer: Live Count + Tutup Button */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--ink-secondary)]">
                    Hasil: <strong className="text-[var(--brand-red)] font-bold">{totalFilteredCount.toLocaleString("id-ID")}</strong> UMKM
                  </span>
                  <button
                    type="button"
                    onClick={onToggleFilter}
                    className="px-4 py-1.5 rounded-full bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    Tutup Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* D. BUTTON RADIUS: TEPAT DI SEBELAH KANAN BUTTON FILTER */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleRadius}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-md border transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isRadiusOpen
                ? "bg-[var(--bg-surface-white)] text-[var(--brand-orange)] border-[var(--brand-orange)] ring-2 ring-[var(--brand-orange)]/20"
                : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
                }`}
            >
              <span>Radius:</span>
              <span className="font-bold text-[var(--brand-red)]">
                {radiusMeters <= 0
                  ? "0 KM"
                  : radiusMeters >= 1000
                    ? `${(radiusMeters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} KM`
                    : `${radiusMeters} m`}
              </span>
              {isRadiusOpen ? (
                <ChevronUp className="w-4 h-4 text-[var(--ink-muted)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--ink-muted)]" />
              )}
            </button>

            {/* Backdrop Mobile untuk Radius */}
            {isRadiusOpen && (
              <div
                className="fixed inset-0 bg-black/40 z-40 sm:hidden pointer-events-auto animate-in fade-in duration-150"
                onClick={onToggleRadius}
              />
            )}

            {/* RADIUS POPUP / EXPANDED SELECTOR: 0 - 20 KM CUSTOM, NON-RIGID, ODD VALUES INCLUDED */}
            {isRadiusOpen && (
              <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-3 sm:bottom-auto sm:top-full sm:left-0 sm:mt-2 bg-[var(--bg-surface-white)] rounded-2xl p-4 shadow-xl border border-[var(--border-subtle)] sm:w-80 md:w-88 max-h-[80vh] overflow-y-auto pointer-events-auto flex flex-col gap-3.5 z-50 animate-in fade-in duration-150">
                {/* Header with live value and per-1km steppers */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[var(--ink-primary)]">
                      Radius Jangkauan
                    </div>
                    <div className="text-xs text-[var(--ink-muted)]">
                      Jarak custom 0 sampai 20 KM
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-[var(--brand-red)] bg-red-50 border border-red-200 px-3 py-0.5 rounded-full shadow-xs">
                      {radiusMeters <= 0
                        ? "0 KM"
                        : radiusMeters >= 1000
                          ? `${(radiusMeters / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} KM`
                          : `${radiusMeters} m`}
                    </span>
                  </div>
                </div>

                {/* Continuous Range Slider (0 to 20,000 meters, step 100m for completely non-rigid selection) */}
                <div className="flex flex-col gap-1.5">
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="100"
                    value={radiusMeters}
                    onChange={(e) => onRadiusChange(Number(e.target.value))}
                    className="w-full accent-[var(--brand-orange)] cursor-pointer h-2.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-xs text-[var(--ink-muted)] font-medium px-0.5">
                    <span>0</span>
                    <span>5 KM</span>
                    <span>10 KM</span>
                    <span>15 KM</span>
                    <span>20 KM</span>
                  </div>
                </div>

                {/* Stepper Buttons for Quick Single Kilometer Adjustments (supports any odd or even Km) */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--color-bg)] rounded-xl border border-[var(--border-subtle)] text-sm">
                  <span className="text-xs sm:text-sm font-medium text-[var(--ink-secondary)]">
                    Sesuaikan per 1 KM:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRadiusChange(Math.max(0, radiusMeters - 1000))}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-surface-white)] hover:bg-[var(--border-cream)] active:scale-[0.98] text-[var(--ink-primary)] font-bold flex items-center justify-center transition-colors border border-[var(--border-subtle)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] text-sm"
                      title="Kurangi 1 KM"
                    >
                      -
                    </button>
                    <span className="min-w-[48px] text-center font-bold text-[var(--ink-primary)] text-sm">
                      {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(0)} KM` : `${radiusMeters}m`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRadiusChange(Math.min(20000, radiusMeters + 1000))}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-surface-white)] hover:bg-[var(--border-cream)] active:scale-[0.98] text-[var(--ink-primary)] font-bold flex items-center justify-center transition-colors border border-[var(--border-subtle)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] text-sm"
                      title="Tambah 1 KM"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Milestone Quick Jump Buttons (Requested: 250m, 500m, 1km, 2km, 3km, 4km, 5km, 10km, 15km, 20km) */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--ink-muted)]">
                    Preset Cepat
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: "250m", value: 250 },
                      { label: "500m", value: 500 },
                      { label: "1 KM", value: 1000 },
                      { label: "2 KM", value: 2000 },
                      { label: "3 KM", value: 3000 },
                      { label: "4 KM", value: 4000 },
                      { label: "5 KM", value: 5000 },
                      { label: "10 KM", value: 10000 },
                      { label: "15 KM", value: 15000 },
                      { label: "20 KM", value: 20000 },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => onRadiusChange(item.value)}
                        className={`py-1 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${radiusMeters === item.value
                          ? "bg-[var(--brand-orange)] text-[var(--ink-on-dark)] border-[var(--brand-orange)] shadow-xs"
                          : "bg-[var(--color-bg)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:bg-[var(--border-cream)]"
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RIGHT FLOATING BUTTON: STATISTIK PERSEBARAN (Desktop & Tablet only, mobile uses row 1 button) */}
      <div className="hidden sm:flex absolute top-4 right-4 pointer-events-auto items-center gap-2 z-20">
        <button
          type="button"
          onClick={onToggleStatistics}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-sm font-bold shadow-lg border transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] whitespace-nowrap ${isStatisticsOpen
            ? "bg-[var(--brand-red)] text-[var(--ink-on-dark)] border-[var(--brand-red)]"
            : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
            }`}
        >
          <BarChart2
            className={`w-4 h-4 ${isStatisticsOpen ? "text-[var(--ink-on-dark)]" : "text-[var(--brand-red)]"
              }`}
          />
          <span>Statistik</span>
        </button>
      </div>

      {/* 4. LEFT FLOATING PANEL (4 DISTINCT STATES) */}
      {isLeftPanelOpen && (
        <div className="absolute top-[86px] sm:top-[68px] left-0 sm:left-4 right-0 sm:right-auto bottom-0 sm:bottom-6 w-full max-w-full sm:max-w-[400px] bg-[var(--bg-surface-white)] sm:rounded-2xl shadow-2xl border-t sm:border border-[var(--border-subtle)] flex flex-col pointer-events-auto overflow-hidden z-25">
          {/* STATE 1: DAFTAR UMKM */}
          {sidebarState === "LIST" && (
            <div className="flex flex-col h-full">
              {/* Header Panel */}
              <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--ink-primary)]">
                    {totalFilteredCount.toLocaleString("id-ID")} UMKM di Kota Bogor
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-0.5">
                    {priceSort !== "none" && ratingSort !== "none"
                      ? `Diurutkan Rating ${ratingSort === "desc" ? "Terbesar" : "Terendah"} & Harga ${priceSort === "asc" ? "Terendah" : "Terbesar"}`
                      : priceSort !== "none"
                        ? `Diurutkan Harga ${priceSort === "asc" ? "Terendah" : "Terbesar"}`
                        : ratingSort !== "none"
                          ? `Diurutkan Rating ${ratingSort === "desc" ? "Terbesar" : "Terendah"}`
                          : "Diurutkan terdekat dari titik referensi Anda"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleLeftPanel}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--border-cream)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  title="Tutup Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Filter & Sort Toolbar: Angka (Harga) & Rating (Bisa salah satu atau 2-2nya) */}
              <div className="px-3.5 py-2 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider">
                    Urutkan:
                  </span>

                  {/* Button Urutkan Angka / Harga */}
                  <button
                    type="button"
                    onClick={() => {
                      if (priceSort === "none") onPriceSortChange("asc");
                      else if (priceSort === "asc") onPriceSortChange("desc");
                      else onPriceSortChange("none");
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${priceSort !== "none"
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:border-amber-400"
                      }`}
                    title="Klik untuk mengubah urutan harga: Terendah / Terbesar / Terkait"
                  >
                    <span>
                      {priceSort === "none" && "Harga"}
                      {priceSort === "asc" && "Harga: Terendah"}
                      {priceSort === "desc" && "Harga: Terbesar"}
                    </span>
                  </button>

                  {/* Button Urutkan Rating */}
                  <button
                    type="button"
                    onClick={() => {
                      if (ratingSort === "none") onRatingSortChange("desc");
                      else if (ratingSort === "desc") onRatingSortChange("asc");
                      else onRatingSortChange("none");
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${ratingSort !== "none"
                      ? "bg-[var(--brand-orange)] text-white border-[var(--brand-orange-hover)] shadow-xs"
                      : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:border-[var(--brand-orange)]"
                      }`}
                    title="Klik untuk mengubah urutan rating: Terbesar / Terendah / Terkait"
                  >
                    <span>
                      {ratingSort === "none" && "Rating"}
                      {ratingSort === "desc" && "Rating: Terbesar"}
                      {ratingSort === "asc" && "Rating: Terendah"}
                    </span>
                  </button>
                </div>

                {/* Reset Urutan jika salah satu atau 2-2nya aktif */}
                {(priceSort !== "none" || ratingSort !== "none") && (
                  <button
                    type="button"
                    onClick={() => {
                      onPriceSortChange("none");
                      onRatingSortChange("none");
                    }}
                    className="text-[11px] font-bold text-[var(--brand-red)] hover:underline cursor-pointer"
                  >
                    Reset Urutan
                  </button>
                )}
              </div>

              {/* Scrollable UMKM Card List */}
              <div
                onScroll={handleListScroll}
                className="flex-1 overflow-y-auto p-3 space-y-2.5"
              >
                {umkmList.length === 0 ? (
                  <div className="p-6 text-center text-[var(--ink-muted)] text-sm">
                    Tidak ada UMKM yang ditemukan dalam radius atau filter ini.
                  </div>
                ) : (
                  visibleUmkmList.map((item) => {
                    const catToken = KATEGORI_RINTIK[item.kategori] || {
                      warna: "var(--brand-orange)",
                      nama: item.kategori,
                    };

                    return (
                      <div
                        key={item.id_umkm}
                        onClick={() => onSelectUmkm(item)}
                        className="group flex flex-col gap-1.5 p-3.5 bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--brand-orange)] transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-[var(--ink-primary)] truncate group-hover:text-[var(--brand-red)]">
                            {item.nama_umkm}
                          </h3>
                          <span
                            style={{
                              backgroundColor: catToken.warna,
                              color: "var(--color-white)",
                            }}
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0"
                          >
                            {catToken.nama}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[var(--ink-muted)] line-clamp-1">
                          {item.deskripsi_produk || "Produk kreatif khas Kota Bogor"}
                        </p>

                        {/* Indikator Rating & Range Harga */}
                        <div className="flex items-center gap-2 text-xs font-medium pt-0.5">
                          <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{item.rating != null ? item.rating.toFixed(1) : "4.8"}</span>
                          </span>
                          <span className="text-[var(--ink-muted)]">·</span>
                          <span className="font-semibold text-[var(--ink-primary)] truncate">
                            {item.range_harga || "Rp 15.000 - Rp 50.000"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs sm:text-sm pt-1.5 border-t border-[var(--border-subtle)]">
                          <span className="flex items-center gap-1.5 text-[var(--ink-secondary)] truncate">
                            <MapPin className="w-3.5 h-3.5 text-[var(--brand-red)] shrink-0" />
                            <span className="truncate">
                              {item.kelurahan || item.kecamatan || "Kota Bogor"}
                            </span>
                          </span>

                          {item.jarak_meter != null && (
                            <span className="text-[var(--brand-red)] font-bold text-xs sm:text-sm shrink-0">
                              ± {item.jarak_meter >= 1000 ? `${(item.jarak_meter / 1000).toFixed(1)} KM` : `${item.jarak_meter} m`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer Count */}
              <div className="p-2.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)] text-center text-xs text-[var(--ink-muted)] font-medium">
                Menampilkan {Math.min(umkmList.length, visibleCount)} dari {TOTAL_UMKM_VALID.toLocaleString("id-ID")} UMKM · Data tervalidasi 23 Sep 2026
              </div>
            </div>
          )}

          {/* STATE 2: DETAIL UMKM (Map Pengunjung-3) */}
          {sidebarState === "DETAIL" && selectedUmkm && (
            <div className="flex flex-col h-full">
              {/* Back Link */}
              <div className="p-3.5 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSetSidebarState("LIST")}
                  className="flex items-center gap-1.5 text-sm font-bold text-[var(--brand-red)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Hasil pencarian</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleLeftPanel}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title & Category Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-extrabold text-[var(--ink-primary)]">
                      {selectedUmkm.nama_umkm}
                    </h2>
                    <span
                      style={{
                        backgroundColor:
                          KATEGORI_RINTIK[selectedUmkm.kategori]?.warna || "var(--brand-orange)",
                        color: "var(--color-white)",
                      }}
                      className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full shrink-0"
                    >
                      {selectedUmkm.kategori}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm text-[var(--ink-muted)]">
                    <span className="font-semibold flex items-center gap-1 text-[var(--ink-primary)]">
                      <Star className="w-4 h-4 fill-[var(--brand-orange)] text-[var(--brand-orange)]" />
                      <span>{selectedUmkm.rating || "4.8"}</span>
                    </span>
                    <span>·</span>
                    <span>{selectedUmkm.range_harga || "Rp 15.000 - Rp 100.000"}</span>
                  </div>
                </div>

                {/* Structured Attributes */}
                <div className="space-y-3.5 text-sm">
                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Deskripsi Produk
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm leading-relaxed">
                      {selectedUmkm.deskripsi_produk ||
                        "Menghasilkan ragam produk berkualitas khas Kota Bogor dengan proses kreatif dan bahan baku lokal pilihan."}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Alamat
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm">
                      {selectedUmkm.alamat || "Kota Bogor, Jawa Barat"}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Kelurahan / Kecamatan
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 font-medium text-xs sm:text-sm">
                      {selectedUmkm.kelurahan || "-"}, {selectedUmkm.kecamatan || "Kota Bogor"}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Koordinat
                    </span>
                    <p className="font-mono text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm">
                      {selectedUmkm.latitude.toFixed(6)}, {selectedUmkm.longitude.toFixed(6)}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Sumber Data
                    </span>
                    <p className="text-[var(--ink-muted)] text-xs sm:text-sm mt-0.5">
                      Dinas Koperasi dan UKM Kota Bogor / Validasi Survei Lapangan 23 Sep 2026
                    </p>
                  </div>
                </div>

                {/* Informational Box (Mandatory Attribution per Mockup 3) */}
                <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-primary)] text-[var(--ink-primary)] text-xs sm:text-sm flex gap-2.5">
                  <Info className="w-4 h-4 text-[var(--brand-orange)] shrink-0 mt-0.5" />
                  <span>
                    Posisi pada peta berada di tingkat kelurahan, bukan titik presisi gerai.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)] flex gap-2">
                <button
                  type="button"
                  onClick={() => onSetSidebarState("ROUTE")}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-[var(--ink-on-dark)] text-sm font-bold transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Rute ke sini</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRadiusChange(1000);
                    onSetSidebarState("LIST");
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] border border-[var(--border-subtle)] text-[var(--ink-primary)] text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  UMKM terdekat
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: PANDUAN RUTE OSRM (Map Pengunjung-4) */}
          {sidebarState === "ROUTE" && selectedUmkm && (
            <div className="flex flex-col h-full">
              {/* Back Link */}
              <div className="p-3 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSetSidebarState("DETAIL")}
                  className="flex items-center gap-1.5 text-sm font-bold text-[var(--brand-red)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Detail UMKM</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleLeftPanel}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Route Parameters */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <h2 className="text-base font-bold text-[var(--ink-primary)]">
                  Rute ke {selectedUmkm.nama_umkm}
                </h2>

                {/* Origin & Destination Card */}
                <div className="p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--border-cream)] space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--map-user-blue)] shrink-0" />
                    <span className="text-[var(--ink-secondary)]">
                      Titik awal: <strong>Lokasi Anda (titik biru)</strong>
                    </span>
                  </div>
                  <div className="h-4 border-l-2 border-dashed border-[var(--border-cream)] ml-1" />
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-red)] shrink-0" />
                    <span className="text-[var(--ink-secondary)] truncate">
                      Tujuan: <strong>{selectedUmkm.nama_umkm}</strong> · {selectedUmkm.kelurahan}
                    </span>
                  </div>
                </div>

                {/* Transport Mode Tabs */}
                <div>
                  <span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)] block mb-1.5">
                    Moda Transportasi
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "motor" as TransportMode, label: "Motor", icon: Bike, speed: "30 km/jam" },
                      { id: "mobil" as TransportMode, label: "Mobil", icon: Car, speed: "22 km/jam" },
                      { id: "jalan_kaki" as TransportMode, label: "Jalan kaki", icon: Footprints, speed: "4.8 km/jam" },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isActive = routeMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => onSelectRouteMode(mode.id)}
                          className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl border transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isActive
                            ? "bg-[var(--color-primary)] text-[var(--ink-primary)] border-[var(--brand-orange)] font-bold shadow-sm"
                            : "bg-[var(--bg-surface-white)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
                            }`}
                        >
                          <Icon className="w-4 h-4 mb-0.5" />
                          <span className="text-sm font-semibold">{mode.label}</span>
                          <span className="text-[11px] opacity-80">{mode.speed}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Route Result Estimate Card */}
                {isRoutingLoading ? (
                  <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-primary)] text-center text-sm text-[var(--ink-primary)] motion-safe:animate-pulse">
                    Menghitung rute navigasi terbaik…
                  </div>
                ) : routeResult ? (
                  <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--brand-red)]">
                    <div className="text-xl font-extrabold text-[var(--brand-red)]">
                      ± {routeResult.distanceKm} KM · {routeResult.durationMinutes} mnt
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1">
                      {routeResult.isFallback
                        ? "Garis lurus estimasi (Layanan OSRM eksternal sedang sibuk)"
                        : "Estimasi dari layanan rute OSRM."}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)] flex gap-2">
                <button
                  type="button"
                  onClick={onToggleSetOrigin}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isSettingOrigin
                    ? "bg-[var(--brand-red)] text-[var(--ink-on-dark)] border-[var(--brand-red)]"
                    : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
                    }`}
                >
                  <Crosshair className="w-4 h-4" />
                  <span>{isSettingOrigin ? "Klik peta untuk titik" : "Ganti titik awal"}</span>
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedUmkm.latitude},${selectedUmkm.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-[var(--ink-on-dark)] text-sm font-bold transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Mulai rute</span>
                </a>
              </div>
            </div>
          )}

          {/* STATE 4: HASIL KOSONG (Map Pengunjung-5) */}
          {sidebarState === "EMPTY" && (
            <div className="flex flex-col h-full justify-between p-6 text-center">
              <div className="my-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--color-bg)] text-[var(--brand-red)] flex items-center justify-center mx-auto border border-[var(--brand-red)]">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--brand-red)]">
                  Tidak ada UMKM yang sesuai
                </h3>
                <p className="text-sm text-[var(--ink-muted)]">
                  Coba kata kunci lain, atau hapus filter yang aktif.
                </p>
              </div>

              <button
                type="button"
                onClick={onClearFilters}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] border border-[var(--border-subtle)] text-sm font-bold text-[var(--ink-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Hapus pencarian
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. RIGHT DRAWER: STATISTIK PERSEBARAN (Map Pengunjung-2) - LAYER PALING ATAS (z-50) */}
      {isStatisticsOpen && (
        <div className="absolute top-[56px] sm:top-16 right-0 sm:right-4 left-0 sm:left-auto bottom-0 sm:bottom-6 w-full max-w-full sm:max-w-[360px] bg-[var(--bg-surface-white)] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t sm:border border-[var(--border-subtle)] flex flex-col pointer-events-auto overflow-hidden z-50 animate-in fade-in duration-150">
          {/* Header */}
          <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink-primary)]">
              <BarChart2 className="w-4 h-4 text-[var(--brand-red)]" />
              <span>Statistik persebaran</span>
            </div>
            <button
              type="button"
              onClick={onToggleStatistics}
              className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
            {/* Total Count Display */}
            <div>
              <div className="text-3xl font-black text-[var(--brand-red)]">
                {totalFilteredCount.toLocaleString("id-ID")}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)]">
                UMKM · {selectedKecamatan !== "Semua" ? selectedKecamatan : "Kota Bogor"}
              </div>
            </div>

            {/* Breakdown Per Kategori */}
            <div>
              <span className="font-bold text-xs sm:text-sm text-[var(--ink-muted)] block mb-2">
                Per Kategori
              </span>
              <div className="space-y-2.5">
                {Object.values(KATEGORI_RINTIK).map((cat) => {
                  const count = categoryCounts[cat.id] || 0;
                  const pct = totalFilteredCount > 0 ? (count / totalFilteredCount) * 100 : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-xs sm:text-sm mb-0.5">
                        <span className="font-medium text-[var(--ink-secondary)]">
                          {cat.nama}
                        </span>
                        <span className="font-bold text-[var(--ink-primary)]">
                          {count.toLocaleString("id-ID")} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                        <div
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cat.warna,
                          }}
                          className="h-full rounded-full transition-opacity duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Per Kecamatan (Semua Kategori Ground Truth) */}
            <div>
              <span className="font-bold text-xs sm:text-sm text-[var(--ink-muted)] block mb-2">
                Per Kecamatan (Semua Kategori)
              </span>
              <div className="space-y-2.5">
                {STATISTIK_KECAMATAN_RINTIK.map((dist) => {
                  const isCurrentSelected = selectedKecamatan === dist.nama;
                  return (
                    <div
                      key={dist.nama}
                      onClick={() => onSelectKecamatan(isCurrentSelected ? "Semua" : dist.nama)}
                      className="cursor-pointer group"
                    >
                      <div className="flex justify-between text-xs sm:text-sm mb-0.5">
                        <span
                          className={`font-medium ${isCurrentSelected
                            ? "text-[var(--brand-red)] font-bold"
                            : "text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]"
                            }`}
                        >
                          {dist.nama}
                        </span>
                        <span className="font-bold text-[var(--ink-primary)]">
                          {dist.jumlah} ({dist.persentase}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
                        <div
                          style={{
                            width: `${dist.persentase * 3.8}%`,
                            backgroundColor: isCurrentSelected ? "var(--brand-red)" : dist.warna,
                          }}
                          className="h-full rounded-full transition-opacity duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOTTOM-RIGHT CONTROLS: LAYER DRAWER & RECENTER */}
      <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 pointer-events-auto flex flex-col items-end gap-2 sm:gap-2.5">
        {/* Layer Peta Drawer (Map Pengunjung-6) */}
        {isLayersOpen && (
          <div className="bg-[var(--bg-surface-white)] rounded-2xl p-4 shadow-2xl border border-[var(--border-subtle)] w-64 mb-1 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-sm font-bold text-[var(--ink-primary)] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[var(--brand-orange)]" />
                <span>Layer peta</span>
              </span>
              <button
                type="button"
                onClick={onToggleLayers}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showUmkm}
                  onChange={onToggleShowUmkm}
                  className="rounded accent-[var(--brand-orange)]"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Titik UMKM (1.225)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showWilayah}
                  onChange={onToggleShowWilayah}
                  className="rounded accent-[var(--brand-orange)]"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Batas Administrasi</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSekolah}
                  onChange={onToggleShowSekolah}
                  className="rounded accent-[var(--brand-orange)]"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Sekolah & Kampus</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showJalan}
                  onChange={onToggleShowJalan}
                  className="rounded accent-[var(--brand-orange)]"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Jaringan Jalan</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPermukiman}
                  onChange={onToggleShowPermukiman}
                  className="rounded accent-[var(--brand-orange)]"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Area Permukiman</span>
              </label>
            </div>

            <div className="pt-1.5 text-xs text-[var(--ink-muted)] border-t border-[var(--border-subtle)]">
              Layer Jalan dan Permukiman tampil sesuai validasi spasial.
            </div>
          </div>
        )}

        {/* Controls Container: Layer (atas) + Row [Lokasi Saya (kiri) | Zoom +/- (kanan)] */}
        <div className="flex flex-col items-end gap-2">
          {/* Button Layer: tepat di atas button +/- */}
          <button
            type="button"
            onClick={onToggleLayers}
            className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-colors active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isLayersOpen
              ? "bg-[var(--brand-orange)] text-[var(--ink-on-dark)] border-[var(--brand-orange)]"
              : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
              }`}
            title="Layer Peta"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Bottom Row: Button Lokasi Saya di sebelah kiri Button Zoom +/- */}
          <div className="flex items-center gap-2">
            {/* Button Lokasi Saya */}
            <button
              type="button"
              onClick={onRecenterUser}
              className="w-10 h-10 rounded-full bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] active:scale-[0.98] text-[var(--ink-primary)] shadow-lg border border-[var(--border-subtle)] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              title="Pusatkan ke Lokasi Saya"
            >
              <Crosshair className="w-5 h-5 text-blue-600" />
            </button>

            {/* Button +/- Zoom In/Out */}
            <div className="flex flex-col w-10 bg-[var(--bg-surface-white)] rounded-xl shadow-lg border border-[var(--border-subtle)] overflow-hidden">
              <button
                type="button"
                onClick={onZoomIn}
                className="w-10 h-9 flex items-center justify-center hover:bg-[var(--color-bg)] active:scale-[0.95] text-[var(--ink-primary)] transition-colors border-b border-[var(--border-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                title="Perbesar Peta (Zoom In)"
              >
                <Plus className="w-4 h-4 text-[var(--ink-primary)]" />
              </button>
              <button
                type="button"
                onClick={onZoomOut}
                className="w-10 h-9 flex items-center justify-center hover:bg-[var(--color-bg)] active:scale-[0.95] text-[var(--ink-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                title="Perkecil Peta (Zoom Out)"
              >
                <Minus className="w-4 h-4 text-[var(--ink-primary)]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. BOTTOM-LEFT TOGGLE BUTTON FOR LEFT PANEL (Google Maps Style) */}
      <div className={`absolute bottom-3 sm:bottom-6 left-3 sm:left-6 pointer-events-auto z-20 ${(isLeftPanelOpen || isFilterOpen || isRadiusOpen) ? "hidden sm:block" : "block"}`}>
        <button
          type="button"
          onClick={onToggleLeftPanel}
          className="w-10 h-10 rounded-full bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] active:scale-[0.98] text-[var(--ink-primary)] shadow-lg border border-[var(--border-subtle)] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          title={isLeftPanelOpen ? "Sembunyikan Panel" : "Tampilkan Daftar UMKM"}
        >
          {isLeftPanelOpen ? (
            <X className="w-5 h-5 text-[var(--brand-red)]" />
          ) : (
            <Store className="w-5 h-5 text-[var(--brand-red)]" />
          )}
        </button>
      </div>
    </div>
  );
}

export default MapPengunjungUI;
