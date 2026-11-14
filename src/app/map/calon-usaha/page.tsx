import type { Metadata } from "next";
import CalonUsahaClient from "./CalonUsahaClient";

export const metadata: Metadata = {
  title: "Peta Analisis Lokasi Calon Usaha | RINTIK WebGIS Kota Bogor",
  description:
    "Lakukan riset geospasial kelayakan lokasi usaha UMKM Kota Bogor secara praktis dalam 3 langkah terarah dengan analisis buffer dan kompetitor sejenis.",
};

export default function CalonUsahaPage() {
  return (
    <main className="w-full h-[100dvh] overflow-hidden">
      <CalonUsahaClient />
    </main>
  );
}
