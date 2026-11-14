"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Marker, useMap } from "react-leaflet";
import {
  createCategoryPin,
  createCompetitorPin,
} from "./MapCustomPins";
import {
  createCanvasPinOverlay,
  type CanvasPinItem,
  type CanvasPinOverlayHandle,
  type CanvasPinVariant,
} from "./MapCanvasPinRenderer";
import type { UmkmItem } from "./MapPengunjungUI";

export interface MapCanvasPinLayerProps {
  pins: UmkmItem[];
  variant?: CanvasPinVariant;
  categoryOverride?: string | null;
  selectedId?: string | null;
  interactive?: boolean;
  onSelectPin?: (item: UmkmItem) => void;
}

/**
 * Layer Pin UMKM & Kompetitor Berbasis HTML5 Canvas + Viewport Culling.
 * Merender ribuan pin ke dalam 1 elemen <canvas> terakselerasi GPU (60 FPS saat zoom),
 * dan hanya merender 1 elemen DOM <Marker> untuk pin yang sedang aktif/terpilih.
 */
export const MapCanvasPinLayer = React.memo(function MapCanvasPinLayer({
  pins,
  variant = "category",
  categoryOverride = null,
  selectedId = null,
  interactive = true,
  onSelectPin,
}: MapCanvasPinLayerProps) {
  const map = useMap();
  const overlayRef = useRef<CanvasPinOverlayHandle<UmkmItem> | null>(null);

  // Transformasi daftar UMKM ke struktur CanvasPinItem ringan
  const canvasItems = useMemo<CanvasPinItem<UmkmItem>[]>(() => {
    return pins.map((item, idx) => ({
      id: item.id_umkm || String(idx),
      lat: item.latitude,
      lng: item.longitude,
      category: categoryOverride || item.kategori,
      data: item,
    }));
  }, [pins, categoryOverride]);

  // Temukan 1 item yang sedang dipilih untuk dirender sebagai <Marker> utama di atas canvas
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return pins.find((p) => p.id_umkm === selectedId) || null;
  }, [pins, selectedId]);

  // Inisialisasi Canvas Overlay sekali saat map siap
  useEffect(() => {
    if (!map) return;

    const handle = createCanvasPinOverlay<UmkmItem>(map, {
      id: `rintik-umkm-pins-${variant}`,
      paneName: "rintikUmkmPinPane",
      zIndex: 580,
      variant,
    });
    overlayRef.current = handle;

    return () => {
      handle.destroy();
      overlayRef.current = null;
    };
  }, [map, variant]);

  // Sinkronisasi data ke Canvas Overlay setiap kali filter/seleksi berubah
  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.updateData(
      canvasItems,
      selectedId,
      interactive,
      onSelectPin
        ? (item) => {
            onSelectPin(item);
          }
        : undefined
    );
  }, [canvasItems, selectedId, interactive, onSelectPin]);

  if (!selectedItem) {
    return null;
  }

  const selectedIcon =
    variant === "competitor"
      ? createCompetitorPin(categoryOverride || selectedItem.kategori, true)
      : createCategoryPin(categoryOverride || selectedItem.kategori, true);

  return (
    <Marker
      key={`selected-${selectedItem.id_umkm}`}
      position={[selectedItem.latitude, selectedItem.longitude]}
      icon={selectedIcon}
      zIndexOffset={1000}
      eventHandlers={{
        click: (e) => {
          if (e.originalEvent) {
            e.originalEvent.stopPropagation();
            (e.originalEvent as unknown as { _rintikPinClicked?: boolean })._rintikPinClicked = true;
          }
          if (onSelectPin) {
            onSelectPin(selectedItem);
          }
        },
      }}
    />
  );
});

export default MapCanvasPinLayer;
