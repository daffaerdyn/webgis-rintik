import test from 'node:test';
import assert from 'node:assert/strict';
import {
    simulateGetUmkm,
    simulateGetStatistics,
    simulateGetUmkmDetail,
    simulateGetRouting,
    simulatePostAnalysisLocation,
    VisitorMapController,
    EntrepreneurMapController,
} from './harness/index.ts';

// ============================================================================
// TIER 4: REAL-WORLD SCENARIOS & PERSONA WORKFLOWS
// ============================================================================

test('Tier 4: Persona Workflows & Real-World User Journeys', async (t) => {
    await t.test('[T4-01] Persona 1 — Food Tourist / Visitor (Wisatawan Kuliner Kota Bogor)', () => {
        // Step 1: Landing Page -> Navigate to /map/pengunjung
        const navigationPath = '/map/pengunjung';
        assert.equal(navigationPath, '/map/pengunjung');

        // Step 2: Map Visitor Controller initialization
        const visitorCtrl = new VisitorMapController();
        assert.equal(visitorCtrl.getState().sidebarState, 'LIST');

        // Step 3: Filter by "Kuliner" category
        visitorCtrl.selectCategory('Kuliner');
        assert.equal(visitorCtrl.getState().activeCategory, 'Kuliner');

        // Step 4: Search for "soto"
        const searchResults = simulateGetUmkm({
            q: 'soto',
            kategori: 'Kuliner',
            sort: 'rating',
            limit: 10,
        });
        assert.equal(searchResults.status, 200);
        assert.ok(searchResults.data.data.length > 0, 'Should find culinary soto vendors');
        visitorCtrl.setSearchQuery('soto', searchResults.data.data.length);

        // Step 5: Select the top-rated UMKM
        const topRatedSoto = searchResults.data.data[0];
        visitorCtrl.openUmkmDetail(topRatedSoto);
        assert.equal(visitorCtrl.getState().sidebarState, 'DETAIL');
        assert.equal(visitorCtrl.getState().selectedUmkm?.id_umkm, topRatedSoto.id_umkm);

        // Step 6: Verify detail card fields and SUMBER DATA
        const detailRes = simulateGetUmkmDetail(topRatedSoto.id_umkm);
        assert.equal(detailRes.status, 200);
        const item = (detailRes.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.equal(item.kategori, 'Kuliner');
        assert.ok(typeof item.alamat === 'string' && item.alamat.length > 0);
        assert.ok('source' in item && typeof item.source === 'string', 'Must display SUMBER DATA attribution');

        // Step 7: Request navigation route by "motor"
        const routeRes = simulateGetRouting({
            dest_id: topRatedSoto.id_umkm,
            start_lat: -6.595,
            start_lng: 106.79,
            mode: 'motor',
        });
        assert.equal(routeRes.status, 200);
        const routeData = routeRes.data as Record<string, unknown>;
        assert.equal(routeData.mode, 'motor');
        assert.ok((routeData.jarak_meter as number) > 0);
        assert.ok((routeData.durasi_menit as number) > 0);

        // Transition controller to ROUTE state
        visitorCtrl.startRouting('motor', routeData.jarak_meter as number, routeData.durasi_menit as number);
        assert.equal(visitorCtrl.getState().sidebarState, 'ROUTE');
        assert.equal(visitorCtrl.getState().routing?.mode, 'motor');
    });

    await t.test('[T4-02] Persona 2 — Boutique Fashion Entrepreneur (Calon Pengusaha Butik)', () => {
        // Step 1: Landing Page -> Navigate to /map/calon-usaha
        const entrepreneurCtrl = new EntrepreneurMapController();
        assert.equal(entrepreneurCtrl.getState().currentStep, 1);

        // Step 2: Step 1 Wizard — Choose "Fashion" category
        entrepreneurCtrl.selectCategory('Fashion');
        assert.equal(entrepreneurCtrl.getState().currentStep, 2);
        assert.equal(entrepreneurCtrl.getState().selectedCategory, 'Fashion');

        // Step 3: Step 2 Wizard — Pick candidate location on Jl. Pajajaran (Baranangsiang)
        const pajajaranPoint = { lat: -6.6062, lng: 106.8080 };
        const pinPlacement = entrepreneurCtrl.setCandidatePoint(pajajaranPoint.lat, pajajaranPoint.lng);
        assert.equal(pinPlacement.success, true);
        assert.equal(entrepreneurCtrl.getState().currentStep, 3);

        // Step 4: Step 3 Wizard — Set radius buffer to 500m
        entrepreneurCtrl.setRadius(500);
        const analysis500m = entrepreneurCtrl.getState().analysisResult;
        assert.ok(analysis500m !== null);

        // Verify proximity and competitor metrics
        assert.ok(analysis500m!.nearestRoadDistance <= 100, 'Jl. Pajajaran candidate point must be near road');
        assert.ok(analysis500m!.nearestSchoolDistance > 0, 'Must calculate school proximity');
        const competitors500m = analysis500m!.competitorsCount;

        // Step 5: Expand radius to 1,000m to check wider market catchment
        entrepreneurCtrl.setRadius(1000);
        const analysis1000m = entrepreneurCtrl.getState().analysisResult;
        assert.ok(analysis1000m!.competitorsCount >= competitors500m);

        // Step 6: Verify PRD 9.10 non-committal business disclaimer
        const disclaimer = analysis1000m!.disclaimer;
        assert.ok(disclaimer.includes('pengambilan keputusan bisnis'));
        assert.ok(!disclaimer.includes('pasti berhasil'));
    });

    await t.test('[T4-03] Persona 3 — Craft Artisan Exploring Niche Area (Pelaku UMKM Kerajinan)', () => {
        // Step 1: Open distribution statistics to observe craft industry landscape
        const statsRes = simulateGetStatistics({ kategori: 'Kerajinan' });
        assert.equal(statsRes.status, 200);
        assert.equal(statsRes.data.total_umkm, 200, 'Total craft UMKM in Bogor must be 200');

        // Step 2: Switch to Calon Usaha to identify low-density opportunity in Katulampa
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kerajinan');

        // Step 3: Set location in Katulampa (Bogor Timur)
        const katulampaPoint = { lat: -6.6210, lng: 106.8320 };
        const pinRes = ctrl.setCandidatePoint(katulampaPoint.lat, katulampaPoint.lng);
        assert.equal(pinRes.success, true);

        // Step 4: Run analysis with 500m buffer
        ctrl.setRadius(500);
        const analysis = ctrl.getState().analysisResult;
        assert.ok(analysis !== null);

        // Katulampa is residential/suburban, craft competitors in 500m should be minimal (typically 0 or 1)
        assert.ok(analysis!.competitorsCount <= 2, 'Low craft density in residential Katulampa');
        assert.ok(analysis!.nearestRoadDistance < 200, 'Must have road access');

        // Step 5: Verify official spatial analysis endpoint response
        const apiRes = simulatePostAnalysisLocation({
            latitude: katulampaPoint.lat,
            longitude: katulampaPoint.lng,
            radius: 500,
            kategori: 'Kerajinan',
        });
        assert.equal(apiRes.status, 200);
        const d = (apiRes.data as Record<string, unknown>).data as Record<string, unknown>;
        assert.equal(d.kategori, 'Kerajinan');
        assert.equal(d.radius_meter, 500);
    });
});
