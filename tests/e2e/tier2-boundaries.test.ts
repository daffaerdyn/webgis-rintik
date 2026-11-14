import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isPointInBogor,
    simulatePostAnalysisLocation,
    simulatePostAnalysisBuffer,
    simulateGetUmkm,
    simulateGetUmkmMap,
    simulateGetUmkmDetail,
    simulateGetRouting,
    loadMasterDataset,
    VisitorMapController,
} from './harness/index.ts';

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (ADVERSARIAL STRESS & RESILIENCE)
// ============================================================================

test('Tier 2: Boundary & Corner Cases', async (t) => {
    await t.test('[T2-01] Out-of-bounds candidate locations are strictly rejected (Kota Bogor Geofencing)', () => {
        const outOfBoundsPoints = [
            { name: 'Cibinong (Kab. Bogor)', lat: -6.482, lng: 106.852 },
            { name: 'Depok', lat: -6.4025, lng: 106.7942 },
            { name: 'Jakarta Pusat (Monas)', lat: -6.1754, lng: 106.8272 },
            { name: 'Puncak / Cisarua', lat: -6.702, lng: 106.945 },
            { name: 'Null Island', lat: 0.0, lng: 0.0 },
        ];

        for (const pt of outOfBoundsPoints) {
            assert.equal(
                isPointInBogor(pt.lat, pt.lng),
                false,
                `Point ${pt.name} [${pt.lat}, ${pt.lng}] must be evaluated as outside Kota Bogor`
            );

            // POST /api/analysis/location rejection
            const resLocation = simulatePostAnalysisLocation({
                latitude: pt.lat,
                longitude: pt.lng,
                radius: 500,
                kategori: 'Kuliner',
            });
            assert.equal(resLocation.status, 400, `Should reject ${pt.name} with HTTP 400`);
            const dLoc = resLocation.data as { success: boolean; message: string };
            assert.equal(dLoc.success, false);
            assert.ok(dLoc.message.includes('luar wilayah Kota Bogor'));

            // POST /api/analysis/buffer rejection
            const resBuffer = simulatePostAnalysisBuffer({
                latitude: pt.lat,
                longitude: pt.lng,
                radius: 500,
            });
            assert.equal(resBuffer.status, 400);
        }
    });

    await t.test('[T2-02] Known internal Kota Bogor coordinates pass geofencing', () => {
        const internalPoints = [
            { name: 'Kebun Raya Bogor (Tengah)', lat: -6.5971, lng: 106.7995 },
            { name: 'Terminal Baranangsiang (Timur)', lat: -6.6062, lng: 106.8080 },
            { name: 'Stasiun Bogor (Tengah)', lat: -6.5950, lng: 106.7900 },
            { name: 'Bantarjati (Utara)', lat: -6.5780, lng: 106.8090 },
            { name: 'Bubulak (Barat)', lat: -6.5650, lng: 106.7450 },
        ];

        for (const pt of internalPoints) {
            const inBogor = isPointInBogor(pt.lat, pt.lng);
            assert.equal(inBogor, true, `Internal point ${pt.name} must pass geofencing`);

            const res = simulatePostAnalysisBuffer({
                latitude: pt.lat,
                longitude: pt.lng,
                radius: 500,
            });
            assert.equal(res.status, 200, `Buffer should generate 200 OK for ${pt.name}`);
        }
    });

    await t.test('[T2-03] Radius parameter lower boundary rejects 0, negative, and non-numeric values', () => {
        const invalidRadii = [0, -1, -500, NaN, '500' as unknown as number, null as unknown as number];

        for (const r of invalidRadii) {
            const res = simulatePostAnalysisLocation({
                latitude: -6.595,
                longitude: 106.79,
                radius: r,
                kategori: 'Kuliner',
            });
            assert.equal(res.status, 400, `Radius ${r} must be rejected with HTTP 400`);
            const d = res.data as { success: boolean; message: string };
            assert.equal(d.success, false);
        }
    });

    await t.test('[T2-04] Radius parameter upper boundary enforces 5,000m maximum limit', () => {
        // Upper bound: 5,000m is valid
        const res5000 = simulatePostAnalysisLocation({
            latitude: -6.595,
            longitude: 106.79,
            radius: 5000,
            kategori: 'Kuliner',
        });
        assert.equal(res5000.status, 200, 'Radius = 5000m must be accepted');

        // Exceeding upper bound: 5,001m and 10,000m are rejected
        const invalidHighRadii = [5001, 10000, 50000];
        for (const r of invalidHighRadii) {
            const res = simulatePostAnalysisLocation({
                latitude: -6.595,
                longitude: 106.79,
                radius: r,
                kategori: 'Kuliner',
            });
            assert.equal(res.status, 400, `Radius ${r}m must be rejected with HTTP 400`);
        }
    });

    await t.test('[T2-05] Non-matching search produces State 4 Empty Card without hallucinations', () => {
        const ctrl = new VisitorMapController();
        const res = simulateGetUmkm({ q: 'NONEXISTENT_UMKM_XYZ_12345' });
        assert.equal(res.status, 200);
        assert.equal(res.data.data.length, 0, 'Must return 0 records');
        assert.equal(res.data.pagination.total, 0);

        ctrl.setSearchQuery('NONEXISTENT_UMKM_XYZ_12345', res.data.data.length);
        assert.equal(ctrl.getState().sidebarState, 'EMPTY', 'Controller must transition to EMPTY state');

        // Test clear search action
        ctrl.clearSearch();
        assert.equal(ctrl.getState().sidebarState, 'LIST');
        assert.equal(ctrl.getState().searchQuery, '');
    });

    await t.test('[T2-06] Null and missing attributes are handled gracefully without runtime exceptions', () => {
        const dataset = loadMasterDataset();
        // Check for any records with null rating
        const recordsWithNullRating = dataset.filter((u) => u.rating === null);
        assert.ok(recordsWithNullRating.length >= 0);

        // Verify simulateGetUmkm sorting handles null ratings without throwing
        const res = simulateGetUmkm({ sort: 'rating' });
        assert.equal(res.status, 200);
        const lastItems = res.data.data.slice(-5);
        for (const item of lastItems) {
            assert.ok(item.rating === null || typeof item.rating === 'number');
        }
    });

    await t.test('[T2-07] Bounding box viewport limits enforce mandatory params and max 0.5 span', () => {
        // Missing parameters -> 400 Bad Request
        const resMissing = simulateGetUmkmMap({});
        assert.equal(resMissing.status, 400);
        assert.equal((resMissing.data as { message: string }).message, 'Bounding Box wajib diisi lengkap');

        // Partial parameters -> 400 Bad Request
        const resPartial = simulateGetUmkmMap({ min_lng: 106.78, min_lat: -6.60 });
        assert.equal(resPartial.status, 400);

        // Span exceeding 0.5 degrees (e.g., entire West Java province) -> 400 Bad Request
        const resTooBroad = simulateGetUmkmMap({
            min_lng: 105.0,
            min_lat: -7.5,
            max_lng: 108.0,
            max_lat: -5.5,
        });
        assert.equal(resTooBroad.status, 400);
        assert.ok((resTooBroad.data as { message: string }).message.includes('terlalu luas'));
    });

    await t.test('[T2-08] External OSRM routing failure triggers resilient fallback polyline', () => {
        const res = simulateGetRouting({
            start_lat: -6.595,
            start_lng: 106.79,
            dest_lat: -6.605,
            dest_lng: 106.80,
            mode: 'motor',
            simulateTimeout: true,
        });

        assert.equal(res.status, 200);
        const d = res.data as Record<string, unknown>;
        assert.equal(d.success, true);
        assert.equal(d.is_fallback, true);
        assert.ok((d.warning as string).includes('OSRM'));
        assert.ok((d.jarak_meter as number) > 0);
        assert.ok((d.durasi_menit as number) > 0);
    });

    await t.test('[T2-09] Malformed, non-standard, or SQL injection UMKM IDs are rejected', () => {
        const maliciousIds = [
            "UMKM' OR 1=1 --",
            '<script>alert(1)</script>',
            'UMKM-BGR-0001', // Hyphenated legacy format rejected by /^UMKM[0-9]+$/
            '12345',
            'random_string',
            '',
        ];

        for (const badId of maliciousIds) {
            const res = simulateGetUmkmDetail(badId);
            assert.equal(res.status, 400, `Bad ID "${badId}" must return HTTP 400`);
            const d = res.data as { success: boolean; message: string };
            assert.equal(d.success, false);
            assert.ok(d.message.includes('tidak valid'));
        }
    });

    await t.test('[T2-10] Non-existent valid-format UMKM ID returns 404 Not Found', () => {
        const res = simulateGetUmkmDetail('UMKM99999');
        assert.equal(res.status, 404);
        const d = res.data as { success: boolean; message: string };
        assert.equal(d.success, false);
        assert.equal(d.message, 'Data UMKM tidak ditemukan');
    });

    await t.test('[T2-11] Unsupported category in spatial analysis returns 400 Bad Request', () => {
        const res = simulatePostAnalysisLocation({
            latitude: -6.595,
            longitude: 106.79,
            radius: 500,
            kategori: 'Otomotif', // Invalid category
        });
        assert.equal(res.status, 400);
        const d = res.data as { success: boolean; message: string };
        assert.equal(d.success, false);
        assert.equal(d.message, 'Kategori UMKM tidak valid');
    });

    await t.test('[T2-12] Pagination out-of-bounds page numbers return empty array without crashing', () => {
        const res = simulateGetUmkm({ page: 9999, limit: 20 });
        assert.equal(res.status, 200);
        assert.equal(res.data.data.length, 0);
        assert.equal(res.data.pagination.page, 9999);
        assert.ok(res.data.pagination.total > 0);
    });
});
