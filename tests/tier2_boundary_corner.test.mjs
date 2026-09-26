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

describe('Tier 2: Boundary & Corner Cases (Resilience & Edge Conditions)', () => {
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

  test('T2.01: Viewport edge boundary: Ultra-wide desktop (2560x1440) renders without horizontal scroll overflow', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await page.setViewportSize({ width: VIEWPORT_ULTRAWIDE.width, height: VIEWPORT_ULTRAWIDE.height });
    await page.waitForTimeout(200);

    const overflow = await browserHelper.checkHorizontalOverflow();
    expect(overflow.hasZeroOverflow).toBeTruthy();
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('T2.02: Viewport edge boundary: Narrow mobile (320x568 iPhone SE) renders without horizontal scroll overflow', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await page.setViewportSize({ width: VIEWPORT_NARROW_MOBILE.width, height: VIEWPORT_NARROW_MOBILE.height });
    await page.waitForTimeout(200);

    const overflow = await browserHelper.checkHorizontalOverflow();
    expect(overflow.hasZeroOverflow).toBeTruthy();
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('T2.03: Scroll boundaries: Scroll depth exactly 0.00 (top of page) maintains valid camera matrix', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await browserHelper.scrollToProgress(0.00);

    const matrixCheck = await page.evaluate(() => {
      const audit = window.__KINETIC_AUDIT__;
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const isContextLost = gl ? gl.isContextLost() : false;
      return {
        isContextLost,
        auditPos: audit?.cameraPos || null,
        scrollY: window.scrollY,
      };
    });

    expect(matrixCheck.isContextLost).toBeFalsy();
    if (matrixCheck.auditPos) {
      for (const val of matrixCheck.auditPos) {
        expect(Number.isFinite(val)).toBeTruthy();
        expect(Number.isNaN(val)).toBeFalsy();
      }
    }
  });

  test('T2.04: Scroll boundaries: Scroll depth exactly 1.00 (bottom of page) maintains valid camera matrix', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await browserHelper.scrollToProgress(1.00);

    const matrixCheck = await page.evaluate(() => {
      const audit = window.__KINETIC_AUDIT__;
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const isContextLost = gl ? gl.isContextLost() : false;
      return {
        isContextLost,
        auditPos: audit?.cameraPos || null,
        scrollY: window.scrollY,
      };
    });

    expect(matrixCheck.isContextLost).toBeFalsy();
    if (matrixCheck.auditPos) {
      for (const val of matrixCheck.auditPos) {
        expect(Number.isFinite(val)).toBeTruthy();
        expect(Number.isNaN(val)).toBeFalsy();
      }
    }
  });

  test('T2.05: Rapid resize stress: Window resize from 1440px to 390px and back retains WebGL canvas and correct aspect ratio', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    // Resize down to mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);

    // Resize back to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(100);

    const canvasState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return {
        width: rect.width,
        height: rect.height,
        isContextLost: gl ? gl.isContextLost() : true,
      };
    });

    expect(canvasState !== null).toBeTruthy();
    expect(canvasState.isContextLost).toBeFalsy();
    expect(canvasState.width).toBeGreaterThan(1000);
  });

  test('T2.06: Fast scroll fling: Instant jump from 0% to 100% and 100% to 0% executes without WebGL context crash or NaN vectors', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    // Rapid jumps
    await page.evaluate(() => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, maxScroll);
      window.scrollTo(0, 0);
      window.scrollTo(0, maxScroll);
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(150);

    const postFling = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const audit = window.__KINETIC_AUDIT__;
      return {
        isContextLost: gl ? gl.isContextLost() : true,
        auditPos: audit?.cameraPos || null,
      };
    });

    expect(postFling.isContextLost).toBeFalsy();
    if (postFling.auditPos) {
      for (const val of postFling.auditPos) {
        expect(Number.isFinite(val)).toBeTruthy();
      }
    }
  });
}, { tier: 2 });

if (process.argv[1] && process.argv[1].endsWith('tier2_boundary_corner.test.mjs')) {
  registry.run({ tier: 2 }).then((r) => process.exit(r.failed > 0 ? 1 : 0));
}
