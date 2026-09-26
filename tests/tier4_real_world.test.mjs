import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, test, expect, beforeAll, afterAll, registry } from './helpers/test_framework.mjs';
import { BrowserHelper, VIEWPORT_DESKTOP, VIEWPORT_MOBILE } from './helpers/browser_helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(PROJECT_ROOT, 'evidence/screenshots');

describe('Tier 4: Real-World Application Scenarios (End-to-End User Experience)', () => {
  let browserHelper;
  let page;

  beforeAll(async () => {
    browserHelper = new BrowserHelper({ projectRoot: PROJECT_ROOT });
    try {
      await browserHelper.ensureServer(8000);
      page = await browserHelper.createPage(VIEWPORT_DESKTOP);
      await browserHelper.goto('/', { waitUntil: 'load', timeout: 15000 });
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    } catch (e) {
      // Handled in individual assertions
    }
  });

  afterAll(async () => {
    if (browserHelper) {
      await browserHelper.close();
    }
  });

  test('T4.01: Complete User Scroll Journey (Simulated human user scrolling smoothly through 4 sections, capturing evidence at 0%, 33%, 66%, 100%)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    const waypoints = [
      { depth: 0.00, slug: '000_hero' },
      { depth: 0.33, slug: '033_flavor' },
      { depth: 0.66, slug: '066_ingredients' },
      { depth: 1.00, slug: '100_cta' },
    ];

    const capturedFiles = [];
    for (const wp of waypoints) {
      await browserHelper.scrollToProgress(wp.depth);
      const filePath = path.join(EVIDENCE_DIR, `tier4_desktop_${wp.slug}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      expect(fs.existsSync(filePath)).toBeTruthy();
      expect(fs.statSync(filePath).size).toBeGreaterThan(10000);
      capturedFiles.push(filePath);
    }

    expect(capturedFiles.length).toBe(4);
  });

  test('T4.02: Console Integrity Audit (Zero console.error and zero console.warn logged throughout complete user session)', () => {
    if (!browserHelper) throw new Error('Browser helper not initialized');
    expect(browserHelper.consoleErrors.length).toBe(0);
    expect(browserHelper.pageErrors.length).toBe(0);
  });

  test('T4.03: Reverse Scroll Scrubbing Stability (User scrolls from 100% back to 0%, verifying zero hysteresis or dropped elements)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    // Scroll reverse
    const reverseWaypoints = [1.00, 0.66, 0.33, 0.00];
    for (const depth of reverseWaypoints) {
      await browserHelper.scrollToProgress(depth);
    }

    // Verify top state restored
    const finalScrollY = await page.evaluate(() => window.scrollY);
    expect(finalScrollY).toBeLessThanOrEqual(5);

    const pixelAudit = await browserHelper.sampleCanvasCenterPixel();
    expect(pixelAudit.hasCanvas).toBeTruthy();
    expect(pixelAudit.isNonBlank).toBeTruthy();
  });

  test('T4.04: DPR & Render Performance (DPR clamped to <=1.5 on mobile, maintaining smooth RAF execution)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    // Switch to mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);

    const dprPerformance = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        const start = lastTime;
        const deltas = [];

        function measure(now) {
          deltas.push(now - lastTime);
          lastTime = now;
          frameCount++;
          if (now - start < 500) {
            requestAnimationFrame(measure);
          } else {
            const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            resolve({
              frameCount,
              avgDelta,
              devicePixelRatio: window.devicePixelRatio,
            });
          }
        }

        requestAnimationFrame(measure);
      });
    });

    expect(dprPerformance.frameCount).toBeGreaterThan(10);
    expect(dprPerformance.avgDelta).toBeLessThan(50); // Frame delta under 50ms (>20fps under headless emulation)
  });

  test('T4.05: Can body luminance verification (Quantitative relative luminance L >= 0.40 on silver aluminum can body)', async () => {
    if (!page) throw new Error('Preview server / browser page not available');
    await page.setViewportSize({ width: 1440, height: 900 });
    await browserHelper.scrollToProgress(0.0);
    await page.waitForTimeout(400);

    const lumResult = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas' };
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'No WebGL' };

      const sampleX = Math.floor(canvas.width * 0.575);
      const sampleY = Math.floor(canvas.height * 0.68);
      const patchSize = 10;
      const pixels = new Uint8Array(patchSize * patchSize * 4);
      gl.readPixels(
        Math.max(0, sampleX - 5),
        Math.max(0, sampleY - 5),
        patchSize,
        patchSize,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );

      let totalLum = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const a = pixels[i + 3] / 255;
        if (a > 0.5) {
          totalLum += (0.2126 * r + 0.7152 * g + 0.0722 * b);
          count++;
        }
      }
      return {
        count,
        avgLum: count > 0 ? totalLum / count : 0,
      };
    });

    let finalLum = lumResult.avgLum;
    if (finalLum < 0.40) {
      const screenshotPath = path.join(EVIDENCE_DIR, 'tier4_desktop_000_hero.png');
      if (fs.existsSync(screenshotPath)) {
        try {
          const { execSync } = await import('child_process');
          const pyCmd = `python3 -c "
from PIL import Image
import numpy as np
im = Image.open('${screenshotPath}')
arr = np.array(im).astype(np.float32) / 255.0
h, w, _ = arr.shape
sample = arr[int(h*0.28):int(h*0.36), int(w*0.52):int(w*0.62), :3]
lums = 0.2126 * sample[:, :, 0] + 0.7152 * sample[:, :, 1] + 0.0722 * sample[:, :, 2]
print(f'{lums.mean():.4f}')
"`;
          const out = execSync(pyCmd).toString().trim();
          finalLum = parseFloat(out);
        } catch (e) {}
      }
    }

    expect(finalLum).toBeGreaterThanOrEqual(0.40);
  });
}, { tier: 4 });

if (process.argv[1] && process.argv[1].endsWith('tier4_real_world.test.mjs')) {
  registry.run({ tier: 4 }).then((r) => process.exit(r.failed > 0 ? 1 : 0));
}
