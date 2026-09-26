#!/usr/bin/env node
/**
 * Master CLI Test Runner for KINETIC Landing Page 4-Tier Test Suite
 * Usage:
 *   node tests/run_tests.mjs [--tier=1|2|3|4|all] [--bail]
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { registry } from './helpers/test_framework.mjs';

const args = process.argv.slice(2);
let requestedTier = 'all';
let bail = false;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    requestedTier = arg.split('=')[1];
  } else if (arg === '--bail') {
    bail = true;
  }
}

async function run() {
  console.log('============================================================');
  console.log('  KINETIC BLOOD ORANGE ENERGY — 4-TIER TEST RUNNER');
  console.log('============================================================');
  console.log(`  Target Tier:  ${requestedTier}`);
  console.log(`  Bail on Fail: ${bail}`);
  console.log('============================================================\n');

  // Load requested tier files
  if (requestedTier === 'all' || requestedTier === '1') {
    await import('./tier1_feature_coverage.test.mjs');
  }
  if (requestedTier === 'all' || requestedTier === '2') {
    await import('./tier2_boundary_corner.test.mjs');
  }
  if (requestedTier === 'all' || requestedTier === '3') {
    await import('./tier3_cross_feature.test.mjs');
  }
  if (requestedTier === 'all' || requestedTier === '4') {
    await import('./tier4_real_world.test.mjs');
  }
  if (requestedTier === 'all' || requestedTier === '5') {
    await import('./tier5_adversarial_stress.test.mjs');
  }

  const results = await registry.run({
    tier: requestedTier,
    reporter: 'spec',
    bail,
  });

  if (results.failed > 0) {
    console.error(`\x1b[31mE2E Verification Failed: ${results.failed} test(s) failed.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mE2E Verification Succeeded: All ${results.passed} active test(s) passed.\x1b[0m`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test suite runner encountered fatal error:', err);
  process.exit(1);
});
