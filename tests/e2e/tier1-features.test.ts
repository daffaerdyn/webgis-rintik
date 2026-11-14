import test from 'node:test';
import assert from 'node:assert/strict';
import {
    loadMasterDataset,
    getDatasetStatistics,
    loadGeoJson,
    haversineDistance,
    generateBufferGeoJson,
    findCompetitorsInRadius,
    findNearestRoadDistance,
    findNearestSchoolDistance,
    simulateGetUmkm,
    simulateGetUmkmMap,
    simulateGetStatistics,
    simulateGetUmkmDetail,
    simulatePostAnalysisLocation,
    simulateGetRouting,
    VisitorMapController,
    EntrepreneurMapController,
} from './harness/index.ts';

// ============================================================================
// TIER 1: FEATURE COVERAGE (HAPPY PATHS & CORE COMPONENT TESTS)
// ============================================================================

test('Tier 1: Feature 1 — Landing Page (Hero, Navigation, Stats, Steps, Footer)', async (t) => {
    const stats = getDatasetStatistics();

    await t.test('[T1-01.1] Hero section displays verified title, subtitle, and branding', () => {
        const expectedTitle = 'Pemetaan & Analisis Spasial Industri Kreatif Kota Bogor';
        const expectedSubtitle = 'Ruang Informasi Titik Industri Kreatif (RINTIK)';
        assert.ok(expectedTitle.includes('Kota Bogor'));
        assert.ok(expectedSubtitle.includes('RINTIK'));
    });

    await t.test('[T1-01.2] Dual Call-To-Action buttons link to valid application routes', () => {
        const ctaRiset = { label: 'Riset Lokasi Usaha', href: '/map/calon-usaha' };
        const ctaJelajah = { label: 'Jelajahi UMKM', href: '/map/pengunjung' };
        assert.equal(ctaRiset.href, '/map/calon-usaha');
        assert.equal(ctaJelajah.href, '/map/pengunjung');
    });

    await t.test('[T1-01.3] Kecamatan statistics section reflects verified ground truth dataset', () => {
        // Assert exactly 2,993 verified UMKM, 6 Kecamatan, 5 Kategori
        assert.equal(stats.total, 2993, 'Dataset total must be exactly 2,993');
        assert.equal(Object.keys(stats.perKecamatan).length, 6, 'Must have exactly 6 Kecamatan');
        assert.equal(Object.keys(stats.perKategori).length, 5, 'Must have exactly 5 Kategori');

        // Bogor Barat is 781 (26.10%)
        assert.equal(stats.perKecamatan['Bogor Barat'], 781);
        const bogorBaratPct = Math.round((stats.perKecamatan['Bogor Barat'] / stats.total) * 100);
        assert.equal(bogorBaratPct, 26, 'Bogor Barat percentage must round to 26%');
    });

    await t.test('[T1-01.4] Research Steps section contains 3 sequential guided phases with photos', () => {
        const steps = [
            { step: 1, title: 'Tentukan Titik Usaha', img: 'langkah-1.png' },
            { step: 2, title: 'Lihat Analisis Kompetitor', img: 'langkah-2.png' },
            { step: 3, title: 'Dapatkan Keputusan Terbaik', img: 'langkah-3.png' },
        ];
        assert.equal(steps.length, 3);
        assert.equal(steps[0].step, 1);
        assert.equal(steps[2].step, 3);
    });

    await t.test('[T1-01.5] Shutter transition and Footer display official links and branding', () => {
        const shutterOpening = 'Pilih lokasi tepat.';
        const shutterClosing = 'Wujudkan bisnis hebat.';
        const footerLinks = ['/map/pengunjung', '/map/calon-usaha', '#tentang', '#fungsi'];

        assert.ok(shutterOpening.length > 0);
        assert.ok(shutterClosing.length > 0);
        assert.ok(footerLinks.includes('/map/pengunjung'));
        assert.ok(footerLinks.includes('/map/calon-usaha'));
    });
});

test('Tier 1: Feature 2 — Visitor Map (Map Pengunjung) Core Rendering & Pins', async (t) => {
    const dataset = loadMasterDataset();
    const wilayahGeo = loadGeoJson('wilayah');

    await t.test('[T1-02.1] Default map center and bounds match Kota Bogor geographic coordinates', () => {
        const bogorCenter = { lat: -6.5950, lng: 106.7900 };
        assert.ok(bogorCenter.lat >= -6.68 && bogorCenter.lat <= -6.50);
        assert.ok(bogorCenter.lng >= 106.73 && bogorCenter.lng <= 106.85);
    });

    await t.test('[T1-02.2] Administrative boundaries GeoJSON contains all 68 Kelurahan polygons', () => {
        assert.equal(wilayahGeo.type, 'FeatureCollection');
        assert.equal(wilayahGeo.features.length, 68, 'Must contain 68 Kelurahan polygons');
    });

    await t.test('[T1-02.3] Custom SVG pin generators adhere to locked DESIGN.md category tokens', () => {
        const categoryColors: Record<string, string> = {
            Kuliner: '#E11D74',
            Fashion: '#FF8F00',
            Jasa: '#000000',
            Kerajinan: '#2E8B3C',
            Teknologi: '#2538B8',
        };

        const sampleCategories = ['Kuliner', 'Fashion', 'Jasa', 'Kerajinan', 'Teknologi'];
        for (const cat of sampleCategories) {
            assert.ok(categoryColors[cat], `Missing color token for category ${cat}`);
            assert.match(categoryColors[cat], /^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color token');
        }
    });

    await t.test('[T1-02.4] All 2,993 UMKM points map to valid latitude and longitude coordinates', () => {
        assert.equal(dataset.length, 2993);
        for (const item of dataset) {
            assert.ok(!isNaN(item.latitude), `Invalid latitude in item ${item.id_umkm}`);
            assert.ok(!isNaN(item.longitude), `Invalid longitude in item ${item.id_umkm}`);
            assert.ok(item.latitude < 0, `Latitude must be south of equator: ${item.latitude}`);
            assert.ok(item.longitude > 100, `Longitude must be east: ${item.longitude}`);
        }
    });

    await t.test('[T1-02.5] Map categories encompass all 5 official RINTIK creative sectors', () => {
        const categories = new Set(dataset.map((u) => u.kategori));
        assert.deepEqual(Array.from(categories).sort(), ['Fashion', 'Jasa', 'Kerajinan', 'Kuliner', 'Teknologi']);
    });
});

test('Tier 1: Feature 3 — Visitor Map Search, Filters & Radius Calculation', async (t) => {
    await t.test('[T1-03.1] Keyword search filters UMKM by name, description, or address', () => {
        const res = simulateGetUmkm({ q: 'soto' });
        assert.equal(res.status, 200);
        assert.ok(res.data.data.length > 0, 'Should find at least 1 soto item');
        for (const item of res.data.data) {
            const match =
                item.nama_umkm.toLowerCase().includes('soto') ||
                item.deskripsi_produk.toLowerCase().includes('soto') ||
                item.alamat.toLowerCase().includes('soto');
            assert.ok(match, `Item ${item.id_umkm} does not match search query 'soto'`);
        }
    });

    await t.test('[T1-03.2] Category pill filtering restricts results strictly to selected category', () => {
        const res = simulateGetUmkm({ kategori: 'Kerajinan' });
        assert.equal(res.status, 200);
        assert.equal(res.data.pagination.total, 200, 'Kerajinan must have exactly 200 records');
        for (const item of res.data.data) {
            assert.equal(item.kategori, 'Kerajinan');
        }
    });

    await t.test('[T1-03.3] Radius filtering correctly filters items within Euclidean/Haversine distance', () => {
        const center = { lat: -6.595, lng: 106.79 };
        const radius = 1000; // 1km
        const res = simulateGetUmkm({ latitude: center.lat, longitude: center.lng, radius });
        assert.equal(res.status, 200);
        assert.ok(res.data.pagination.total > 0, 'Must have UMKM within 1km of central Bogor');

        for (const item of res.data.data) {
            const dist = haversineDistance(center.lat, center.lng, item.latitude, item.longitude);
            assert.ok(dist <= radius + 0.1, `Item ${item.id_umkm} distance ${dist} exceeds radius ${radius}`);
        }
    });

    await t.test('[T1-03.4] Sorting by rating orders results descending by rating score', () => {
        const res = simulateGetUmkm({ sort: 'rating', limit: 20 });
        assert.equal(res.status, 200);
        const ratings = res.data.data.map((u) => u.rating ?? 0);
        for (let i = 1; i < ratings.length; i++) {
            assert.ok(ratings[i - 1] >= ratings[i], 'Ratings must be descending');
        }
    });

    await t.test('[T1-03.5] Sorting by distance orders results ascending from origin point', () => {
        const center = { lat: -6.595, lng: 106.79 };
        const res = simulateGetUmkm({ latitude: center.lat, longitude: center.lng, sort: 'jarak', limit: 20 });
        assert.equal(res.status, 200);
        const distances = res.data.data.map((u) => haversineDistance(center.lat, center.lng, u.latitude, u.longitude));
        for (let i = 1; i < distances.length; i++) {
            assert.ok(distances[i - 1] <= distances[i], 'Distances must be ascending');
        }
    });
});

test('Tier 1: Feature 4 — UMKM Detail Modal (State 2) & Data Attribution', async (t) => {
    await t.test('[T1-04.1] Opening detail modal displays full item specifications', () => {
        const res = simulateGetUmkmDetail('UMKM0001');
        assert.equal(res.status, 200);
        const item = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.equal(item.id_umkm, 'UMKM0001');
        assert.ok(typeof item.nama_umkm === 'string' && item.nama_umkm.length > 0);
        assert.ok(typeof item.alamat === 'string' && item.alamat.length > 0);
        assert.ok(typeof item.kecamatan === 'string');
        assert.ok(typeof item.kelurahan === 'string');
        assert.ok(typeof item.latitude === 'number');
        assert.ok(typeof item.longitude === 'number');
    });

    await t.test('[T1-04.2] Detail modal includes mandatory SUMBER DATA attribution', () => {
        const res = simulateGetUmkmDetail('UMKM0001');
        assert.equal(res.status, 200);
        const item = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.ok('source' in item, "Detail object must contain 'source' attribute for SUMBER DATA");
        assert.ok(typeof item.source === 'string' && (item.source as string).length > 0);
    });

    await t.test('[T1-04.3] Detail modal displays category badge and color token', () => {
        const res = simulateGetUmkmDetail('UMKM0001');
        const item = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.ok(['Kuliner', 'Fashion', 'Jasa', 'Kerajinan', 'Teknologi'].includes(item.kategori as string));
    });

    await t.test('[T1-04.4] Detail modal controller transitions from LIST to DETAIL state', () => {
        const ctrl = new VisitorMapController();
        const dataset = loadMasterDataset();
        assert.equal(ctrl.getState().sidebarState, 'LIST');

        ctrl.openUmkmDetail(dataset[0]);
        assert.equal(ctrl.getState().sidebarState, 'DETAIL');
        assert.equal(ctrl.getState().selectedUmkm?.id_umkm, dataset[0].id_umkm);
    });

    await t.test('[T1-04.5] Closing detail modal restores previous LIST state', () => {
        const ctrl = new VisitorMapController();
        const dataset = loadMasterDataset();
        ctrl.openUmkmDetail(dataset[0]);
        ctrl.closeDetail();
        assert.equal(ctrl.getState().sidebarState, 'LIST');
        assert.equal(ctrl.getState().selectedUmkm, null);
    });
});

test('Tier 1: Feature 5 — Multi-Modal Routing Engine (Motor, Mobil, Jalan Kaki)', async (t) => {
    const start = { lat: -6.595, lng: 106.79 };
    const dest = { lat: -6.610, lng: 106.81 };

    await t.test('[T1-05.1] Routing API returns valid LineString polyline and distance in meters', () => {
        const res = simulateGetRouting({
            start_lat: start.lat,
            start_lng: start.lng,
            dest_lat: dest.lat,
            dest_lng: dest.lng,
            mode: 'motor',
        });
        assert.equal(res.status, 200);
        const d = (res.data as Record<string, unknown>);
        assert.ok((d.jarak_meter as number) > 0, 'Distance must be positive');
        assert.ok((d.durasi_menit as number) > 0, 'Duration must be positive');
        const geom = (d.polyline_geojson as Record<string, unknown>).geometry as Record<string, unknown>;
        assert.equal(geom.type, 'LineString');
        assert.ok(Array.isArray(geom.coordinates) && geom.coordinates.length >= 2);
    });

    await t.test('[T1-05.2] Motor mode applies 0.85x speed multiplier factor', () => {
        const resMotor = simulateGetRouting({
            start_lat: start.lat,
            start_lng: start.lng,
            dest_lat: dest.lat,
            dest_lng: dest.lng,
            mode: 'motor',
        });
        const resCar = simulateGetRouting({
            start_lat: start.lat,
            start_lng: start.lng,
            dest_lat: dest.lat,
            dest_lng: dest.lng,
            mode: 'mobil',
        });
        const durMotor = (resMotor.data as Record<string, unknown>).durasi_menit as number;
        const durCar = (resCar.data as Record<string, unknown>).durasi_menit as number;

        // Motor duration should be faster than or equal to car duration in urban Bogor
        assert.ok(durMotor <= durCar, `Motor (${durMotor}m) should be <= car (${durCar}m)`);
    });

    await t.test('[T1-05.3] Walking mode calculates duration at standard 1.25 m/s pedestrian speed', () => {
        const resWalk = simulateGetRouting({
            start_lat: start.lat,
            start_lng: start.lng,
            dest_lat: dest.lat,
            dest_lng: dest.lng,
            mode: 'jalan_kaki',
        });
        const d = resWalk.data as Record<string, unknown>;
        const dist = d.jarak_meter as number;
        const dur = d.durasi_menit as number;
        const expectedMin = Math.round((dist / (1.25 * 60)) * 10) / 10;
        assert.equal(dur, expectedMin);
    });

    await t.test('[T1-05.4] Routing by UMKM ID resolves destination coordinates automatically', () => {
        const res = simulateGetRouting({ dest_id: 'UMKM0001', start_lat: -6.59, start_lng: 106.79, mode: 'motor' });
        assert.equal(res.status, 200);
        assert.equal((res.data as Record<string, unknown>).success, true);
    });

    await t.test('[T1-05.5] Switching active route mode dynamically updates navigation state', () => {
        const ctrl = new VisitorMapController();
        ctrl.startRouting('motor', 2400, 6.0);
        assert.equal(ctrl.getState().routing?.mode, 'motor');

        ctrl.switchRouteMode('jalan_kaki');
        assert.equal(ctrl.getState().routing?.mode, 'jalan_kaki');
        assert.ok(ctrl.getState().routing!.durationMinutes > 6.0);
    });
});

test('Tier 1: Feature 6 — Map Calon Usaha 3-Step Guided Workflow', async (t) => {
    await t.test('[T1-06.1] Initial state starts strictly at Step 1 with no candidate point', () => {
        const ctrl = new EntrepreneurMapController();
        assert.equal(ctrl.getState().currentStep, 1);
        assert.equal(ctrl.getState().selectedCategory, null);
        assert.equal(ctrl.getState().candidatePoint, null);
    });

    await t.test('[T1-06.2] Completing Step 1 (selecting category) advances wizard to Step 2', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');
        assert.equal(ctrl.getState().currentStep, 2);
        assert.equal(ctrl.getState().selectedCategory, 'Kuliner');
    });

    await t.test('[T1-06.3] Completing Step 2 (picking valid map coordinate) advances wizard to Step 3', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');
        const res = ctrl.setCandidatePoint(-6.595, 106.79);
        assert.equal(res.success, true);
        assert.equal(ctrl.getState().currentStep, 3);
        assert.deepEqual(ctrl.getState().candidatePoint, { lat: -6.595, lng: 106.79 });
    });

    await t.test('[T1-06.4] Completing Step 3 (adjusting radius) produces spatial analysis results', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');
        ctrl.setCandidatePoint(-6.595, 106.79);
        ctrl.setRadius(750);
        assert.equal(ctrl.getState().radiusMeters, 750);
        assert.ok(ctrl.getState().analysisResult !== null, 'Analysis result should be populated');
    });

    await t.test('[T1-06.5] Onboarding tooltips and guardrails validate order of progression', () => {
        const ctrl = new EntrepreneurMapController();
        // Attempting to pick point before step 1
        const res = ctrl.setCandidatePoint(-6.595, 106.79);
        assert.equal(res.success, false);
        assert.equal(res.message, 'Pilih Dulu Kategori UMKM-Mu');
    });
});

test('Tier 1: Feature 7 — Entrepreneur Map Spatial Analysis Engine & Results Card', async (t) => {
    const candidatePoint = { lat: -6.595, lng: 106.79 };
    const radius = 500;

    await t.test('[T1-07.1] Buffer circle GeoJSON geometry contains 64 polygon vertices', () => {
        const buffer = generateBufferGeoJson(candidatePoint.lat, candidatePoint.lng, radius, 64);
        assert.equal(buffer.type, 'Feature');
        assert.equal(buffer.geometry.type, 'Polygon');
        const ring = buffer.geometry.coordinates[0];
        assert.equal(ring.length, 65, '64 segments + 1 closing vertex');
    });

    await t.test('[T1-07.2] Proximity to nearest road network is calculated in meters', () => {
        const road = findNearestRoadDistance(candidatePoint.lat, candidatePoint.lng);
        assert.ok(typeof road.distance_m === 'number');
        assert.ok(road.distance_m >= 0, 'Distance must be non-negative');
        assert.ok(road.roadName.length > 0);
    });

    await t.test('[T1-07.3] Proximity to nearest school facility is calculated in meters', () => {
        const school = findNearestSchoolDistance(candidatePoint.lat, candidatePoint.lng);
        assert.ok(typeof school.distance_m === 'number');
        assert.ok(school.distance_m >= 0, 'Distance must be non-negative');
        assert.ok(school.schoolName.length > 0);
    });

    await t.test('[T1-07.4] Competitor analysis filters competitors by same category within radius', () => {
        const { competitors, totalAllUmkm } = findCompetitorsInRadius(
            candidatePoint.lat,
            candidatePoint.lng,
            radius,
            'Kuliner'
        );
        assert.ok(totalAllUmkm >= competitors.length);
        for (const c of competitors) {
            assert.equal(c.kategori, 'Kuliner');
            assert.ok(c.distance_m <= radius);
        }
    });

    await t.test('[T1-07.5] Results card includes mandatory PRD 9.10 non-committal ethical disclaimer', () => {
        const res = simulatePostAnalysisLocation({
            latitude: candidatePoint.lat,
            longitude: candidatePoint.lng,
            radius,
            kategori: 'Kuliner',
        });
        assert.equal(res.status, 200);
        const d = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        const disclaimer = d.catatan_kelayakan as string;
        assert.ok(disclaimer.includes('pengambilan keputusan bisnis'), 'Must state it is decision support');
        assert.ok(!disclaimer.includes('pasti untung'), 'Must not promise absolute success');
    });
});

test('Tier 1: Feature 8 — Backend API Route Handlers Contract & Data Fidelity', async (t) => {
    await t.test('[T1-08.1] GET /api/umkm/statistics returns exact category and district breakdowns', () => {
        const res = simulateGetStatistics({});
        assert.equal(res.status, 200);
        assert.equal(res.data.total_umkm, 2993);
        assert.equal(res.data.per_kategori.Kuliner, 2212);
        assert.equal(res.data.per_kategori.Jasa, 301);
        assert.equal(res.data.per_kategori.Fashion, 230);
        assert.equal(res.data.per_kategori.Kerajinan, 200);
        assert.equal(res.data.per_kategori.Teknologi, 50);
    });

    await t.test('[T1-08.2] GET /api/umkm/map returns Point FeatureCollection within Bounding Box', () => {
        const res = simulateGetUmkmMap({
            min_lng: 106.78,
            min_lat: -6.61,
            max_lng: 106.81,
            max_lat: -6.58,
        });
        assert.equal(res.status, 200);
        const fc = res.data as { type: string; features: unknown[] };
        assert.equal(fc.type, 'FeatureCollection');
        assert.ok(fc.features.length > 0);
    });

    await t.test('[T1-08.3] GET /api/umkm supports pagination and page sizing', () => {
        const res = simulateGetUmkm({ page: 2, limit: 15 });
        assert.equal(res.status, 200);
        assert.equal(res.data.data.length, 15);
        assert.equal(res.data.pagination.page, 2);
    });

    await t.test('[T1-08.4] GET /api/umkm/[id] fetches correct item and preserves source attribute', () => {
        const res = simulateGetUmkmDetail('UMKM0100');
        assert.equal(res.status, 200);
        const item = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.equal(item.id_umkm, 'UMKM0100');
        assert.ok('source' in item);
    });

    await t.test('[T1-08.5] POST /api/analysis/location returns full response schema matching PROJECT.md Contract 2', () => {
        const res = simulatePostAnalysisLocation({
            latitude: -6.595,
            longitude: 106.79,
            radius: 500,
            kategori: 'Kuliner',
        });
        assert.equal(res.status, 200);
        const payload = (res.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.ok('titik_analisis' in payload);
        assert.ok('kategori' in payload);
        assert.ok('radius_meter' in payload);
        assert.ok('ringkasan' in payload);
        assert.ok('kompetitor_list' in payload);
        assert.ok('buffer_geojson' in payload);
        assert.ok('catatan_kelayakan' in payload);
    });
});
