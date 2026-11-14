import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    loadMasterDataset,
    getDatasetStatistics,
    loadGeoJson,
    isPointInBogor,
    simulateGetUmkm,
    simulateGetUmkmDetail,
    simulatePostAnalysisLocation,
    simulatePostAnalysisBuffer,
    simulateGetRouting,
    VisitorMapController,
} from './harness/index.ts';
import {
    calculateHaversineDistanceKm,
    hitungDurasiMenit,
    buatGarisLurusFallback,
    createRoutePolyline,
} from '../../src/components/map/MapRoutingService.ts';

// ============================================================================
// TIER 5: ADVERSARIAL COVERAGE HARDENING (CHALLENGER STRESS & INVARIANTS)
// ============================================================================

test('Tier 5: Adversarial Hardening Suite', async (t) => {
    const dataset = loadMasterDataset();

    // ------------------------------------------------------------------------
    // SCENARIO 1: RAPID MULTI-FILTER STRESS TESTING & SYNCHRONOUS STATE
    // ------------------------------------------------------------------------
    await t.test('[T5-01] Rapid multi-filter stress testing and state synchronization churn', () => {
        const ctrl = new VisitorMapController();
        const categories = ['Kuliner', 'Fashion', 'Jasa', 'Kerajinan', 'Teknologi', null];
        const radii = [250, 500, 1000, 2000, 5000];
        const sorts: Array<'rating' | 'jarak' | 'rekomendasi'> = ['rating', 'jarak', 'rekomendasi'];

        // Rapid state churning loop (50 iterations)
        for (let i = 0; i < 50; i++) {
            const cat = categories[i % categories.length];
            const rad = radii[i % radii.length];
            const srt = sorts[i % sorts.length];

            ctrl.selectCategory(cat);
            ctrl.setRadius(rad);

            const st = ctrl.getState();
            assert.equal(st.radiusMeters, rad, `Radius should be updated to ${rad}`);
            assert.ok(
                st.sidebarState === 'LIST' || st.sidebarState === 'EMPTY',
                'State must be either LIST or EMPTY during rapid filter changes'
            );

            // Execute simulated multi-filter query matching current state
            const res = simulateGetUmkm({
                kategori: cat ?? undefined,
                radius: rad,
                latitude: -6.595,
                longitude: 106.79,
                sort: srt === 'jarak' ? 'jarak' : srt === 'rating' ? 'rating' : undefined,
                limit: 10,
            });

            assert.equal(res.status, 200);
            assert.ok(res.data.success);
            assert.ok(Array.isArray(res.data.data));

            // Verify category consistency if category is selected
            if (cat) {
                for (const item of res.data.data) {
                    assert.equal(item.kategori.toLowerCase(), cat.toLowerCase());
                }
            }
        }
    });

    // ------------------------------------------------------------------------
    // SCENARIO 2: EXTREME BOUNDARY COORDINATE EDGE CASES (GEOFENCING)
    // ------------------------------------------------------------------------
    await t.test('[T5-02] Boundary coordinate edge cases at extreme perimeter of Kota Bogor', () => {
        // High-precision geographic boundary evaluation points:
        // [name, lat, lng, expectedInside]
        const perimeterPoints: Array<[string, number, number, boolean]> = [
            // Northern edge: Cibuluh/Kedunghalang vs outside Sukaraja/Cibinong
            ['Kedunghalang (North Inside)', -6.5500, 106.8150, true],
            ['Cibinong Boundary (North Outside)', -6.4800, 106.8400, false],

            // Southern edge: Kertamaya/Bojongkerta vs outside Ciawi/Caringin
            ['Bojongkerta (South Inside)', -6.6500, 106.8350, true],
            ['Caringin (South Outside)', -6.7200, 106.8400, false],

            // Western edge: Bubulak/Situgede vs outside Dramaga (Kab. Bogor)
            ['Situgede (West Inside)', -6.5650, 106.7450, true],
            ['Dramaga Campus IPB (West Outside)', -6.5580, 106.7200, false],

            // Eastern edge: Katulampa/Baranangsiang vs outside Sukaraja (Kab. Bogor)
            ['Katulampa (East Inside)', -6.6146, 106.8295, true],
            ['Cikeas / Gunung Geulis (East Outside)', -6.6400, 106.8900, false],

            // Center: Kebun Raya Bogor (Inside)
            ['Kebun Raya Bogor Center', -6.5971, 106.7995, true],

            // Global extremes
            ['North Pole', 90.0, 0.0, false],
            ['South Pole', -90.0, 0.0, false],
            ['Null Island', 0.0, 0.0, false],
            ['Antipode Point', 6.595, -73.21, false],
        ];

        for (const [name, lat, lng, expectedInside] of perimeterPoints) {
            const inside = isPointInBogor(lat, lng);
            assert.equal(
                inside,
                expectedInside,
                `Point "${name}" [${lat}, ${lng}] geofence evaluation mismatch (expected: ${expectedInside}, got: ${inside})`
            );

            // Verify API response reflects geofencing constraint
            const res = simulatePostAnalysisLocation({
                latitude: lat,
                longitude: lng,
                radius: 500,
                kategori: 'Kuliner',
            });

            if (expectedInside) {
                assert.equal(res.status, 200, `Valid point "${name}" should return 200 OK`);
                const data = res.data as { success: boolean; data: { titik_analisis: { lat: number; lng: number } } };
                assert.equal(data.success, true);
                assert.equal(data.data.titik_analisis.lat, lat);
                assert.equal(data.data.titik_analisis.lng, lng);
            } else {
                assert.equal(res.status, 400, `Outside point "${name}" must return HTTP 400 Bad Request`);
                const data = res.data as { success: boolean; message: string };
                assert.equal(data.success, false);
                assert.ok(
                    data.message.includes('luar wilayah Kota Bogor') || data.message.includes('tidak valid'),
                    `Rejection message should describe boundary violation for "${name}"`
                );
            }
        }
    });

    // ------------------------------------------------------------------------
    // SCENARIO 3: EXTREME RADIUS SLIDER BOUNDARY VALUES (249m, 250m, 5000m, 5001m)
    // ------------------------------------------------------------------------
    await t.test('[T5-03] Extreme radius slider boundary values (249m, 250m, 5000m, 5001m)', () => {
        const centerLat = -6.595;
        const centerLng = 106.79;
        const ctrl = new VisitorMapController();

        // 1. Test 249m: Below UI slider minimum (250m)
        ctrl.setRadius(249);
        assert.equal(ctrl.getState().radiusMeters, 250, 'VisitorMapController must clamp 249m to min 250m');

        // 2. Test 250m: Exact minimum boundary
        ctrl.setRadius(250);
        assert.equal(ctrl.getState().radiusMeters, 250, 'VisitorMapController accepts exact min 250m');

        const res250 = simulatePostAnalysisLocation({
            latitude: centerLat,
            longitude: centerLng,
            radius: 250,
            kategori: 'Kuliner',
        });
        assert.equal(res250.status, 200, 'Radius = 250m must be accepted by analysis API');

        // 3. Test 5000m: Exact maximum boundary
        ctrl.setRadius(5000);
        assert.equal(ctrl.getState().radiusMeters, 5000, 'VisitorMapController accepts exact max 5000m');

        const res5000 = simulatePostAnalysisLocation({
            latitude: centerLat,
            longitude: centerLng,
            radius: 5000,
            kategori: 'Kuliner',
        });
        assert.equal(res5000.status, 200, 'Radius = 5000m must be accepted by analysis API');

        // 4. Test 5001m: Exceeding maximum boundary
        ctrl.setRadius(5001);
        assert.equal(ctrl.getState().radiusMeters, 5000, 'VisitorMapController must clamp 5001m to max 5000m');

        const res5001 = simulatePostAnalysisLocation({
            latitude: centerLat,
            longitude: centerLng,
            radius: 5001,
            kategori: 'Kuliner',
        });
        assert.equal(res5001.status, 400, 'Radius = 5001m must be rejected with HTTP 400 by analysis API');

        // 5. Test extreme negative / zero / infinity values
        const extremeRadii = [-500, -1, 0, 10000, 100000, NaN, Infinity, -Infinity];
        for (const r of extremeRadii) {
            const res = simulatePostAnalysisLocation({
                latitude: centerLat,
                longitude: centerLng,
                radius: r,
                kategori: 'Kuliner',
            });
            assert.equal(res.status, 400, `Extreme radius ${r} must return HTTP 400`);
            const bufRes = simulatePostAnalysisBuffer({
                latitude: centerLat,
                longitude: centerLng,
                radius: r,
            });
            assert.equal(bufRes.status, 400, `Extreme radius ${r} on buffer API must return HTTP 400`);
        }
    });

    // ------------------------------------------------------------------------
    // SCENARIO 4: SQLi AND XSS FUZZING PAYLOADS
    // ------------------------------------------------------------------------
    await t.test('[T5-04] SQLi and XSS fuzzing payloads on search input and API params', () => {
        const fuzzPayloads = [
            // SQL Injection
            "' OR 1=1 --",
            "'; DROP TABLE umkm; --",
            "1' UNION SELECT NULL, NULL, NULL, NULL --",
            "admin' /*",
            "') OR ('1'='1",
            "1; WAITFOR DELAY '0:0:5'--",

            // Cross-Site Scripting (XSS)
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert(1)>",
            "<svg/onload=alert('RINTIK')>",
            "javascript:alert(document.cookie)",
            "\"><script>alert(1)</script>",
            "<iframe src=\"javascript:alert(1)\">",

            // Template Injection & Format Strings
            "{{7*7}}",
            "${7*7}",
            "%s%s%s%s%s",
            "\\u0000admin",

            // Path Traversal
            "../../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\cmd.exe",
        ];

        // 1. Search Query Fuzzing
        for (const payload of fuzzPayloads) {
            const res = simulateGetUmkm({ q: payload, limit: 10 });
            assert.equal(res.status, 200, `Search with payload "${payload}" should return 200 without crashing`);
            assert.equal(res.data.success, true);
            // Payload should not match any legitimate UMKM or cause data leakage
            assert.equal(
                res.data.data.length,
                0,
                `Adversarial payload "${payload}" must yield 0 results, never execute code`
            );
        }

        // 2. UMKM ID Parameter Fuzzing on /api/umkm/[id]
        const maliciousIds = [
            "UMKM0001' OR '1'='1",
            "UMKM0001; DROP TABLE umkm;",
            "UMKM<script>alert(1)</script>",
            "UMKM0001\x00",
            "' OR 1=1 --",
            "../UMKM0001",
            "UMKM-0001", // Hyphenated is invalid per contract /^UMKM[0-9]+$/
        ];

        for (const badId of maliciousIds) {
            const res = simulateGetUmkmDetail(badId);
            assert.equal(res.status, 400, `Malicious or invalid ID "${badId}" must return HTTP 400`);
            const d = res.data as { success: boolean; message: string };
            assert.equal(d.success, false);
            assert.ok(d.message.includes('tidak valid'));
        }

        // 3. Category Parameter Fuzzing on /api/analysis/location
        for (const badCat of ["' OR '1'='1", "<script>alert(1)</script>", "Automotive", ""]) {
            const res = simulatePostAnalysisLocation({
                latitude: -6.595,
                longitude: 106.79,
                radius: 500,
                kategori: badCat,
            });
            assert.equal(res.status, 400, `Invalid category "${badCat}" must return HTTP 400`);
            const d = res.data as { success: boolean; message: string };
            assert.equal(d.success, false);
            assert.equal(d.message, 'Kategori UMKM tidak valid');
        }

        // 4. Overlong String Fuzzing (1000+ characters)
        const overlongSearch = 'A'.repeat(1000);
        const resOverlong = simulateGetUmkm({ q: overlongSearch });
        assert.equal(resOverlong.status, 200);
        assert.equal(resOverlong.data.data.length, 0);
    });

    // ------------------------------------------------------------------------
    // SCENARIO 5: OSRM SERVICE FAILURE RESILIENCE (GEODESIC STRAIGHT LINE)
    // ------------------------------------------------------------------------
    await t.test('[T5-05] OSRM service failure resilience and geodesic fallback polyline verification', () => {
        const startLat = -6.5950;
        const startLng = 106.7900;
        const destLat = -6.6050;
        const destLng = 106.8000;

        // 1. Direct unit verification of MapRoutingService.buatGarisLurusFallback
        const fallbackMotor = buatGarisLurusFallback(
            startLat,
            startLng,
            destLat,
            destLng,
            'motor',
            'Simulated OSRM timeout'
        );

        assert.equal(fallbackMotor.success, true);
        assert.equal(fallbackMotor.isFallback, true);
        assert.ok(fallbackMotor.warning?.includes('Garis lurus fallback'));
        assert.equal(fallbackMotor.mode, 'motor');
        assert.equal(fallbackMotor.coordinates.length, 2, 'Fallback polyline must consist of exactly 2 coordinates');
        assert.deepEqual(fallbackMotor.coordinates[0], [startLat, startLng]);
        assert.deepEqual(fallbackMotor.coordinates[1], [destLat, destLng]);

        const expectedDistanceKm = calculateHaversineDistanceKm(startLat, startLng, destLat, destLng);
        assert.equal(fallbackMotor.distanceKm, expectedDistanceKm);
        assert.equal(fallbackMotor.distanceMeters, Math.round(expectedDistanceKm * 1000));
        assert.equal(fallbackMotor.durationMinutes, hitungDurasiMenit(expectedDistanceKm, 'motor'));

        // 2. Fallback durations for all 3 modes
        const fallbackMobil = buatGarisLurusFallback(startLat, startLng, destLat, destLng, 'mobil');
        const fallbackJalan = buatGarisLurusFallback(startLat, startLng, destLat, destLng, 'jalan_kaki');

        assert.ok(fallbackMobil.durationMinutes > 0);
        assert.ok(fallbackJalan.durationMinutes > 0);
        assert.ok(
            fallbackJalan.durationMinutes > fallbackMotor.durationMinutes,
            'Walking duration must exceed motor duration for same distance'
        );

        // 3. Leaflet polyline styling contract
        const mockLeaflet = {
            polyline: (coords: [number, number][], options: Record<string, unknown>) => ({
                coords,
                options,
            }),
        };

        // Fallback route polyline: dashed red stroke
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackPoly = createRoutePolyline(mockLeaflet as any, fallbackMotor.coordinates, true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fbOpts = (fallbackPoly as any).options;
        assert.equal(fbOpts.color, '#C62828', 'Fallback polyline color must match secondary red #C62828');
        assert.equal(fbOpts.dashArray, '6, 6', 'Fallback polyline must have dashed pattern 6, 6');
        assert.equal(fbOpts.weight, 4);

        // Standard route polyline: solid red stroke
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const standardPoly = createRoutePolyline(mockLeaflet as any, fallbackMotor.coordinates, false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stdOpts = (standardPoly as any).options;
        assert.equal(stdOpts.color, '#C62828');
        assert.equal(stdOpts.dashArray, undefined, 'Standard polyline must not be dashed');
        assert.equal(stdOpts.weight, 5);

        // 4. API simulator routing fallback verification
        const simFallback = simulateGetRouting({
            start_lat: startLat,
            start_lng: startLng,
            dest_lat: destLat,
            dest_lng: destLng,
            mode: 'motor',
            simulateTimeout: true,
        });

        assert.equal(simFallback.status, 200);
        const data = simFallback.data as Record<string, unknown>;
        assert.equal(data.success, true);
        assert.equal(data.is_fallback, true);
        assert.ok((data.warning as string).includes('OSRM'));
        assert.equal(data.mode, 'motor');
    });

    // ------------------------------------------------------------------------
    // SCENARIO 6: ASSET ISOLATION AUDIT (ZERO EXTERNAL IMAGE URLS)
    // ------------------------------------------------------------------------
    await t.test('[T5-06] Asset isolation audit: confirm ZERO external image URLs in src/', () => {
        const srcDir = path.resolve(import.meta.dirname, '../../src');
        const publicDir = path.resolve(import.meta.dirname, '../../public');

        function getAllSourceFiles(dir: string): string[] {
            const files: string[] = [];
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    files.push(...getAllSourceFiles(fullPath));
                } else if (/\.(tsx|ts|css)$/.test(item.name)) {
                    files.push(fullPath);
                }
            }
            return files;
        }

        const sourceFiles = getAllSourceFiles(srcDir);
        assert.ok(sourceFiles.length >= 15, `Found ${sourceFiles.length} source files to audit`);

        // Forbidden external image URL pattern (excluding basemap tile servers like cartocdn / openstreetmap)
        const externalImagePattern = /https?:\/\/(?!(?:\{s\}\.)?(?:basemaps\.cartocdn\.com|tile\.openstreetmap\.org))[^\s"'`]+\.(png|jpg|jpeg|webp|svg|gif)/i;
        const externalHostsPattern = /https?:\/\/(?:images\.unsplash\.com|res\.cloudinary\.com|i\.imgur\.com|via\.placeholder\.com|picsum\.photos)/i;

        const violations: Array<{ file: string; match: string }> = [];
        const localImgReferences = new Set<string>();

        for (const file of sourceFiles) {
            const content = fs.readFileSync(file, 'utf8');

            // 1. Check for external image links
            const extMatch = content.match(externalImagePattern);
            if (extMatch) {
                violations.push({ file: path.relative(srcDir, file), match: extMatch[0] });
            }
            const hostMatch = content.match(externalHostsPattern);
            if (hostMatch) {
                violations.push({ file: path.relative(srcDir, file), match: hostMatch[0] });
            }

            // 2. Collect local image references (/img/...) including filenames with + and -
            const localMatches = content.matchAll(/\/img\/[a-zA-Z0-9_\-\.\/\+]+/g);
            for (const m of localMatches) {
                localImgReferences.add(m[0]);
            }
        }

        assert.equal(
            violations.length,
            0,
            `Asset isolation violation: found external image URLs in source files:\n${JSON.stringify(violations, null, 2)}`
        );

        // 3. Verify that all referenced local /img/ assets actually exist in public/img/
        assert.ok(localImgReferences.size > 0, 'Must have referenced local images in src/');
        for (const ref of localImgReferences) {
            // Strip any query or hash if present
            const cleanPath = ref.split('?')[0].split('#')[0];
            const diskPath = path.join(publicDir, cleanPath);
            assert.ok(
                fs.existsSync(diskPath),
                `Referenced local image missing on disk: ${cleanPath} (resolved to: ${diskPath})`
            );
        }
    });

    // ------------------------------------------------------------------------
    // SCENARIO 7: DATASET GROUND TRUTH & INVARIANT INTEGRITY
    // ------------------------------------------------------------------------
    await t.test('[T5-07] Dataset integrity invariant: category counts and district sums never deviate from 2,993', () => {
        const stats = getDatasetStatistics();
        const wilayahGeoJson = loadGeoJson('wilayah');

        // 1. Invariant: Total records == 2,993
        assert.equal(stats.total, 2993, 'Total records must be exactly 2,993');
        assert.equal(dataset.length, 2993, 'Dataset array length must be exactly 2,993');

        // 2. Invariant: District distribution sum == 2,993
        const expectedKecamatan: Record<string, number> = {
            'Bogor Barat': 781,
            'Tanah Sareal': 531,
            'Bogor Tengah': 499,
            'Bogor Utara': 493,
            'Bogor Selatan': 429,
            'Bogor Timur': 260,
        };

        let kecSum = 0;
        for (const [kec, count] of Object.entries(expectedKecamatan)) {
            const actualCount = stats.perKecamatan[kec];
            assert.equal(actualCount, count, `District count mismatch in "${kec}": expected ${count}, got ${actualCount}`);
            kecSum += actualCount;
        }
        assert.equal(kecSum, 2993, 'Sum of all 6 districts must equal 2,993');

        // 3. Invariant: Category distribution sum == 2,993
        const expectedKategori: Record<string, number> = {
            Kuliner: 2212,
            Jasa: 301,
            Fashion: 230,
            Kerajinan: 200,
            Teknologi: 50,
        };

        let katSum = 0;
        for (const [kat, count] of Object.entries(expectedKategori)) {
            const actualCount = stats.perKategori[kat];
            assert.equal(actualCount, count, `Category count mismatch in "${kat}": expected ${count}, got ${actualCount}`);
            katSum += actualCount;
        }
        assert.equal(katSum, 2993, 'Sum of all 5 categories must equal 2,993');

        // 4. Invariant: Administrative boundary coverage == exactly 68 official Kelurahan polygons
        assert.equal(wilayahGeoJson.features.length, 68, 'Administrative boundary layer must contain 68 Kelurahan features');

        // 5. Invariant: All 2,993 records have unique IDs matching /^UMKM[0-9]+$/
        const idSet = new Set<string>();
        for (const item of dataset) {
            assert.ok(/^UMKM[0-9]+$/.test(item.id_umkm), `Record ID ${item.id_umkm} does not match UMKM regex`);
            assert.ok(!idSet.has(item.id_umkm), `Duplicate UMKM ID found: ${item.id_umkm}`);
            idSet.add(item.id_umkm);

            // Geographic boundary checks
            assert.ok(Number.isFinite(item.latitude));
            assert.ok(Number.isFinite(item.longitude));
            assert.ok(
                item.latitude >= -6.70 && item.latitude <= -6.50,
                `Record ${item.id_umkm} latitude ${item.latitude} outside Bogor bounding box`
            );
            assert.ok(
                item.longitude >= 106.70 && item.longitude <= 106.90,
                `Record ${item.id_umkm} longitude ${item.longitude} outside Bogor bounding box`
            );
        }
        assert.equal(idSet.size, 2993, 'All 2,993 UMKM IDs must be strictly unique');
    });
});
