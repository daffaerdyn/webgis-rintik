import type { Metadata } from "next";
import PengunjungClient from "./PengunjungClient";

export const metadata: Metadata = {
  title: "Peta Eksplorasi Pengunjung | RINTIK WebGIS Kota Bogor",
  description:
    "Jelajahi 2.993 titik industri kreatif UMKM di Kota Bogor dengan filter kategori, jarak radius terdekat, dan panduan rute navigasi interaktif.",
};

export default function PengunjungPage() {
  return (
    <main className="w-full h-[100dvh] overflow-hidden">
      <PengunjungClient />
    </main>
  );
}
