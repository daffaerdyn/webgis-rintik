"use client";

import L from "leaflet";
import { getCategoryColor } from "./MapCustomPins";

export type CanvasPinVariant = "category" | "competitor" | "school";

export interface CanvasPinItem<T = unknown> {
  id: string;
  lat: number;
  lng: number;
  category?: string | null;
  data: T;
}

interface PinSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

interface DrawnPinEntry<T = unknown> {
  item: CanvasPinItem<T>;
  x: number;
  y: number;
  sprite: PinSprite;
}

interface RegisteredHitLayer {
  id: string;
  zIndex: number;
  isInteractive: () => boolean;
  hitTest: (layerPoint: L.Point) => boolean;
  handleClick: (layerPoint: L.Point, latlng: L.LatLng) => boolean;
}

const spriteCache: Record<string, PinSprite> = {};

const TEARDROP_SVG_PATH =
  "M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z";
const SCHOOL_CAP_TOP_PATH = "M22 10v6M2 10l10-5 10 5-10 5z";
const SCHOOL_CAP_BASE_PATH = "M6 12v5c3 3 9 3 12 0v-5";

function getDpr(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * 1. Pre-rendered 2x Retina Sprite untuk Pin Kategori UMKM (Teardrop)
 */
function getCategorySprite(category?: string | null): PinSprite {
  const color = getCategoryColor(category);
  const dpr = getDpr();
  const key = `cat_${color}_${dpr}`;
  if (spriteCache[key]) return spriteCache[key];

  const width = 30;
  const height = 38;
  const anchorX = 15;
  const anchorY = 36;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);

    // Gambar Teardrop dengan bayangan yang sudah di-bake sekali ke dalam sprite
    ctx.save();
    ctx.translate(2, 2);
    ctx.scale(26 / 28, 34 / 36);

    ctx.shadowColor = "rgba(0, 0, 0, 0.26)";
    ctx.shadowBlur = 3.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.5;

    if (typeof Path2D !== "undefined") {
      const path = new Path2D(TEARDROP_SVG_PATH);
      ctx.fillStyle = color;
      ctx.fill(path);
    }

    // Lingkaran putih tengah (tanpa bayangan)
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.arc(14, 14, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();
  }

  const sprite: PinSprite = { canvas, width, height, anchorX, anchorY };
  spriteCache[key] = sprite;
  return sprite;
}

/**
 * 2. Pre-rendered 2x Retina Sprite untuk Pin Kompetitor (Ring Merah Putus-putus + Teardrop)
 */
function getCompetitorSprite(category?: string | null): PinSprite {
  const color = getCategoryColor(category);
  const dpr = getDpr();
  const key = `comp_${color}_${dpr}`;
  if (spriteCache[key]) return spriteCache[key];

  const width = 36;
  const height = 44;
  const anchorX = 18;
  const anchorY = 40;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);

    // Indikator Ring Merah Putus-putus (#C62828)
    ctx.save();
    ctx.beginPath();
    ctx.arc(18, 17, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "#C62828";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();

    // Teardrop Utama (28x36)
    ctx.save();
    ctx.translate(4, 4);
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.5;

    if (typeof Path2D !== "undefined") {
      const path = new Path2D(TEARDROP_SVG_PATH);
      ctx.fillStyle = color;
      ctx.fill(path);
    }

    // Lingkaran putih & titik merah tengah
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.arc(14, 14, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(14, 14, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#C62828";
    ctx.fill();
    ctx.restore();
  }

  const sprite: PinSprite = { canvas, width, height, anchorX, anchorY };
  spriteCache[key] = sprite;
  return sprite;
}

/**
 * 3. Pre-rendered 2x Retina Sprite untuk Pin Fasilitas Sekolah (Emerald + Ikon Toga)
 */
function getSchoolSprite(): PinSprite {
  const dpr = getDpr();
  const key = `school_${dpr}`;
  if (spriteCache[key]) return spriteCache[key];

  const width = 30;
  const height = 30;
  const anchorX = 15;
  const anchorY = 15;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);

    // Lingkaran Emerald (#059669) + Border Putih
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = 3.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.5;

    ctx.beginPath();
    ctx.arc(15, 15, 11.5, 0, Math.PI * 2);
    ctx.fillStyle = "#059669";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    // Ikon Toga SVG di tengah
    if (typeof Path2D !== "undefined") {
      ctx.translate(8, 8);
      ctx.scale(14 / 24, 14 / 24);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(new Path2D(SCHOOL_CAP_TOP_PATH));
      ctx.stroke(new Path2D(SCHOOL_CAP_BASE_PATH));
    }
    ctx.restore();
  }

  const sprite: PinSprite = { canvas, width, height, anchorX, anchorY };
  spriteCache[key] = sprite;
  return sprite;
}

function getPinSprite(variant: CanvasPinVariant, category?: string | null): PinSprite {
  if (variant === "school") return getSchoolSprite();
  if (variant === "competitor") return getCompetitorSprite(category);
  return getCategorySprite(category);
}

/**
 * Dispatcher terpusat per instance L.Map agar beberapa layer canvas pin
 * (misal Titik UMKM + Titik Sekolah) dapat berbagi deteksi hover dan klik
 * berdasarkan urutan zIndex secara instan.
 */
const mapRegistry = new WeakMap<
  L.Map,
  {
    layers: RegisteredHitLayer[];
    cleanup: () => void;
  }
>();

function registerHitLayerOnMap(map: L.Map, hitLayer: RegisteredHitLayer): () => void {
  let entry = mapRegistry.get(map);

  if (!entry) {
    const layers: RegisteredHitLayer[] = [];

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const anyMap = map as unknown as { _animatingZoom?: boolean };
      const isDragging = Boolean((map.dragging as unknown as { _moving?: boolean; moving?: () => boolean })?._moving || (map.dragging as unknown as { moving?: () => boolean })?.moving?.());
      if (anyMap._animatingZoom || isDragging) {
        return;
      }

      const pt = e.layerPoint;
      let hit = false;
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (l.isInteractive() && l.hitTest(pt)) {
          hit = true;
          break;
        }
      }

      const container = map.getContainer();
      if (container) {
        if (hit) {
          container.style.cursor = "pointer";
        } else if (container.style.cursor === "pointer") {
          container.style.cursor = "";
        }
      }
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      const pt = e.layerPoint;
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        if (l.isInteractive() && l.handleClick(pt, e.latlng)) {
          if (e.originalEvent) {
            (e.originalEvent as unknown as { _rintikPinClicked?: boolean })._rintikPinClicked = true;
          }
          return;
        }
      }
    };

    map.on("mousemove", onMouseMove);
    map.on("click", onClick);

    entry = {
      layers,
      cleanup: () => {
        map.off("mousemove", onMouseMove);
        map.off("click", onClick);
      },
    };
    mapRegistry.set(map, entry);
  }

  entry.layers.push(hitLayer);
  // Urutkan zIndex tertinggi lebih dulu agar layer paling atas mendapat prioritas klik
  entry.layers.sort((a, b) => b.zIndex - a.zIndex);

  return () => {
    const current = mapRegistry.get(map);
    if (!current) return;
    const idx = current.layers.findIndex((l) => l.id === hitLayer.id);
    if (idx !== -1) {
      current.layers.splice(idx, 1);
    }
    if (current.layers.length === 0) {
      current.cleanup();
      mapRegistry.delete(map);
    }
  };
}

export interface CanvasPinOverlayHandle<T = unknown> {
  updateData: (
    items: CanvasPinItem<T>[],
    selectedId?: string | null,
    interactive?: boolean,
    onSelect?: (item: T, latlng: L.LatLng) => void
  ) => void;
  destroy: () => void;
}

/**
 * Membuat layer Canvas terakselerasi GPU (mengikuti pola L.Renderer Leaflet)
 * yang menggambar ribuan pin ke 1 elemen <canvas class="leaflet-zoom-animated">
 * dengan Viewport Culling otomatis.
 */
export function createCanvasPinOverlay<T = unknown>(
  map: L.Map,
  options: {
    id: string;
    paneName: string;
    zIndex: number;
    variant: CanvasPinVariant;
  }
): CanvasPinOverlayHandle<T> {
  const { id, paneName, zIndex, variant } = options;

  // Pastikan pane tersedia dengan zIndex tepat di bawah markerPane (600)
  let pane = map.getPane(paneName);
  if (!pane) {
    pane = map.createPane(paneName);
    pane.style.zIndex = String(zIndex);
    pane.style.pointerEvents = "none";
  }

  const canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated") as HTMLCanvasElement;
  canvas.style.pointerEvents = "none";
  pane.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const padding = 0.2;
  let originCenter: L.LatLng = map.getCenter();
  let originZoom: number = map.getZoom();
  let pixelBounds: L.Bounds | null = null;

  let currentItems: CanvasPinItem<T>[] = [];
  let currentSelectedId: string | null | undefined = null;
  let isInteractive = true;
  let onSelectCallback: ((item: T, latlng: L.LatLng) => void) | undefined;
  let drawnEntries: DrawnPinEntry<T>[] = [];
  let rafId: number | null = null;

  function updateTransform(center: L.LatLng, zoom: number) {
    const scale = map.getZoomScale(zoom, originZoom);
    const viewHalf = map.getSize().multiplyBy(0.5 + padding);
    const currentCenterPoint = map.project(originCenter, zoom);
    const anyMap = map as unknown as {
      _getNewPixelOrigin: (c: L.LatLng, z: number) => L.Point;
    };
    const newPixelOrigin = anyMap._getNewPixelOrigin(center, zoom);
    const topLeftOffset = viewHalf
      .multiplyBy(-scale)
      .add(currentCenterPoint)
      .subtract(newPixelOrigin);

    L.DomUtil.setTransform(canvas, topLeftOffset, scale);
  }

  function redrawNow() {
    rafId = null;
    if (!ctx || !map.getContainer()) return;

    const anyMap = map as unknown as { _animatingZoom?: boolean };
    if (anyMap._animatingZoom && pixelBounds) {
      return;
    }

    const size = map.getSize();
    const min = map.containerPointToLayerPoint(size.multiplyBy(-padding)).round();
    const max = min.add(size.multiplyBy(1 + padding * 2)).round();
    pixelBounds = L.bounds(min, max);
    originCenter = map.getCenter();
    originZoom = map.getZoom();

    L.DomUtil.setPosition(canvas, min);

    const dpr = getDpr();
    const bSize = pixelBounds.getSize();
    const targetW = Math.max(1, bSize.x * dpr);
    const targetH = Math.max(1, bSize.y * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${bSize.x}px`;
      canvas.style.height = `${bSize.y}px`;
    } else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, -min.x * dpr, -min.y * dpr);

    const nextDrawn: DrawnPinEntry<T>[] = [];
    const margin = 44;
    const minX = min.x - margin;
    const maxX = max.x + margin;
    const minY = min.y - margin;
    const maxY = max.y + margin;

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      if (currentSelectedId && item.id === currentSelectedId) {
        // Pin yang sedang terpilih dirender sebagai komponen <Marker> utama di atas canvas
        continue;
      }

      const pt = map.latLngToLayerPoint([item.lat, item.lng]);
      // Viewport Culling: hanya gambar titik yang masuk di area layar (+ margin)
      if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) {
        continue;
      }

      const sprite = getPinSprite(variant, item.category);
      const drawX = Math.round(pt.x - sprite.anchorX);
      const drawY = Math.round(pt.y - sprite.anchorY);

      ctx.drawImage(sprite.canvas, drawX, drawY, sprite.width, sprite.height);
      nextDrawn.push({ item, x: pt.x, y: pt.y, sprite });
    }

    ctx.restore();
    drawnEntries = nextDrawn;
  }

  function scheduleRedraw() {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(redrawNow);
  }

  function onAnimZoom(ev: L.ZoomAnimEvent) {
    updateTransform(ev.center, ev.zoom);
  }

  function onZoom() {
    updateTransform(map.getCenter(), map.getZoom());
  }

  function onViewReset() {
    redrawNow();
  }

  function onMoveEnd() {
    redrawNow();
  }

  function onZoomEnd() {
    redrawNow();
  }

  function findHitEntry(layerPoint: L.Point): DrawnPinEntry<T> | null {
    // Iterasi terbalik agar pin yang digambar paling atas merespons lebih dulu
    for (let i = drawnEntries.length - 1; i >= 0; i--) {
      const entry = drawnEntries[i];
      const { x, y, sprite } = entry;
      const left = x - sprite.anchorX + 2;
      const right = x - sprite.anchorX + sprite.width - 2;
      const top = y - sprite.anchorY + 2;
      const bottom = y - sprite.anchorY + sprite.height - 2;

      if (
        layerPoint.x >= left &&
        layerPoint.x <= right &&
        layerPoint.y >= top &&
        layerPoint.y <= bottom
      ) {
        return entry;
      }
    }
    return null;
  }

  const unregisterHitLayer = registerHitLayerOnMap(map, {
    id,
    zIndex,
    isInteractive: () => isInteractive && drawnEntries.length > 0,
    hitTest: (pt) => findHitEntry(pt) !== null,
    handleClick: (pt, latlng) => {
      const hit = findHitEntry(pt);
      if (hit && onSelectCallback) {
        onSelectCallback(hit.item.data, latlng);
        return true;
      }
      return false;
    },
  });

  map.on("zoomanim", onAnimZoom as L.LeafletEventHandlerFn);
  map.on("zoom", onZoom);
  map.on("viewreset", onViewReset);
  map.on("moveend", onMoveEnd);
  map.on("zoomend", onZoomEnd);
  map.on("resize", onMoveEnd);

  redrawNow();

  return {
    updateData(items, selectedId, interactive = true, onSelect) {
      currentItems = items;
      currentSelectedId = selectedId;
      isInteractive = interactive;
      onSelectCallback = onSelect;
      scheduleRedraw();
    },
    destroy() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      unregisterHitLayer();
      map.off("zoomanim", onAnimZoom as L.LeafletEventHandlerFn);
      map.off("zoom", onZoom);
      map.off("viewreset", onViewReset);
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onZoomEnd);
      map.off("resize", onMoveEnd);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    },
  };
}
