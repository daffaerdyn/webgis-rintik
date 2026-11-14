"use client";

import dynamic from "next/dynamic";

const MapCalonUsaha = dynamic(
  () => import("@/components/map/MapCalonUsaha"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[var(--bg-surface-white)] shadow-md border border-[var(--border-subtle)] max-w-sm text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] border-t-[var(--brand-orange)] motion-safe:animate-spin" />
          <div>
            <h2 className="text-base font-bold text-[var(--ink-primary)]">
              Memuat Peta Riset Lokasi Usaha
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Menyiapkan modul analisis spasial dan buffer kompetitor…
            </p>
          </div>
        </div>
      </div>
    ),
  }
);

export default function CalonUsahaClient() {
  return <MapCalonUsaha />;
}
