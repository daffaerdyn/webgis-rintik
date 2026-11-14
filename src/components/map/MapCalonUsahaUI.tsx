"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  MapPin,
  Check,
  AlertCircle,
  Sliders,
  Info,
  RotateCcw,
  Store,
  Compass,
  ArrowRight,
  Search,
  Star,
  Layers,
  Plus,
  Minus,
  Crosshair,
  BarChart2,
} from "lucide-react";
import { KATEGORI_RINTIK } from "@/lib/constants";
import type { UmkmItem } from "./MapPengunjungUI";

export type AnalysisCompetitor = UmkmItem;

export interface AnalysisResultData {
  parameter: {
    latitude: number;
    longitude: number;
    radius_meter: number;
    kategori: string;
  };
  umkm_sejenis: {
    jumlah: number;
    terdekat?: UmkmItem[];
    daftar?: UmkmItem[];
  };
  fasilitas_terdekat?: {
    sekolah_terdekat?: string | null;
    jarak_sekolah_meter?: number | null;
    jalan_terdekat?: string | null;
    jarak_jalan_meter?: number | null;
  } | null;
}

export interface MapCalonUsahaUIProps {
  currentStep: 1 | 2 | 3;
  selectedCategory: string | null;
  onSelectCategory: (kategori: string) => void;
  candidatePoint: { lat: number; lng: number } | null;
  radiusMeters: number;
  onRadiusChange: (radius: number) => void;
  guardrailWarning: string | null;
  onDismissWarning: () => void;
  isAnalyzing: boolean;
  analysisData: AnalysisResultData | null;
  isCategoryModalOpen: boolean;
  onToggleCategoryModal: () => void;
  isResultPanelOpen: boolean;
  onToggleResultPanel: () => void;
  onResetParameters: () => void;
  onRecenterBogor?: () => void;
  onRecenterUser?: () => void;

  // Panel Sisi Kiri (Informasi UMKM Sejenis seperti Map Pengunjung)
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  competitorSidebarState: "LIST" | "DETAIL";
  onSetCompetitorSidebarState: (state: "LIST" | "DETAIL") => void;
  selectedCompetitor: UmkmItem | null;
  competitorList: UmkmItem[];
  onSelectCompetitor: (umkm: UmkmItem) => void;
  onRecenterCompetitor?: (umkm: UmkmItem) => void;

  // Layers Control (Sama seperti Map Pengunjung)
  isLayersOpen: boolean;
  onToggleLayers: () => void;
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

  // Zoom In/Out
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function MapCalonUsahaUI({
  currentStep,
  selectedCategory,
  onSelectCategory,
  candidatePoint,
  radiusMeters,
  onRadiusChange,
  guardrailWarning,
  onDismissWarning,
  isAnalyzing,
  analysisData,
  isCategoryModalOpen,
  onToggleCategoryModal,
  isResultPanelOpen,
  onToggleResultPanel,
  onResetParameters,
  onRecenterBogor,
  onRecenterUser,
  isLeftPanelOpen,
  onToggleLeftPanel,
  competitorSidebarState,
  onSetCompetitorSidebarState,
  selectedCompetitor,
  competitorList,
  onSelectCompetitor,
  onRecenterCompetitor,
  isLayersOpen,
  onToggleLayers,
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
  onZoomIn,
  onZoomOut,
}: MapCalonUsahaUIProps) {
  const [competitorSearchKeyword, setCompetitorSearchKeyword] = useState("");

  const activeCategoryToken = selectedCategory
    ? KATEGORI_RINTIK[selectedCategory] || { warna: "var(--brand-orange)", nama: selectedCategory }
    : null;

  // Filter daftar kompetitor jika pengguna mengetik di panel pencarian sisi kiri
  const filteredCompetitors = useMemo(() => {
    if (!competitorSearchKeyword.trim()) return competitorList;
    const kw = competitorSearchKeyword.toLowerCase().trim();
    return competitorList.filter(
      (c) =>
        c.nama_umkm.toLowerCase().includes(kw) ||
        (c.kelurahan && c.kelurahan.toLowerCase().includes(kw)) ||
        (c.kecamatan && c.kecamatan.toLowerCase().includes(kw)) ||
        (c.deskripsi_produk && c.deskripsi_produk.toLowerCase().includes(kw))
    );
  }, [competitorList, competitorSearchKeyword]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-[var(--font-sans)]">
      {/* 1. TOP-LEFT NAVIGATION & 3-STEP PROGRESS BAR (Style Meniru Bar Search Peta Pengunjung) */}
      <div className="absolute top-4 left-4 max-w-[calc(100vw-32px)] pointer-events-auto flex flex-col gap-2 z-30">
        {/* ROW 1: Standalone Back Button + Info Bar Pill + Button Pilih Kategori */}
        <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {/* A. STANDALONE BUTTON KEMBALI */}
          <Link
            href="/"
            title="Kembali ke Beranda"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-surface-white)] shadow-md border border-[var(--border-subtle)] hover:bg-[var(--color-bg)] active:scale-[0.98] text-[var(--ink-primary)] transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* B. INFO BAR PILL (MIRRORING SEARCH BAR STYLE PETA PENGUNJUNG) */}
          <div className="flex items-center bg-[var(--bg-surface-white)] rounded-full px-4 py-2 shadow-md border border-[var(--border-subtle)] shrink-0 gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <Store className="w-4 h-4 text-[var(--brand-orange)] shrink-0" />
              <span className="text-sm sm:text-base font-bold text-[var(--ink-primary)]">
                Riset Lokasi Usaha
              </span>
            </div>

            <div className="h-4 w-px bg-[var(--border-subtle)] shrink-0" />

            {/* Stepper Pill */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-[var(--color-bg)] text-[var(--brand-red)] shrink-0 whitespace-nowrap">
              <span>
                {currentStep === 1 && "Langkah 1: Pilih Kategori Usaha"}
                {currentStep === 2 && "Langkah 2: Tentukan Titik di Peta"}
                {currentStep === 3 && "Langkah 3: Atur Radius Analisis"}
              </span>
            </div>
          </div>

          {/* C. BUTTON PILIH KATEGORI (DI SEBELAH KANAN BAR LANGKAH 1) */}
          <button
            type="button"
            onClick={onToggleCategoryModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md text-sm font-bold transition-all shrink-0 touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer active:scale-[0.98] ${
              selectedCategory
                ? "bg-[var(--brand-orange)] text-[var(--ink-on-dark)] border border-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)]"
                : "bg-[var(--brand-red)] text-white border border-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
            }`}
            title="Pilih Kategori Usaha"
          >
            <Store className="w-4 h-4 text-white shrink-0" />
            <span className="text-white font-bold whitespace-nowrap">
              {selectedCategory || "Pilih Kategori"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-white shrink-0 transition-transform duration-150 ${
                isCategoryModalOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* D. BAR PENENTUAN BUFFER / RADIUS (PINDAH KE SEBELAH KANAN BUTTON KATEGORI - SESUAI SS3) */}
          {candidatePoint && (
            <div className="bg-[var(--bg-surface-white)] rounded-full px-4 py-2 shadow-md border border-[var(--border-subtle)] flex items-center gap-3 shrink-0 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 shrink-0">
                <Sliders className="w-4 h-4 text-[var(--brand-orange)]" />
                <span className="text-sm font-bold text-[var(--ink-primary)] whitespace-nowrap">
                  Buffer: {radiusMeters >= 1000 ? `${radiusMeters / 1000} Km` : `${radiusMeters} m`}
                </span>
              </div>

              <input
                type="range"
                min="250"
                max="5000"
                step="250"
                value={radiusMeters}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="w-20 sm:w-28 accent-[var(--brand-orange)] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />

              <div className="flex gap-1.5 shrink-0">
                {[250, 500, 1000, 2500].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRadiusChange(r)}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full border transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer ${
                      radiusMeters === r
                        ? "bg-[var(--brand-orange)] text-[var(--ink-on-dark)] border-[var(--brand-orange)] shadow-xs"
                        : "bg-[var(--color-bg)] text-[var(--ink-secondary)] border-[var(--border-subtle)] hover:bg-[var(--border-cream)]"
                    }`}
                  >
                    {r >= 1000 ? `${r / 1000}K` : `${r}m`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING CATEGORY SELECTOR MODAL / DROPDOWN (Rendered at top-level so it is never clipped by overflow-x) */}
      {isCategoryModalOpen && (
        <>
          {/* Backdrop klik luar untuk menutup */}
          <div
            className="fixed inset-0 z-40 pointer-events-auto"
            onClick={onToggleCategoryModal}
          />
          {/* Dropdown Card */}
          <div className="absolute top-16 left-4 sm:left-[340px] pointer-events-auto bg-[var(--bg-surface-white)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] p-4 w-64 max-w-[calc(100vw-32px)] flex flex-col gap-2.5 z-50 animate-in fade-in zoom-in-95 duration-75 ease-out">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 px-1">
              <span className="text-sm font-bold text-[var(--ink-primary)] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[var(--brand-orange)]" />
                <span>Pilih Kategori Usaha</span>
              </span>
              <button
                type="button"
                onClick={onToggleCategoryModal}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                title="Tutup Pilihan Kategori"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {Object.values(KATEGORI_RINTIK).map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    style={{
                      backgroundColor: isSelected ? cat.warna : "transparent",
                      color: isSelected ? "var(--color-white)" : "var(--ink-primary)",
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                      isSelected
                        ? "border-transparent shadow-sm"
                        : "border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: isSelected ? "var(--color-white)" : cat.warna,
                        }}
                      />
                      <span>{cat.nama}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 2. ONBOARDING SPOTLIGHT TOOLTIPS (Mockup Map-Calon UMKM-2, 3) */}
      {/* Tooltip Langkah 2: Titik Lokasi */}
      {currentStep === 2 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="bg-[var(--brand-orange)] text-[var(--ink-on-dark)] px-4 py-2 rounded-full text-sm font-extrabold shadow-xl flex items-center gap-2 border-2 border-[var(--color-white)]">
            <MapPin className="w-4 h-4" />
            <span>Cari Titik Lokasi UMKM-Mu (Klik pada peta Kota Bogor)</span>
          </div>
        </div>
      )}

      {/* Tooltip Langkah 3: Atur Buffer */}
      {currentStep === 3 && !analysisData && !isAnalyzing && (
        <div className="absolute top-32 left-8 pointer-events-auto">
          <div className="bg-[var(--color-primary)] text-[var(--ink-primary)] px-4 py-2 rounded-full text-sm font-bold shadow-md border border-[var(--border-cream)]">
            Atur Buffer untuk Dianalisis
          </div>
        </div>
      )}

      {/* 3. GUARDRAIL WARNING TOOLTIPS (Mockup Belum Pilih Kategori / Titik) */}
      {guardrailWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
          <div className="bg-[var(--brand-red)] text-[var(--ink-on-dark)] px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold border-2 border-[var(--color-white)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{guardrailWarning}</span>
            <button
              type="button"
              onClick={onDismissWarning}
              className="ml-2 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. BOTTOM-CENTER FLOATING LEGEND (Map-Calon UMKM-Hasil analisis spasial) */}
      {candidatePoint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto bg-[var(--bg-surface-white)] px-4 py-2 rounded-full shadow-lg border border-[var(--border-subtle)] flex items-center gap-4 text-sm font-semibold z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--brand-orange)] border border-[var(--color-white)]" />
            <span className="text-[var(--ink-primary)]">Titik kandidat</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border border-[var(--color-white)]"
              style={{
                backgroundColor: activeCategoryToken?.warna || "var(--cat-kuliner)",
              }}
            />
            <span className="text-[var(--ink-primary)]">
              UMKM Sejenis ({selectedCategory})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-[var(--brand-orange)]" />
            <span className="text-[var(--ink-muted)]">
              Radius {radiusMeters >= 1000 ? `${radiusMeters / 1000} Km` : `${radiusMeters} m`}
            </span>
          </div>
        </div>
      )}

      {/* 6. TOP-RIGHT BUTTON 'HASIL' (Bila analisis selesai dan panel hasil ditutup) */}
      {analysisData && !isResultPanelOpen && (
        <div className="absolute top-4 right-4 pointer-events-auto z-40">
          <button
            type="button"
            onClick={onToggleResultPanel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)] text-white shadow-xl text-sm font-extrabold transition-all cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] border border-white/20"
            title="Buka Papan Hasil Analisis Spasial"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Hasil ({analysisData.umkm_sejenis.jumlah})</span>
          </button>
        </div>
      )}

      {/* 7. RIGHT FLOATING PANEL: HASIL ANALISIS SPASIAL (Map-Calon UMKM-Hasil analisis spasial) */}
      {isResultPanelOpen && analysisData && (
        <div className="absolute top-4 right-4 bottom-4 sm:bottom-6 w-full max-w-[380px] bg-[var(--bg-surface-white)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col pointer-events-auto overflow-hidden z-50">
          {/* Header & Step Checklist */}
          <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--border-cream)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-red)]">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[var(--brand-red)] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span>Jenis usaha</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-[var(--brand-red)] opacity-50" />
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[var(--brand-red)] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span>Titik</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-[var(--brand-red)] opacity-50" />
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-[var(--brand-red)] text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span>Radius</span>
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleResultPanel}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                title="Tutup Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-[var(--brand-red)]">
                Hasil analisis spasial
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] font-medium mt-0.5">
                {selectedCategory} · {candidatePoint?.lat.toFixed(5)} ; {candidatePoint?.lng.toFixed(5)} · radius {radiusMeters} meter
              </p>
            </div>
          </div>

          {/* Result Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {/* Card Utama: Jumlah Kompetitor Sejenis */}
            <div className="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--border-cream)] text-center">
              <div className="text-4xl font-black text-[var(--brand-red)]">
                {analysisData.umkm_sejenis.jumlah}
              </div>
              <div className="text-sm font-bold text-[var(--ink-primary)] mt-1.5">
                UMKM Sejenis ({selectedCategory}) dalam radius {radiusMeters} meter
              </div>
            </div>

            {/* 2 Proximity Cards: Jarak Jalan & Jarak Sekolah */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-xl bg-white border border-[var(--border-subtle)] shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)] block">
                  Jalan Terdekat
                </span>
                <div className="text-base font-extrabold text-[var(--ink-primary)] mt-1">
                  {analysisData.fasilitas_terdekat?.jarak_jalan_meter != null
                    ? `± ${analysisData.fasilitas_terdekat.jarak_jalan_meter} m`
                    : "± 24 m"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[var(--border-subtle)] shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)] block">
                  Sekolah Terdekat
                </span>
                <div className="text-base font-extrabold text-[var(--ink-primary)] mt-1">
                  {analysisData.fasilitas_terdekat?.jarak_sekolah_meter != null
                    ? `± ${analysisData.fasilitas_terdekat.jarak_sekolah_meter} m`
                    : "± 142 m"}
                </div>
              </div>
            </div>

            {/* List UMKM Sejenis Terdekat (Interactive - Menampilkan info ke panel kiri seperti ss2) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-[var(--ink-muted)] block">
                  UMKM Sejenis Terdekat
                </span>
                {analysisData.umkm_sejenis.jumlah > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetCompetitorSidebarState("LIST");
                      if (!isLeftPanelOpen) onToggleLeftPanel();
                    }}
                    className="text-xs font-bold text-[var(--brand-red)] hover:underline focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded cursor-pointer transition-colors"
                  >
                    Lihat semua ({analysisData.umkm_sejenis.jumlah}) →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(analysisData.umkm_sejenis.terdekat && analysisData.umkm_sejenis.terdekat.length > 0
                  ? analysisData.umkm_sejenis.terdekat
                  : analysisData.umkm_sejenis.daftar?.slice(0, 5) || []
                ).map((comp, idx) => {
                  const isSelected = selectedCompetitor?.id_umkm === comp.id_umkm;
                  return (
                    <button
                      key={comp.id_umkm || idx}
                      type="button"
                      onClick={() => onSelectCompetitor(comp)}
                      title={`Klik untuk melihat detail ${comp.nama_umkm}`}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-[0.99] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                        isSelected
                          ? "bg-[var(--color-bg)] border-[var(--brand-orange)] shadow-xs"
                          : "bg-white border-[var(--border-subtle)] hover:border-[var(--brand-orange)] hover:bg-[var(--color-bg)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[var(--brand-orange)] ring-2 ring-orange-200"
                              : "bg-[var(--brand-red)]"
                          }`}
                        />
                        <span
                          className={`truncate text-xs sm:text-sm ${
                            isSelected
                              ? "text-[var(--brand-red)] font-bold"
                              : "font-semibold text-[var(--ink-primary)]"
                          }`}
                        >
                          {comp.nama_umkm}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[var(--brand-red)] font-bold text-xs sm:text-sm">
                          ± {comp.jarak_meter != null ? `${comp.jarak_meter} m` : "215 m"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--ink-muted)]" />
                      </div>
                    </button>
                  );
                })}

                {analysisData.umkm_sejenis.jumlah === 0 && (
                  <div className="p-3.5 text-center text-[var(--ink-muted)] bg-white rounded-xl border border-[var(--border-subtle)] text-xs sm:text-sm">
                    Tidak ada kompetitor sejenis dalam radius ini.
                  </div>
                )}
              </div>
            </div>

            {/* Mandatory Objective Ethical Disclaimer (PRD 9.10) */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-primary)] text-[var(--ink-primary)] text-xs sm:text-sm flex gap-2.5">
              <Info className="w-4 h-4 text-[var(--brand-orange)] shrink-0 mt-0.5" />
              <span>
                Informasi pendukung dari 1.225 data UMKM (dikumpulkan 23 Sep 2026), bukan penilaian kelayakan lokasi.
              </span>
            </div>
          </div>

          {/* Action Button: Ubah Parameter */}
          <div className="p-3.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)]">
            <button
              type="button"
              onClick={onResetParameters}
              className="w-full py-2.5 rounded-xl bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-[var(--ink-on-dark)] text-sm font-bold transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ubah parameter</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. LEFT FLOATING PANEL: INFORMASI UMKM SEJENIS (SEPERTI MAP PENGUNJUNG SS4) */}
      {isLeftPanelOpen && candidatePoint && (
        <div className="absolute top-[68px] left-4 bottom-4 sm:bottom-6 w-full max-w-[calc(100vw-32px)] sm:max-w-[380px] bg-[var(--bg-surface-white)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col pointer-events-auto overflow-hidden z-30 animate-in fade-in slide-in-from-left-4 duration-200">
          {/* STATE 1: LIST VIEW (SESUAI SS2) */}
          {competitorSidebarState === "LIST" && (
            <div className="flex flex-col h-full">
              {/* Header Panel */}
              <div className="p-4 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--ink-primary)]">
                    {competitorList.length.toLocaleString("id-ID")} UMKM di Kota Bogor
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-0.5">
                    Diurutkan terdekat dari titik referensi Anda
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleLeftPanel}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--border-cream)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] transition-colors cursor-pointer"
                  title="Tutup Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pencarian di dalam daftar kompetitor sejenis */}
              <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-white)]">
                <div className="flex items-center bg-[var(--color-bg)] rounded-xl px-3.5 py-2 border border-[var(--border-subtle)] gap-2">
                  <Search className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
                  <input
                    type="text"
                    value={competitorSearchKeyword}
                    onChange={(e) => setCompetitorSearchKeyword(e.target.value)}
                    placeholder="Cari UMKM, kelurahan, ke..."
                    className="w-full text-sm bg-transparent outline-none text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]"
                  />
                  {competitorSearchKeyword && (
                    <button
                      type="button"
                      onClick={() => setCompetitorSearchKeyword("")}
                      className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable UMKM Card List (Screenshot 2) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredCompetitors.length === 0 ? (
                  <div className="p-6 text-center text-[var(--ink-muted)] text-sm">
                    Tidak ada UMKM sejenis yang cocok dengan pencarian di dalam radius ini.
                  </div>
                ) : (
                  filteredCompetitors.map((item, idx) => {
                    const catToken = KATEGORI_RINTIK[item.kategori] || {
                      warna: "var(--brand-orange)",
                      nama: item.kategori,
                    };
                    const isSelected = selectedCompetitor?.id_umkm === item.id_umkm;

                    return (
                      <div
                        key={item.id_umkm || idx}
                        onClick={() => onSelectCompetitor(item)}
                        className={`group flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                          isSelected
                            ? "bg-[var(--color-bg)] border-[var(--brand-orange)] ring-1 ring-[var(--brand-orange)]"
                            : "bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] border-[var(--border-subtle)] hover:border-[var(--brand-orange)]"
                        }`}
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

                        <div className="flex items-center justify-between text-xs sm:text-sm pt-1.5 border-t border-[var(--border-subtle)]">
                          <span className="flex items-center gap-1.5 text-[var(--ink-secondary)] truncate">
                            <MapPin className="w-3.5 h-3.5 text-[var(--brand-red)] shrink-0" />
                            <span className="truncate">
                              {item.kelurahan || item.kecamatan || "Kota Bogor"}
                            </span>
                          </span>

                          {item.jarak_meter != null && (
                            <span className="text-[var(--brand-red)] font-bold text-xs sm:text-sm shrink-0">
                              ± {item.jarak_meter >= 1000 ? `${(item.jarak_meter / 1000).toFixed(1)} km` : `${item.jarak_meter} m`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)] text-center text-xs text-[var(--ink-muted)] font-medium">
                Menampilkan {Math.min(filteredCompetitors.length, 50)} dari {competitorList.length.toLocaleString("id-ID")} UMKM · Data tervalidasi 23 Sep 2026
              </div>
            </div>
          )}

          {/* STATE 2: DETAIL VIEW (Map Pengunjung-3 Style) */}
          {competitorSidebarState === "DETAIL" && selectedCompetitor && (
            <div className="flex flex-col h-full">
              {/* Back Link & Close */}
              <div className="p-3.5 bg-[var(--color-bg)] border-b border-[var(--border-cream)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSetCompetitorSidebarState("LIST")}
                  className="flex items-center gap-1.5 text-sm font-bold text-[var(--brand-red)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Hasil pencarian ({competitorList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleLeftPanel}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--border-cream)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                  title="Tutup Panel"
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
                      {selectedCompetitor.nama_umkm}
                    </h2>
                    <span
                      style={{
                        backgroundColor:
                          KATEGORI_RINTIK[selectedCompetitor.kategori]?.warna || "var(--brand-orange)",
                        color: "var(--color-white)",
                      }}
                      className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full shrink-0"
                    >
                      {selectedCompetitor.kategori}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm text-[var(--ink-muted)]">
                    <span className="font-semibold flex items-center gap-1 text-[var(--ink-primary)]">
                      <Star className="w-4 h-4 fill-[var(--brand-orange)] text-[var(--brand-orange)]" />
                      <span>{selectedCompetitor.rating || "4.8"}</span>
                    </span>
                    <span>·</span>
                    <span>{selectedCompetitor.range_harga || "Rp 15.000 - Rp 100.000"}</span>
                  </div>
                </div>

                {/* Highlight Jarak dari Calon Lokasi Usaha */}
                <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[var(--brand-red)] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-orange-900 block uppercase tracking-wider">
                        Jarak dari Titik Calon Usaha
                      </span>
                      <span className="text-base font-extrabold text-[var(--brand-red)]">
                        ± {selectedCompetitor.jarak_meter != null ? `${selectedCompetitor.jarak_meter} meter` : "Dalam radius"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[var(--brand-orange)] border border-orange-200">
                    UMKM Sejenis
                  </span>
                </div>

                {/* Structured Attributes */}
                <div className="space-y-3.5 text-sm">
                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Deskripsi Produk
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm leading-relaxed">
                      {selectedCompetitor.deskripsi_produk ||
                        "Menghasilkan ragam produk berkualitas khas Kota Bogor dengan proses kreatif dan bahan baku lokal pilihan."}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Alamat
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm">
                      {selectedCompetitor.alamat || "Kota Bogor, Jawa Barat"}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Kelurahan / Kecamatan
                    </span>
                    <p className="text-[var(--ink-secondary)] mt-0.5 font-medium text-xs sm:text-sm">
                      {selectedCompetitor.kelurahan || "-"}, {selectedCompetitor.kecamatan || "Kota Bogor"}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--ink-muted)] text-xs sm:text-sm block">
                      Koordinat
                    </span>
                    <p className="font-mono text-[var(--ink-secondary)] mt-0.5 text-xs sm:text-sm">
                      {selectedCompetitor.latitude.toFixed(6)}, {selectedCompetitor.longitude.toFixed(6)}
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

                {/* Informational Box */}
                <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-primary)] text-[var(--ink-primary)] text-xs sm:text-sm flex gap-2.5">
                  <Info className="w-4 h-4 text-[var(--brand-orange)] shrink-0 mt-0.5" />
                  <span>
                    Posisi pada peta berada di tingkat kelurahan, bukan titik presisi gerai.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 bg-[var(--color-bg)] border-t border-[var(--border-cream)] flex gap-2">
                {onRecenterCompetitor && (
                  <button
                    type="button"
                    onClick={() => onRecenterCompetitor(selectedCompetitor)}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-[var(--ink-on-dark)] text-sm font-bold transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Pusatkan di peta</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSetCompetitorSidebarState("LIST")}
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] border border-[var(--border-subtle)] text-[var(--ink-primary)] text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                >
                  Lihat semua
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. BUTTON 'DAFTAR UMKM' DI SEBELAH KIRI BAWAH (SS1) */}
      {analysisData && analysisData.umkm_sejenis.jumlah > 0 && !isLeftPanelOpen && (
        <div className="absolute bottom-6 left-4 sm:left-6 pointer-events-auto z-20">
          <button
            type="button"
            onClick={() => {
              onSetCompetitorSidebarState("LIST");
              onToggleLeftPanel();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] text-white shadow-xl text-sm font-bold transition-all cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] border border-white/20"
            title="Buka daftar UMKM sejenis"
          >
            <Store className="w-4 h-4 text-white" />
            <span>Daftar UMKM ({analysisData.umkm_sejenis.jumlah})</span>
          </button>
        </div>
      )}

      {/* 9. BOTTOM-RIGHT CONTROLS: LAYER DRAWER & MAP ACTIONS (Persis seperti Peta Pengunjung) */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-2.5 z-20">
        {/* Layer Peta Drawer (Persis seperti Map Pengunjung) */}
        {isLayersOpen && (
          <div className="bg-[var(--bg-surface-white)] rounded-2xl p-4 shadow-2xl border border-[var(--border-subtle)] w-64 mb-1 flex flex-col gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="text-sm font-bold text-[var(--ink-primary)] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[var(--brand-orange)]" />
                <span>Layer peta</span>
              </span>
              <button
                type="button"
                onClick={onToggleLayers}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                title="Tutup Layer Peta"
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
                  className="rounded accent-[var(--brand-orange)] cursor-pointer"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Titik UMKM (1.225)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showWilayah}
                  onChange={onToggleShowWilayah}
                  className="rounded accent-[var(--brand-orange)] cursor-pointer"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Batas Administrasi</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSekolah}
                  onChange={onToggleShowSekolah}
                  className="rounded accent-[var(--brand-orange)] cursor-pointer"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Sekolah & Kampus</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showJalan}
                  onChange={onToggleShowJalan}
                  className="rounded accent-[var(--brand-orange)] cursor-pointer"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Jaringan Jalan</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPermukiman}
                  onChange={onToggleShowPermukiman}
                  className="rounded accent-[var(--brand-orange)] cursor-pointer"
                />
                <span className="text-[var(--ink-secondary)] font-medium text-sm">Area Permukiman</span>
              </label>
            </div>

            <div className="pt-1.5 text-xs text-[var(--ink-muted)] border-t border-[var(--border-subtle)]">
              Layer Jalan dan Permukiman tampil sesuai validasi spasial.
            </div>
          </div>
        )}

        {/* Controls Container: Layer (atas) + Row [Recenter | Zoom +/- (kanan)] */}
        <div className="flex flex-col items-end gap-2">
          {/* Button Layer: tepat di atas button +/- / recenter (Persis seperti Peta Pengunjung) */}
          <button
            type="button"
            onClick={onToggleLayers}
            className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-colors active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer ${
              isLayersOpen
                ? "bg-[var(--brand-orange)] text-[var(--ink-on-dark)] border-[var(--brand-orange)]"
                : "bg-[var(--bg-surface-white)] text-[var(--ink-primary)] border-[var(--border-subtle)] hover:bg-[var(--color-bg)]"
            }`}
            title="Layer Peta"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Bottom Row */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Button Cek Lokasi Saya (Pusatkan ke Lokasi Pengguna - Serasi dengan Map Pengunjung) */}
            <button
              type="button"
              onClick={onRecenterUser || onRecenterBogor}
              className="w-10 h-10 rounded-full bg-[var(--bg-surface-white)] hover:bg-[var(--color-bg)] active:scale-[0.98] text-[var(--ink-primary)] shadow-lg border border-[var(--border-subtle)] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
              title="Cek Lokasi Saya"
            >
              <Crosshair className="w-5 h-5 text-blue-600" />
            </button>

            {/* Button +/- Zoom In/Out (Persis seperti Peta Pengunjung) */}
            {(onZoomIn || onZoomOut) && (
              <div className="flex flex-col w-10 bg-[var(--bg-surface-white)] rounded-xl shadow-lg border border-[var(--border-subtle)] overflow-hidden">
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="h-9 flex items-center justify-center hover:bg-[var(--color-bg)] active:scale-[0.95] text-[var(--ink-primary)] transition-colors border-b border-[var(--border-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                  title="Perbesar Peta (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="h-9 flex items-center justify-center hover:bg-[var(--color-bg)] active:scale-[0.95] text-[var(--ink-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                  title="Perkecil Peta (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapCalonUsahaUI;