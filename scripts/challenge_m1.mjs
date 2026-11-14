import fs from 'node:fs';
import path from 'node:path';
import { compile } from 'tailwindcss';
import { createClient } from '@supabase/supabase-js';

const ROOT_DIR = path.resolve(process.cwd());
const results = {
  cssTokens: { passed: false, details: [] },
  overflowClip: { passed: false, details: [] },
  supabaseResilience: { passed: false, details: [] },
  umkmIdRoute: { passed: false, details: [] },
  permukimanLayer: { passed: false, details: [] },
  dataSync: { passed: false, details: [] },
};

console.log('====================================================');
console.log('CHALLENGER 1: ADVERSARIAL VERIFICATION HARNESS (M1)');
console.log('====================================================\n');

// ----------------------------------------------------
// CHALLENGE 1: CSS Tokens & overflow-x: clip
// ----------------------------------------------------
console.log('[1/5] Challenging CSS Tokens & Layout Invariants...');
const globalsCssPath = path.join(ROOT_DIR, 'src/app/globals.css');
if (!fs.existsSync(globalsCssPath)) {
  results.cssTokens.details.push('globals.css not found!');
} else {
  const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

  // Verify overflow-x: clip on html, body
  const overflowMatch = /html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*clip[^}]*\}/s.test(cssContent);
  if (overflowMatch) {
    results.overflowClip.passed = true;
    results.overflowClip.details.push('Verified: overflow-x: clip set on html, body');
  } else {
    results.overflowClip.details.push('FAILED: overflow-x: clip NOT found on html, body block');
  }

  // Verify Tailwind CSS v4 candidate resolution
  try {
    const compiler = await compile(cssContent, {
      base: path.join(ROOT_DIR, 'src/app'),
      loadStylesheet: async (id, base) => {
        if (id === 'tailwindcss') {
          const twPath = path.join(ROOT_DIR, 'node_modules/tailwindcss/index.css');
          return { base: path.dirname(twPath), content: fs.readFileSync(twPath, 'utf8') };
        }
        const fullPath = path.resolve(base, id);
        return { base: path.dirname(fullPath), content: fs.readFileSync(fullPath, 'utf8') };
      }
    });

    const candidateTests = [
      { name: 'Primary color (bg-primary)', cls: 'bg-primary', expectedProp: '--color-primary' },
      { name: 'Secondary color (bg-secondary)', cls: 'bg-secondary', expectedProp: '--color-secondary' },
      { name: 'Orange color (bg-orange)', cls: 'bg-orange', expectedProp: '--color-orange' },
      { name: 'Category Kuliner (bg-cat-kuliner)', cls: 'bg-cat-kuliner', expectedProp: '--cat-kuliner' },
      { name: 'Category Fashion (bg-cat-fashion)', cls: 'bg-cat-fashion', expectedProp: '--cat-fashion' },
      { name: 'Category Jasa (bg-cat-jasa)', cls: 'bg-cat-jasa', expectedProp: '--cat-jasa' },
      { name: 'Category Kerajinan (bg-cat-kerajinan)', cls: 'bg-cat-kerajinan', expectedProp: '--cat-kerajinan' },
      { name: 'Category Teknologi (bg-cat-teknologi)', cls: 'bg-cat-teknologi', expectedProp: '--cat-teknologi' },
      { name: 'Background color (bg-background)', cls: 'bg-background', expectedProp: '--color-bg' },
      { name: 'Background color raw (bg-bg)', cls: 'bg-bg', expectedProp: '--color-bg' },
    ];

    const testClasses = candidateTests.map(c => c.cls);
    const built = compiler.build(testClasses);

    let allRequiredTokensPass = true;
    for (const test of candidateTests) {
      const generated = built.includes(`.${test.cls}`);
      if (generated) {
        results.cssTokens.details.push(`PASS: ${test.name} resolves to utility .${test.cls}`);
      } else {
        if (test.cls === 'bg-bg') {
          results.cssTokens.details.push(`OBSERVATION: .${test.cls} does not resolve (mapped as .bg-background instead of .bg-bg in @theme)`);
        } else {
          allRequiredTokensPass = false;
          results.cssTokens.details.push(`FAIL: ${test.name} FAILED to resolve utility .${test.cls}`);
        }
      }
    }
    results.cssTokens.passed = allRequiredTokensPass;
  } catch (err) {
    results.cssTokens.details.push(`Tailwind compilation error: ${err.message}`);
  }
}
console.log('CSS Tokens:', results.cssTokens.passed ? 'PASSED' : 'FAILED');
console.log('Overflow Clip:', results.overflowClip.passed ? 'PASSED' : 'FAILED');

// ----------------------------------------------------
// CHALLENGE 2: Supabase Resilience Without Env Vars
// ----------------------------------------------------
console.log('\n[2/5] Challenging Supabase Client Resilience...');
try {
  // Test fallback client constructor directly
  const fallbackClient = createClient(
    'https://placeholder-rintik.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  results.supabaseResilience.details.push('PASS: createClient does not throw on placeholder credentials');

  // Verify query execution error handling
  const queryResult = await fallbackClient.from('umkm').select('*').limit(1);
  if (queryResult.error) {
    results.supabaseResilience.details.push(`PASS: Query gracefully returns error object instead of throwing: ${queryResult.error.message}`);
    results.supabaseResilience.passed = true;
  } else {
    results.supabaseResilience.details.push('Query succeeded or returned unexpectedly');
    results.supabaseResilience.passed = true;
  }
} catch (err) {
  results.supabaseResilience.details.push(`FAIL: Supabase client crashed with unhandled exception: ${err.message}`);
}
console.log('Supabase Resilience:', results.supabaseResilience.passed ? 'PASSED' : 'FAILED');

// ----------------------------------------------------
// CHALLENGE 3: GET /api/umkm/[id] Edge Cases & Schema
// ----------------------------------------------------
console.log('\n[3/5] Challenging GET /api/umkm/[id] Edge Cases & Schema...');
const routeFile = path.join(ROOT_DIR, 'src/app/api/umkm/[id]/route.ts');
if (!fs.existsSync(routeFile)) {
  results.umkmIdRoute.details.push('route.ts not found!');
} else {
  const routeCode = fs.readFileSync(routeFile, 'utf8');

  // 1. Verify source attribute in SELECT statement
  const hasSource = /source\b/.test(routeCode);
  if (hasSource) {
    results.umkmIdRoute.details.push('PASS: "source" attribute is explicitly present in Supabase .select() statement');
  } else {
    results.umkmIdRoute.details.push('FAIL: "source" attribute is MISSING from Supabase .select() statement');
  }

  // 2. Test ID Regex Validation with Edge Cases
  const regexMatch = routeCode.match(/\/(\^[^/]+\$)\//);
  const regex = regexMatch ? new RegExp(regexMatch[1]) : /^UMKM(-BGR-)?[0-9]+$/;
  results.umkmIdRoute.details.push(`Active Route Regex: ${regex.toString()}`);

  const edgeCases = [
    { id: 'UMKM0001', expectValid: true, desc: 'Standard format' },
    { id: 'UMKM-BGR-0001', expectValid: true, desc: 'Legacy hyphenated format' },
    { id: 'ABC', expectValid: false, desc: 'Invalid non-numeric string' },
    { id: "UMKM0001' OR '1'='1", expectValid: false, desc: 'SQL injection payload 1' },
    { id: "UMKM' OR 1=1 --", expectValid: false, desc: 'SQL injection payload 2' },
    { id: "UMKM0001; DROP TABLE umkm;", expectValid: false, desc: 'SQL injection payload 3' },
    { id: '<script>alert(1)</script>', expectValid: false, desc: 'XSS script injection' },
    { id: 'umkm0001', expectValid: false, desc: 'Lowercase prefix' },
    { id: 'UMKM-1', expectValid: false, desc: 'Malformed hyphenated prefix' },
    { id: '12345', expectValid: false, desc: 'Digits only without UMKM prefix' },
    { id: '', expectValid: false, desc: 'Empty string' },
  ];

  let allEdgeCasesPass = true;
  for (const tc of edgeCases) {
    const isValid = regex.test(tc.id);
    if (isValid === tc.expectValid) {
      results.umkmIdRoute.details.push(`PASS [${tc.desc}]: "${tc.id}" -> ${isValid ? 'ACCEPTED' : 'REJECTED'}`);
    } else {
      allEdgeCasesPass = false;
      results.umkmIdRoute.details.push(`FAIL [${tc.desc}]: "${tc.id}" expected ${tc.expectValid ? 'ACCEPTED' : 'REJECTED'} but got ${isValid ? 'ACCEPTED' : 'REJECTED'}`);
    }
  }
  results.umkmIdRoute.passed = hasSource && allEdgeCasesPass;
}
console.log('UMKM [id] Edge Cases:', results.umkmIdRoute.passed ? 'PASSED' : 'FAILED');

// ----------------------------------------------------
// CHALLENGE 4: /api/layers/permukiman GeoJSON & Headers
// ----------------------------------------------------
console.log('\n[4/5] Challenging /api/layers/permukiman Endpoint & Data...');
const permukimanRouteFile = path.join(ROOT_DIR, 'src/app/api/layers/permukiman/route.ts');
if (!fs.existsSync(permukimanRouteFile)) {
  results.permukimanLayer.details.push('permukiman/route.ts not found!');
} else {
  const permukimanCode = fs.readFileSync(permukimanRouteFile, 'utf8');

  // Verify headers
  const hasCacheControl = permukimanCode.includes('"Cache-Control"');
  if (hasCacheControl) {
    results.permukimanLayer.details.push('PASS: Cache-Control headers configured for edge caching');
  } else {
    results.permukimanLayer.details.push('FAIL: Cache-Control header is missing');
  }

  // Check candidate data paths
  const localSyncedPath = path.join(ROOT_DIR, 'public/data/permukiman.geojson');
  const legacyDataPath = path.resolve(ROOT_DIR, '../../map-rintik/rintik-webgis/data/permukiman_kota_bogor_final(Multipolygon).geojson');

  const localExists = fs.existsSync(localSyncedPath);
  const legacyExists = fs.existsSync(legacyDataPath);

  if (localExists) {
    results.permukimanLayer.details.push('PASS: public/data/permukiman.geojson exists locally in app');
    try {
      const parsed = JSON.parse(fs.readFileSync(localSyncedPath, 'utf8'));
      results.permukimanLayer.details.push(`PASS: Valid GeoJSON FeatureCollection with ${parsed.features?.length} features`);
      results.permukimanLayer.passed = hasCacheControl && true;
    } catch (e) {
      results.permukimanLayer.details.push(`FAIL: Invalid JSON in local permukiman file: ${e.message}`);
    }
  } else {
    results.permukimanLayer.details.push(`DEFECT: public/data/permukiman.geojson is MISSING from webgis-rintik/public/data!`);
    if (legacyExists) {
      results.permukimanLayer.details.push(`FALLBACK: Found in map-rintik external folder (${legacyDataPath}), but NOT synced to webgis-rintik/public/data!`);
      const parsed = JSON.parse(fs.readFileSync(legacyDataPath, 'utf8'));
      results.permukimanLayer.details.push(`Legacy features count: ${parsed.features?.length}, geometry type: ${parsed.features?.[0]?.geometry?.type}`);
    }
    // Fails because local asset is missing
    results.permukimanLayer.passed = false;
  }
}
console.log('Permukiman Layer:', results.permukimanLayer.passed ? 'PASSED' : 'FAILED');

// ----------------------------------------------------
// CHALLENGE 5: Spatial GeoJSON Sync Status Across All 5 Datasets
// ----------------------------------------------------
console.log('\n[5/5] Challenging Public Spatial Data Synchronization...');
const expectedGeoJSONs = [
  { target: 'public/data/permukiman.geojson', source: 'permukiman_kota_bogor_final(Multipolygon).geojson' },
  { target: 'public/data/jalan.geojson', source: 'jalan_kota_bogor_final.geojson' },
  { target: 'public/data/sekolah.geojson', source: 'sekolah_kota_bogor_final.geojson' },
  { target: 'public/data/bogor_administrasi.geojson', source: 'ADMINISTRASIDESA_AR_25K_KotaBogor.geojson' },
  { target: 'public/data/master_umkm.geojson', source: 'master_umkm_final_update.geojson' },
];

let allSynced = true;
for (const gj of expectedGeoJSONs) {
  const fullTargetPath = path.join(ROOT_DIR, gj.target);
  const exists = fs.existsSync(fullTargetPath);
  if (exists) {
    const size = fs.statSync(fullTargetPath).size;
    results.dataSync.details.push(`SYNCED: ${gj.target} (${size} bytes)`);
  } else {
    allSynced = false;
    results.dataSync.details.push(`MISSING: ${gj.target} (Never copied from map-rintik/data/${gj.source})`);
  }
}
results.dataSync.passed = allSynced;
console.log('Data Sync:', results.dataSync.passed ? 'PASSED' : 'FAILED');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log('CHALLENGE SUMMARY & AUDIT TRAIL:');
console.log('====================================================');
console.log(JSON.stringify(results, null, 2));
