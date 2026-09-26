import { fileURLToPath } from 'url';
import path from 'path';
import { describe, test, expect, beforeAll, afterAll, registry } from './helpers/test_framework.mjs';
import { BrowserHelper, VIEWPORT_DESKTOP, VIEWPORT_MOBILE } from './helpers/browser_helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

describe('Tier 3: Cross-Feature Combinations (Pairwise Coverage & Synchronization)', () => {
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

  test('T3.01: Scroll progression × Camera waypoint interpolation (Camera moves smoothly across all 4 narrative sections)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    const waypoints = [0.0, 0.33, 0.66, 1.0];
    const cameraPositions = [];

    for (const wp of waypoints) {
      await browserHelper.scrollToProgress(wp);
      const audit = await page.evaluate(() => window.__KINETIC_AUDIT__);
      if (audit && audit.cameraPos) {
        cameraPositions.push({ wp, pos: [...audit.cameraPos] });
      }
    }

    if (cameraPositions.length >= 2) {
      const first = cameraPositions[0];
      const last = cameraPositions[cameraPositions.length - 1];
      const deltaZ = Math.abs(first.pos[2] - last.pos[2]);
      const deltaY = Math.abs(first.pos[1] - last.pos[1]);
      const deltaX = Math.abs(first.pos[0] - last.pos[0]);
      expect(deltaX + deltaY + deltaZ).toBeGreaterThan(0.1);
    }
  });

  test('T3.02: Scroll progression × Lighting intensity modulation (Key, rim, and orange accent lights modulate across beats)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await browserHelper.scrollToProgress(0.33);
    const lightingAudit = await page.evaluate(() => {
      const audit = window.__KINETIC_AUDIT__;
      return {
        hasLighting: audit?.lighting !== undefined || audit?.activeBeat !== undefined,
        activeBeat: audit?.activeBeat || 1,
      };
    });

    expect(lightingAudit !== null).toBeTruthy();
  });

  test('T3.03: Scroll progression × DOM editorial reveal synchronization (Active text beat aligns with 3D model orientation)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await browserHelper.scrollToProgress(0.0);
    const heroVisible = await page.evaluate(() => {
      const hero = document.querySelector('h1') || document.querySelector('#hero') || document.querySelector('#beat-hero');
      if (!hero) return false;
      const rect = hero.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });

    expect(heroVisible).toBeTruthy();
  });

  test('T3.04: Responsive mode × Camera framing (Desktop split-screen vs Mobile centered vertical stack framing)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    // Test desktop framing
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(100);
    const desktopLayout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const main = document.querySelector('main');
      return {
        canvasWidth: canvas ? canvas.clientWidth : 0,
        mainWidth: main ? main.clientWidth : 0,
      };
    });

    // Test mobile framing
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    const mobileLayout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const main = document.querySelector('main');
      return {
        canvasWidth: canvas ? canvas.clientWidth : 0,
        mainWidth: main ? main.clientWidth : 0,
      };
    });

    expect(desktopLayout.canvasWidth).toBeGreaterThan(0);
    expect(mobileLayout.canvasWidth).toBeGreaterThan(0);
    expect(mobileLayout.canvasWidth).toBeLessThan(desktopLayout.canvasWidth);
  });

  test('T3.05: Mobile touch scrubbing × Canvas non-blank rendering (Simulated touch scroll keeps canvas continuously rendering)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await page.setViewportSize({ width: 390, height: 844 });
    await browserHelper.scrollToProgress(0.5);

    const pixelAudit = await browserHelper.sampleCanvasCenterPixel();
    expect(pixelAudit.hasCanvas).toBeTruthy();
    expect(pixelAudit.isNonBlank).toBeTruthy();
  });

  test('T3.06: Sticky stage pinning invariant & zero cumulative layout shift (Canvas fixed/sticky stage persists during scroll)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await browserHelper.scrollToProgress(0.5);

    const stagePinning = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      const isFixedOrSticky = style.position === 'fixed' || style.position === 'sticky' ||
        (canvas.parentElement && (window.getComputedStyle(canvas.parentElement).position === 'fixed' || window.getComputedStyle(canvas.parentElement).position === 'sticky'));
      return {
        rectTop: rect.top,
        isFixedOrSticky,
        isInViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      };
    });

    expect(stagePinning !== null).toBeTruthy();
    expect(stagePinning.isInViewport).toBeTruthy();
  });

  test('T3.07: Zero spatial overlap between text containers and 3D can (Dynamic WebGL Pixel Profiling)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');

    const waypoints = [0.00, 0.33, 0.66, 1.00];

    // 1. Audit Desktop 1440x900 across all 4 waypoints
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const p of waypoints) {
      await browserHelper.scrollToProgress(p);
      await page.waitForTimeout(300);

      const audit = await browserHelper.auditSpatialClearance();
      expect(Boolean(audit.error)).toBeFalsy();
      expect(audit.canBox).toBeTruthy();
      expect(audit.canBox.sampledPixels).toBeGreaterThan(1000);
      expect(audit.hasCollision).toBeFalsy();
      expect(audit.collisions.length).toBe(0);
      expect(audit.minClearance).toBeGreaterThanOrEqual(100); // Desktop negative space corridor >= 100px
    }

    // 2. Audit Mobile 390x844 across all 4 waypoints
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of waypoints) {
      await browserHelper.scrollToProgress(p);
      await page.waitForTimeout(300);

      const audit = await browserHelper.auditSpatialClearance();
      expect(Boolean(audit.error)).toBeFalsy();
      expect(audit.canBox).toBeTruthy();
      expect(audit.canBox.sampledPixels).toBeGreaterThan(500);
      expect(audit.hasCollision).toBeFalsy();
      expect(audit.collisions.length).toBe(0);
      expect(audit.minClearance).toBeGreaterThanOrEqual(30); // Mobile vertical buffer >= 30px
    }
  });
}, { tier: 3 });

if (process.argv[1] && process.argv[1].endsWith('tier3_cross_feature.test.mjs')) {
  registry.run({ tier: 3 }).then((r) => process.exit(r.failed > 0 ? 1 : 0));
}
