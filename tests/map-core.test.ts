import test from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORY_COLORS,
  getCategoryColor,
  createCategoryPin,
  createSchoolPin,
  createUserDotPin,
  createCandidatePin,
  createCompetitorPin,
} from "../src/components/map/MapCustomPins.ts";

import {
  calculateHaversineDistanceKm,
  hitungDurasiMenit,
  buatGarisLurusFallback,
  getMultiModalRoute,
} from "../src/components/map/MapRoutingService.ts";

test("Milestone 2 — MapCustomPins Component Specifications", async (t) => {
  await t.test("CATEGORY_COLORS must strictly match DESIGN.md locked tokens", () => {
    assert.equal(CATEGORY_COLORS.Kuliner, "#E11D74");
    assert.equal(CATEGORY_COLORS.Fashion, "#FF8F00");
    assert.equal(CATEGORY_COLORS.Jasa, "#000000");
    assert.equal(CATEGORY_COLORS.Kerajinan, "#2E8B3C");
    assert.equal(CATEGORY_COLORS.Teknologi, "#2538B8");
  });

  await t.test("getCategoryColor normalizes various naming variations", () => {
    assert.equal(getCategoryColor("Kuliner"), "#E11D74");
    assert.equal(getCategoryColor("makanan & minuman"), "#E11D74");
    assert.equal(getCategoryColor("Fashion"), "#FF8F00");
    assert.equal(getCategoryColor("pakaian"), "#FF8F00");
    assert.equal(getCategoryColor("Jasa"), "#000000");
    assert.equal(getCategoryColor("servis komputer"), "#000000");
    assert.equal(getCategoryColor("Kerajinan"), "#2E8B3C");
    assert.equal(getCategoryColor("kriya kayu"), "#2E8B3C");
    assert.equal(getCategoryColor("Teknologi"), "#2538B8");
    assert.equal(getCategoryColor("digital agency"), "#2538B8");
    assert.equal(getCategoryColor(null), "#FF8F00");
  });

  await t.test("createCategoryPin generates valid Leaflet DivIcon with teardrop SVG", () => {
    const pin = createCategoryPin("Kuliner");
    assert.ok(pin.options);
    assert.ok(pin.options.html?.includes("#E11D74"));
    assert.ok(pin.options.html?.includes("<svg"));
    assert.deepEqual(pin.options.iconSize, [26, 34]);

    const selectedPin = createCategoryPin("Teknologi", true);
    assert.ok(selectedPin.options.html?.includes("#2538B8"));
    assert.deepEqual(selectedPin.options.iconSize, [32, 40]);
  });

  await t.test("createSchoolPin generates emerald circle with graduation cap SVG", () => {
    const pin = createSchoolPin();
    assert.ok(pin.options);
    assert.ok(pin.options.html?.includes("#059669"));
    assert.ok(pin.options.html?.includes("<svg"));
    assert.deepEqual(pin.options.iconSize, [26, 26]);
  });

  await t.test("createUserDotPin generates blue pulse dot", () => {
    const pin = createUserDotPin();
    assert.ok(pin.options);
    assert.ok(pin.options.html?.includes("#2563EB"));
    assert.deepEqual(pin.options.iconSize, [24, 24]);
  });

  await t.test("createCandidatePin generates amber pin with store icon", () => {
    const pin = createCandidatePin();
    assert.ok(pin.options);
    assert.ok(pin.options.html?.includes("#FF8F00"));
    assert.ok(pin.options.html?.includes("<svg"));
    assert.deepEqual(pin.options.iconSize, [36, 44]);
  });

  await t.test("createCompetitorPin generates category pin with dashed ring indicator", () => {
    const pin = createCompetitorPin("Kuliner");
    assert.ok(pin.options);
    assert.ok(pin.options.html?.includes("#E11D74"));
    assert.ok(pin.options.html?.includes("#C62828"));
    assert.ok(pin.options.html?.includes("dashed"));
    assert.deepEqual(pin.options.iconSize, [32, 40]);
  });
});



test("Milestone 2 — MapRoutingService Multi-Modal Calculations & Fallbacks", async (t) => {
  await t.test("calculateHaversineDistanceKm returns accurate geographic distance", () => {
    // Jarak antara Tugu Kujang (-6.6009, 106.8000) ke Balai Kota Bogor (-6.5950, 106.7900) ~ 1.28 km
    const dist = calculateHaversineDistanceKm(-6.6009, 106.8000, -6.5950, 106.7900);
    assert.ok(dist >= 1.0 && dist <= 1.6, `Distance ${dist} should be around 1.3 km`);
  });

  await t.test("hitungDurasiMenit implements speed models for Motor, Mobil, and Jalan Kaki", () => {
    const distanceKm = 10;
    const durasiMotor = hitungDurasiMenit(distanceKm, "motor");
    const durasiMobil = hitungDurasiMenit(distanceKm, "mobil");
    const durasiJalan = hitungDurasiMenit(distanceKm, "jalan_kaki");

    // Motor: 10km pada 30km/jam = 20 mnt + 1 = 21 mnt
    assert.equal(durasiMotor, 21);
    // Mobil: 10km pada 22km/jam = 28 mnt + 2 = 30 mnt
    assert.equal(durasiMobil, 30);
    // Jalan Kaki: 10km pada 4.8km/jam = 125-126 mnt
    assert.ok(durasiJalan >= 125 && durasiJalan <= 126);

    // Motor harus lebih cepat daripada mobil
    assert.ok(durasiMotor < durasiMobil);
    // Mobil harus lebih cepat daripada jalan kaki
    assert.ok(durasiMobil < durasiJalan);
  });

  await t.test("buatGarisLurusFallback produces valid fallback RouteResult", () => {
    const start = { lat: -6.5950, lng: 106.7900 };
    const dest = { lat: -6.6100, lng: 106.8100 };

    const fallback = buatGarisLurusFallback(start.lat, start.lng, dest.lat, dest.lng, "motor");
    assert.equal(fallback.success, true);
    assert.equal(fallback.isFallback, true);
    assert.ok(fallback.distanceKm > 0);
    assert.ok(fallback.distanceMeters > 0);
    assert.ok(fallback.durationMinutes > 0);
    assert.deepEqual(fallback.coordinates, [
      [start.lat, start.lng],
      [dest.lat, dest.lng],
    ]);
  });

  await t.test("getMultiModalRoute returns fallback result when external server is simulated timeout", async () => {
    const result = await getMultiModalRoute({
      startLat: -6.5950,
      startLng: 106.7900,
      destLat: -6.6100,
      destLng: 106.8100,
      mode: "motor",
      timeoutMs: 1, // Ultra-short timeout to trigger fallback
    });

    assert.equal(result.success, true);
    assert.equal(result.isFallback, true);
    assert.ok(result.distanceKm > 0);
    assert.equal(result.coordinates.length, 2);
  });
});
