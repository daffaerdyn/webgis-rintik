import test from 'node:test';
import assert from 'node:assert/strict';
import {
    simulateGetUmkm,
    simulateGetStatistics,
    VisitorMapController,
    EntrepreneurMapController,
} from './harness/index.ts';

// ============================================================================
// TIER 3: CROSS-FEATURE STATE COHERENCE & INTERACTION STRESS
// ============================================================================

test('Tier 3: Cross-Feature State Coherence', async (t) => {
    await t.test('[T3-01] Multi-filter synchronous coherence across Kategori, Kecamatan, and Radius', () => {
        const center = { lat: -6.565, lng: 106.755 }; // Central Bogor Barat
        const radius = 2000;

        // Query with simultaneous filters
        const resMulti = simulateGetUmkm({
            kategori: 'Kuliner',
            kecamatan: 'Bogor Barat',
            latitude: center.lat,
            longitude: center.lng,
            radius,
            limit: 50,
        });

        assert.equal(resMulti.status, 200);
        const totalFiltered = resMulti.data.pagination.total;
        assert.ok(totalFiltered > 0, 'Must have Kuliner in Bogor Barat within 2km');

        // All returned items must simultaneously satisfy all active constraints
        for (const item of resMulti.data.data) {
            assert.equal(item.kategori, 'Kuliner', 'Must match category Kuliner');
            assert.equal(item.kecamatan, 'Bogor Barat', 'Must match kecamatan Bogor Barat');
        }

        // Cross-verify with statistics aggregate for the same filters
        const resStats = simulateGetStatistics({
            kategori: 'Kuliner',
            kecamatan: 'Bogor Barat',
        });
        assert.equal(resStats.status, 200);
        assert.ok(
            resStats.data.total_umkm >= totalFiltered,
            'Radius-filtered count must be <= entire district count'
        );
    });

    await t.test('[T3-02] Google Maps-style toggleable floating panels behave orthogonally', () => {
        const ctrl = new VisitorMapController();

        // 1. Toggle Filter panel: open then close
        assert.equal(ctrl.getState().isFilterPanelOpen, false);
        ctrl.toggleFilterPanel();
        assert.equal(ctrl.getState().isFilterPanelOpen, true);
        ctrl.toggleFilterPanel();
        assert.equal(ctrl.getState().isFilterPanelOpen, false);

        // 2. Toggle Statistics drawer: open then close
        assert.equal(ctrl.getState().isStatisticsDrawerOpen, false);
        ctrl.toggleStatisticsDrawer();
        assert.equal(ctrl.getState().isStatisticsDrawerOpen, true);
        ctrl.toggleStatisticsDrawer();
        assert.equal(ctrl.getState().isStatisticsDrawerOpen, false);

        // 3. Toggle Layer control: open then close
        assert.equal(ctrl.getState().isLayerControlOpen, false);
        ctrl.toggleLayerControl();
        assert.equal(ctrl.getState().isLayerControlOpen, true);
        ctrl.toggleLayerControl();
        assert.equal(ctrl.getState().isLayerControlOpen, false);

        // 4. Stacking: Opening filter panel does not corrupt layer control flags
        ctrl.toggleLayer('jalan');
        assert.equal(ctrl.getState().activeLayers.jalan, true);
        ctrl.toggleFilterPanel();
        assert.equal(ctrl.getState().activeLayers.jalan, true, 'Layer state must remain intact');
    });

    await t.test('[T3-03] Calon Usaha step guardrail enforcement blocks out-of-order progression', () => {
        const ctrl = new EntrepreneurMapController();

        // Attempt Step 2 without Step 1
        const resStep2Early = ctrl.setCandidatePoint(-6.595, 106.79);
        assert.equal(resStep2Early.success, false);
        assert.equal(resStep2Early.message, 'Pilih Dulu Kategori UMKM-Mu');
        assert.equal(ctrl.getState().currentStep, 1);

        // Attempt Step 3 without Step 1 or 2
        const resStep3Early = ctrl.setRadius(1000);
        assert.equal(resStep3Early.success, false);
        assert.equal(resStep3Early.message, 'Pilih Dulu Kategori UMKM-Mu');
        assert.equal(ctrl.getState().currentStep, 1);

        // Complete Step 1, then attempt Step 3 before Step 2
        ctrl.selectCategory('Fashion');
        assert.equal(ctrl.getState().currentStep, 2);
        const resStep3Before2 = ctrl.setRadius(1000);
        assert.equal(resStep3Before2.success, false);
        assert.equal(resStep3Before2.message, 'Pilih Titik Lokasi UMKM-Mu Dulu');
        assert.equal(ctrl.getState().currentStep, 2);
    });

    await t.test('[T3-04] Dynamic re-analysis occurs on candidate pin coordinate change', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');

        // Location 1: Central Bogor
        ctrl.setCandidatePoint(-6.595, 106.79);
        const analysis1 = ctrl.getState().analysisResult;
        assert.ok(analysis1 !== null);

        // Location 2: South Bogor
        ctrl.setCandidatePoint(-6.625, 106.81);
        const analysis2 = ctrl.getState().analysisResult;
        assert.ok(analysis2 !== null);

        // Proximity metrics should update dynamically
        assert.notEqual(
            analysis1?.nearestRoadDistance,
            analysis2?.nearestRoadDistance,
            'Road proximity should update on pin drag'
        );
    });

    await t.test('[T3-05] Dynamic re-analysis occurs monotonically on radius expansion', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');
        ctrl.setCandidatePoint(-6.595, 106.79);

        ctrl.setRadius(500);
        const competitors500 = ctrl.getState().analysisResult!.competitorsCount;

        ctrl.setRadius(1000);
        const competitors1000 = ctrl.getState().analysisResult!.competitorsCount;

        ctrl.setRadius(2000);
        const competitors2000 = ctrl.getState().analysisResult!.competitorsCount;

        assert.ok(
            competitors1000 >= competitors500,
            `Competitors at 1000m (${competitors1000}) must be >= competitors at 500m (${competitors500})`
        );
        assert.ok(
            competitors2000 >= competitors1000,
            `Competitors at 2000m (${competitors2000}) must be >= competitors at 1000m (${competitors1000})`
        );
    });

    await t.test('[T3-06] Category switching with active candidate location recalculates competitors', () => {
        const ctrl = new EntrepreneurMapController();
        ctrl.selectCategory('Kuliner');
        ctrl.setCandidatePoint(-6.595, 106.79);
        ctrl.setRadius(1000);
        const kulinerCompetitors = ctrl.getState().analysisResult!.competitorsCount;

        // Switch category to Teknologi (which has far fewer items in Bogor)
        ctrl.selectCategory('Teknologi');
        const techCompetitors = ctrl.getState().analysisResult!.competitorsCount;

        // Point and radius must be preserved
        assert.deepEqual(ctrl.getState().candidatePoint, { lat: -6.595, lng: 106.79 });
        assert.equal(ctrl.getState().radiusMeters, 1000);
        assert.equal(ctrl.getState().selectedCategory, 'Teknologi');
        assert.ok(
            kulinerCompetitors >= techCompetitors,
            'Kuliner density should exceed or equal Teknologi density in Bogor'
        );
    });

    await t.test('[T3-07] Concurrent layer toggling does not disrupt active route polyline', () => {
        const ctrl = new VisitorMapController();
        ctrl.startRouting('motor', 3500, 8.5);
        assert.equal(ctrl.getState().sidebarState, 'ROUTE');
        assert.equal(ctrl.getState().routing?.isActive, true);

        // Toggle all 4 spatial layers
        ctrl.toggleLayer('wilayah');
        ctrl.toggleLayer('sekolah');
        ctrl.toggleLayer('jalan');
        ctrl.toggleLayer('permukiman');

        // Verify routing state remains unchanged
        assert.equal(ctrl.getState().sidebarState, 'ROUTE');
        assert.equal(ctrl.getState().routing?.isActive, true);
        assert.equal(ctrl.getState().routing?.distanceMeters, 3500);
    });

    await t.test('[T3-08] Clearing search restores results filtered by active category', () => {
        const ctrl = new VisitorMapController();
        ctrl.selectCategory('Fashion');
        assert.equal(ctrl.getState().activeCategory, 'Fashion');

        // Type query that returns empty
        ctrl.setSearchQuery('XYZ_NO_MATCH', 0);
        assert.equal(ctrl.getState().sidebarState, 'EMPTY');

        // Clear search
        ctrl.clearSearch();
        assert.equal(ctrl.getState().sidebarState, 'LIST');
        assert.equal(ctrl.getState().activeCategory, 'Fashion', 'Category filter should still be active');
    });
});
