import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDatasetStatistics } from './harness/index.ts';

// ============================================================================
// MASTER E2E TEST RUNNER & SUITE INTEGRITY VERIFIER
// ============================================================================

test('Master E2E Test Suite Integrity & Audit Summary', async (t) => {
    const stats = getDatasetStatistics();

    await t.test('E2E Test File Layout & Completeness', () => {
        const requiredTestFiles = [
            'tier1-features.test.ts',
            'tier2-boundaries.test.ts',
            'tier3-cross-feature.test.ts',
            'tier4-personas.test.ts',
            'tier5-adversarial.test.ts',
            'harness/index.ts',
            'harness/dataset.ts',
            'harness/geojson.ts',
            'harness/spatial.ts',
            'harness/api-simulator.ts',
            'harness/state-machine.ts',
        ];

        for (const file of requiredTestFiles) {
            const fullPath = path.resolve(import.meta.dirname, file);
            assert.ok(fs.existsSync(fullPath), `Required test harness file missing: ${file}`);
        }
    });

    await t.test('Authoritative Master Dataset Invariants Checksum', () => {
        // Assert total count invariant
        assert.equal(stats.total, 2993, 'Total records must be exactly 2,993');

        // Assert Kecamatan invariant: 6 districts summing to 2,993
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
            assert.equal(stats.perKecamatan[kec], count, `Mismatch in Kecamatan ${kec}`);
            kecSum += count;
        }
        assert.equal(kecSum, 2993);

        // Assert Kategori invariant: 5 categories summing to 2,993
        const expectedKategori: Record<string, number> = {
            Kuliner: 2212,
            Jasa: 301,
            Fashion: 230,
            Kerajinan: 200,
            Teknologi: 50,
        };

        let katSum = 0;
        for (const [kat, count] of Object.entries(expectedKategori)) {
            assert.equal(stats.perKategori[kat], count, `Mismatch in Kategori ${kat}`);
            katSum += count;
        }
        assert.equal(katSum, 2993);
    });

    await t.test('Root Infrastructure Documentation Verification', () => {
        const candidatePathsInfra = [
            path.resolve(import.meta.dirname, '../../../../TEST_INFRA.md'),
            path.resolve(process.cwd(), 'TEST_INFRA.md'),
            path.resolve(process.cwd(), '../../TEST_INFRA.md'),
            path.resolve('D:/Learn_IPB/Semester 5/Sistem Informasi Geografis/PJBL-WebGIS-RINTIK/TEST_INFRA.md'),
        ];
        const infraPath = candidatePathsInfra.find((p) => fs.existsSync(p));
        assert.ok(infraPath, 'TEST_INFRA.md must exist at project root');
        const infraContent = fs.readFileSync(infraPath!, 'utf8');
        assert.ok(infraContent.includes('Tier 1: Feature Coverage'));
        assert.ok(infraContent.includes('Tier 2: Boundary & Corner Cases'));
        assert.ok(infraContent.includes('Tier 3: Cross-Feature State Coherence'));
        assert.ok(infraContent.includes('Tier 4: Real-World Scenarios'));

        const candidatePathsReady = [
            path.resolve(import.meta.dirname, '../../../../TEST_READY.md'),
            path.resolve(process.cwd(), 'TEST_READY.md'),
            path.resolve(process.cwd(), '../../TEST_READY.md'),
            path.resolve('D:/Learn_IPB/Semester 5/Sistem Informasi Geografis/PJBL-WebGIS-RINTIK/TEST_READY.md'),
        ];
        const readyPath = candidatePathsReady.find((p) => fs.existsSync(p));
        assert.ok(readyPath, 'TEST_READY.md must exist at project root');
        const readyContent = fs.readFileSync(readyPath!, 'utf8');
        assert.ok(readyContent.includes('ALL TESTS READY & VERIFIED'));
        assert.ok(readyContent.includes('npm run test:e2e'));
    });
});
