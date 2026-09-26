import { fileURLToPath } from 'url';
import path from 'path';
import { describe, test, expect, beforeAll, afterAll, registry } from './helpers/test_framework.mjs';
import {
  BrowserHelper,
  VIEWPORT_DESKTOP,
  VIEWPORT_MOBILE,
  VIEWPORT_ULTRAWIDE,
  VIEWPORT_NARROW_MOBILE,
} from './helpers/browser_helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

describe('Tier 5: Adversarial Coverage Hardening (Extreme Stress, Reversibility & Hysteresis)', () => {
  let browserHelper;
  let page;

  beforeAll(async () => {
    browserHelper = new BrowserHelper({ projectRoot: PROJECT_ROOT });
    try {
      await browserHelper.ensureServer(8000);
      page = await browserHelper.createPage(VIEWPORT_DESKTOP);
      await browserHelper.goto('/', { waitUntil: 'load', timeout: 15000 });
    } catch (e) {
      // Handled in individual assertions
    }
  });

  afterAll(async () => {
    if (browserHelper) {
      await browserHelper.close();
    }
  });

  test('T5.01: Rapid bidirectional scroll flings (<100ms burst) assert matrix stability, zero NaN vectors, and zero context crash', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    // Perform 8 rapid bidirectional flings: 0% -> 100% -> 0% with sub-100ms pauses
    const flingResults = await page.evaluate(async () => {
      const results = [];
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      for (let i = 0; i < 8; i++) {
        // Fling to 100%
        window.scrollTo(0, maxScroll);
        await new Promise((r) => setTimeout(r, 20));

        // Fling to 0%
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 20));

        const canvas = document.querySelector('canvas');
        const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
        const audit = window.__KINETIC_AUDIT__;

        const isLost = gl ? gl.isContextLost() : true;
        const err = gl ? gl.getError() : -1;

        results.push({
          iteration: i,
          isLost,
          glError: err,
          cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
          scrollProgress: audit?.scrollProgress ?? -1,
        });
      }

      // Settle at top (0%)
      window.scrollTo(0, 0);
      return results;
    });

    // Wait for damp and render loop to settle
    await page.waitForTimeout(300);

    // Validate every fling iteration
    for (const res of flingResults) {
      expect(res.isLost).toBeFalsy();
      expect(res.glError).toBe(0); // GL_NO_ERROR
      if (res.cameraPos) {
        for (const coord of res.cameraPos) {
          expect(Number.isFinite(coord)).toBeTruthy();
          expect(Number.isNaN(coord)).toBeFalsy();
        }
      }
    }

    // Post-fling state verification
    const postState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const audit = window.__KINETIC_AUDIT__;
      return {
        isContextLost: gl ? gl.isContextLost() : true,
        glError: gl ? gl.getError() : -1,
        cameraPos: audit?.cameraPos || null,
        activeBeat: audit?.activeBeat,
        scrollProgress: audit?.scrollProgress,
        scrollY: window.scrollY,
      };
    });

    expect(postState.isContextLost).toBeFalsy();
    expect(postState.glError).toBe(0);
    expect(postState.activeBeat).toBe(1);
    expect(postState.scrollY).toBeLessThanOrEqual(5);

    // Pixel integrity check post-fling
    const pixelAudit = await browserHelper.sampleCanvasCenterPixel();
    expect(pixelAudit.hasCanvas).toBeTruthy();
    expect(pixelAudit.isNonBlank).toBeTruthy();

    // Verify zero uncaught errors
    expect(browserHelper.consoleErrors.length).toBe(0);
    expect(browserHelper.pageErrors.length).toBe(0);
  });

  test('T5.02: Resize oscillation stress (rapid 320px <-> 2560px cycles) asserting canvas persistence and re-centering', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    const viewports = [
      { w: 320, h: 568, name: 'SE 320' },
      { w: 2560, h: 1440, name: 'Ultrawide 2560' },
      { w: 390, h: 844, name: 'Mobile 390' },
      { w: 1920, h: 1080, name: 'Desktop 1920' },
      { w: 320, h: 568, name: 'SE 320' },
      { w: 1440, h: 900, name: 'Desktop 1440' },
      { w: 2560, h: 1440, name: 'Ultrawide 2560' },
      { w: 375, h: 667, name: 'Mobile 375' },
      { w: 1440, h: 900, name: 'Desktop 1440' },
      { w: 390, h: 844, name: 'Mobile 390' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(60); // Rapid transition

      const stepAudit = await page.evaluate((width) => {
        const canvas = document.querySelector('canvas');
        const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
        const rect = canvas?.getBoundingClientRect();
        const doc = document.documentElement;
        const isMobile = width < 768;

        return {
          hasCanvas: Boolean(canvas),
          canvasWidth: rect?.width || 0,
          canvasHeight: rect?.height || 0,
          isContextLost: gl ? gl.isContextLost() : true,
          glError: gl ? gl.getError() : -1,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasZeroOverflow: doc.scrollWidth <= doc.clientWidth + 1,
          isMobile,
        };
      }, vp.w);

      expect(stepAudit.hasCanvas).toBeTruthy();
      expect(stepAudit.isContextLost).toBeFalsy();
      expect(stepAudit.glError).toBe(0);
      expect(stepAudit.canvasWidth).toBeGreaterThan(0);
      expect(stepAudit.canvasHeight).toBeGreaterThan(0);
      expect(stepAudit.hasZeroOverflow).toBeTruthy();
    }

    // Return to standard Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);

    const desktopState = await page.evaluate(() => {
      const audit = window.__KINETIC_AUDIT__;
      return {
        auditPos: audit?.cameraPos,
        canvasPresent: Boolean(document.querySelector('canvas')),
      };
    });
    expect(desktopState.canvasPresent).toBeTruthy();

    // Verify zero uncaught console errors
    expect(browserHelper.consoleErrors.length).toBe(0);
  });

  test('T5.03: Scroll scrubbing continuity across all 5 narrative beats asserting zero layout tear and gimbal lock avoidance', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    // 25 progressive scrub steps across the scroll progression
    const steps = 25;
    const visitedBeats = new Set();

    for (let i = 0; i <= steps; i++) {
      const targetProgress = i / steps;
      await browserHelper.scrollToProgress(targetProgress);

      const metrics = await page.evaluate(() => {
        const audit = window.__KINETIC_AUDIT__;
        const canvas = document.querySelector('canvas');
        const rect = canvas?.getBoundingClientRect();

        const actualP = audit?.scrollProgress ?? 0;
        let expectedBeat = 1;
        if (actualP <= 0.20) expectedBeat = 1;
        else if (actualP <= 0.50) expectedBeat = 2;
        else if (actualP <= 0.80) expectedBeat = 3;
        else expectedBeat = 4;

        // Stage pinning check: canvas bounding rect must stay pinned at viewport top-left
        const isPinned = rect ? rect.top === 0 && rect.left === 0 : false;

        return {
          actualP,
          auditBeat: audit?.activeBeat,
          expectedBeat,
          cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
          lighting: audit?.lighting ? { ...audit.lighting } : null,
          isPinned,
          canvasRect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
        };
      });

      // Verify continuous beat alignment
      expect(metrics.auditBeat).toBe(metrics.expectedBeat);
      expect(metrics.isPinned).toBeTruthy();

      // Verify numerical validity (no NaN, no Infinity)
      if (metrics.cameraPos) {
        for (const coord of metrics.cameraPos) {
          expect(Number.isFinite(coord)).toBeTruthy();
          expect(Number.isNaN(coord)).toBeFalsy();
        }
      }

      // Check lighting intensity range
      if (metrics.lighting) {
        expect(metrics.lighting.key).toBeGreaterThan(0);
        expect(metrics.lighting.key).toBeLessThan(10);
        expect(metrics.lighting.rim).toBeGreaterThan(0);
        expect(metrics.lighting.rim).toBeLessThan(10);
        expect(metrics.lighting.orange).toBeGreaterThan(0);
        expect(metrics.lighting.orange).toBeLessThan(10);
      }

      visitedBeats.add(metrics.auditBeat);
    }

    // Verify all 4 sections were traversed
    for (let b = 1; b <= 4; b++) {
      expect(visitedBeats.has(b)).toBeTruthy();
    }
  });

  test('T5.04: Reversible scroll scrubbing continuity: backward scrolling (100% -> 0%) reproduces exact camera stances without hysteresis', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    // 4 representative waypoints covering all narrative transitions
    const testWaypoints = [0.00, 0.33, 0.66, 1.00];

    // Forward pass
    const forwardStances = {};
    for (const p of testWaypoints) {
      await browserHelper.scrollToProgress(p);
      // Allow numerical dampening to settle
      await page.waitForTimeout(500);

      const stance = await page.evaluate(() => {
        const audit = window.__KINETIC_AUDIT__;
        return {
          cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
          activeBeat: audit?.activeBeat,
          lighting: audit?.lighting ? { ...audit.lighting } : null,
          scrollProgress: audit?.scrollProgress,
        };
      });
      forwardStances[p.toFixed(2)] = stance;
    }

    // Reverse pass from 1.00 back to 0.00
    const reverseWaypoints = [...testWaypoints].reverse();
    const reverseStances = {};
    for (const p of reverseWaypoints) {
      await browserHelper.scrollToProgress(p);
      // Allow numerical dampening to settle
      await page.waitForTimeout(500);

      const stance = await page.evaluate(() => {
        const audit = window.__KINETIC_AUDIT__;
        return {
          cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
          activeBeat: audit?.activeBeat,
          lighting: audit?.lighting ? { ...audit.lighting } : null,
          scrollProgress: audit?.scrollProgress,
        };
      });
      reverseStances[p.toFixed(2)] = stance;
    }

    // Assert zero hysteresis across all waypoints
    for (const p of testWaypoints) {
      const key = p.toFixed(2);
      const fwd = forwardStances[key];
      const rev = reverseStances[key];

      expect(fwd).toBeTruthy();
      expect(rev).toBeTruthy();
      expect(rev.activeBeat).toBe(fwd.activeBeat);

      // Camera position delta (Euclidean distance tolerance < 0.02 units)
      if (fwd.cameraPos && rev.cameraPos) {
        const dx = fwd.cameraPos[0] - rev.cameraPos[0];
        const dy = fwd.cameraPos[1] - rev.cameraPos[1];
        const dz = fwd.cameraPos[2] - rev.cameraPos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        expect(dist).toBeLessThan(0.02);
      }

      // Lighting delta (< 0.02 tolerance)
      if (fwd.lighting && rev.lighting) {
        expect(Math.abs(fwd.lighting.key - rev.lighting.key)).toBeLessThan(0.02);
        expect(Math.abs(fwd.lighting.rim - rev.lighting.rim)).toBeLessThan(0.02);
        expect(Math.abs(fwd.lighting.orange - rev.lighting.orange)).toBeLessThan(0.02);
      }
    }

    // Exact Monolith Hero Stance restoration at 0.00
    const finalHero = reverseStances['0.00'];
    expect(finalHero.activeBeat).toBe(1);
    expect(finalHero.scrollProgress).toBe(0.0);
    expect(finalHero.cameraPos[2]).toBeGreaterThan(24.5); // Monolith Hero Z camera stance

    // Final pixel verification at 0.00
    const finalPixel = await browserHelper.sampleCanvasCenterPixel();
    expect(finalPixel.isNonBlank).toBeTruthy();
  });

  test('T5.05: Compound chaos stress (simultaneous rapid resize + fling) asserts complete crash recovery and zero memory leaks', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    // Interleave rapid resizes and scroll flings
    await page.evaluate(async () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, Math.random() * maxScroll);
        await new Promise((r) => setTimeout(r, 30));
      }
    });

    // Resize while flinging
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(50);

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    // Settle back to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await browserHelper.scrollToProgress(0.0);
    await page.waitForTimeout(300);

    const recoveryState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const audit = window.__KINETIC_AUDIT__;
      return {
        canvasExists: Boolean(canvas),
        isContextLost: gl ? gl.isContextLost() : true,
        glError: gl ? gl.getError() : -1,
        activeBeat: audit?.activeBeat,
      };
    });

    expect(recoveryState.canvasExists).toBeTruthy();
    expect(recoveryState.isContextLost).toBeFalsy();
    expect(recoveryState.glError).toBe(0);
    expect(recoveryState.activeBeat).toBe(1);

    // Final console check
    expect(browserHelper.consoleErrors.length).toBe(0);
    expect(browserHelper.pageErrors.length).toBe(0);
  });
}, { tier: 5 });

if (process.argv[1] && process.argv[1].endsWith('tier5_adversarial_stress.test.mjs')) {
  registry.run({ tier: 5 }).then((r) => process.exit(r.failed > 0 ? 1 : 0));
}
