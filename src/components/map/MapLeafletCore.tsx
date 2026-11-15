"use client";

import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type L from "leaflet";

/**
 * Koordinat pusat Kota Bogor dan konfigurasi default
 */
export const BOGOR_COORDINATES = {
  center: [-6.5950, 106.7900] as [number, number],
  defaultZoom: 13,
  minZoom: 11,
  maxZoom: 19,
  // Bounding box Kota Bogor
  bounds: {
    minLat: -6.68,
    maxLat: -6.50,
    minLng: 106.73,
    maxLng: 106.85,
  },
};

export type TileProviderType = "esri" | "carto-light" | "carto-voyager";

export const TILE_PROVIDERS: Record<TileProviderType, { url: string; attribution: string; maxZoom: number }> = {
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC",
    maxZoom: 19,
  },
  "carto-light": {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19,
  },
  "carto-voyager": {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19,
  },
};

export interface MapLeafletCoreProps {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  tileProvider?: TileProviderType;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onMapReady?: (map: L.Map) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  scrollWheelZoom?: boolean;
}

/**
 * Helper internal untuk menangkap instance Leaflet Map dan event klik
 */
function LeafletMapObserver({
  onMapReady,
  onMapClick,
}: {
  onMapReady?: (map: L.Map) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current && map) {
      readyRef.current = true;
      // Invalidate size agar layout tile render sempurna
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      if (onMapReady) {
        onMapReady(map);
      }
    }
  }, [map, onMapReady]);

  useMapEvents({
    click(e) {
      const origEvent = e.originalEvent as unknown as { _rintikPinClicked?: boolean } | undefined;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      queueMicrotask(() => {
        if (origEvent?._rintikPinClicked) {
          return;
        }
        if (onMapClick) {
          onMapClick({ lat, lng });
        }
      });
    },
  });

  return null;
}

/**
 * Komponen Dasar Leaflet Map Kota Bogor.
 * Dirancang khusus untuk client-side rendering (SSR: false ready).
 */
export function MapLeafletCore({
  center = BOGOR_COORDINATES.center,
  zoom = BOGOR_COORDINATES.defaultZoom,
  minZoom = BOGOR_COORDINATES.minZoom,
  maxZoom = BOGOR_COORDINATES.maxZoom,
  tileProvider = "esri",
  className = "w-full h-full",
  style,
  children,
  onMapReady,
  onMapClick,
  scrollWheelZoom = true,
}: MapLeafletCoreProps) {
  const selectedTile = TILE_PROVIDERS[tileProvider] || TILE_PROVIDERS.esri;

  return (
    <div className={`relative ${className}`} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomControl={false}
        preferCanvas={true}
        wheelPxPerZoomLevel={120}
        scrollWheelZoom={scrollWheelZoom}
        maxBounds={[
          [-6.72, 106.68],
          [-6.46, 106.90],
        ]}
        maxBoundsViscosity={0.8}
        className="w-full h-full z-0"
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url={selectedTile.url}
          attribution={selectedTile.attribution}
          maxZoom={selectedTile.maxZoom}
          updateWhenZooming={false}
          updateWhenIdle={true}
          keepBuffer={2}
        />
        {children}
        <LeafletMapObserver onMapReady={onMapReady} onMapClick={onMapClick} />
      </MapContainer>
    </div>
  );
}

export default MapLeafletCore;
