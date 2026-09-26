#!/usr/bin/env node
/**
 * Adversarial Layout Geometry & Scroll Reversibility Stress Harness
 * Challenger 1 — KINETIC Blood Orange Landing Page Elevation Pass
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROMIUM_EXEC_PATH = '/Users/travis/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const VIEWPORTS = [
  { id: 'desktop_1440x900', name: 'Desktop 1440x900', width: 1440, height: 900, dsf: 2 },
  { id: 'laptop_1024x768', name: 'Small Laptop 1024x768', width: 1024, height: 768, dsf: 2 },
  { id: 'tablet_768x1024', name: 'Tablet Portrait 768x1024', width: 768, height: 1024, dsf: 2 },
  { id: 'mobile_390x844', name: 'Mobile 390x844', width: 390, height: 844, dsf: 3 },
  { id: 'mobile_360x780', name: 'Narrow Mobile 360x780', width: 360, height: 780, dsf: 3 },
  { id: 'mobile_320x568', name: 'Narrow Mobile 320x568', width: 320, height: 568, dsf: 2 },
];

const SCROLL_INTERVALS = [0.00, 0.10, 0.25, 0.33, 0.50, 0.66, 0.75, 1.00];

async function runAdversarialHarness() {
  console.log('========================================================================');
  console.log('  CHALLENGER 1: ADVERSARIAL GEOMETRY & SCROLL REVERSIBILITY HARNESS');
  console.log('========================================================================\n');

  const distHtml = path.resolve(PROJECT_ROOT, 'dist/index.html');
  if (!fs.existsSync(distHtml)) {
    console.error(`Dist file missing: ${distHtml}. Please build first.`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXEC_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--single-process',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
    ]
  });

  const allMeasurements = {
    viewports: {},
    reversibility: {},
    summary: {
      totalCollisions: 0,
      collidingViewports: [],
      cleanViewports: [],
      hysteresisViolations: 0,
      layoutShiftViolations: 0,
      runawayStateViolations: 0,
    }
  };

  try {
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      deviceScaleFactor: VIEWPORTS[0].dsf,
    });

    const page = await context.newPage();
    await page.goto(`file://${distHtml}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify model hydration
    const modelStatus = await page.evaluate(() => {
      const audit = window.__KINETIC_AUDIT__;
      return {
        modelLoaded: audit?.modelLoaded || false,
        meshCount: audit?.meshCount || 0,
        triangles: audit?.triangleCount || 0
      };
    });
    console.log(`Model status: loaded=${modelStatus.modelLoaded}, meshes=${modelStatus.meshCount}, tris=${modelStatus.triangles}`);

    for (const vp of VIEWPORTS) {
      console.log(`\n>>> TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}, dsf: ${vp.dsf})`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400); // Allow resize event & recalculation

      const vpResults = {
        viewport: vp,
        intervals: {},
        collisionCount: 0,
      };

      for (const p of SCROLL_INTERVALS) {
        // Scroll to exact normalized progress
        await page.evaluate((progress) => {
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo({ top: maxScroll * progress, behavior: 'instant' });
        }, p);

        // Allow lerp and GSAP damp to settle
        await page.waitForTimeout(350);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

        // Empirical measurement: Pixel-perfect can bounding box via readPixels + DOM text bounding boxes
        const measurement = await page.evaluate((scrollP) => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return { error: 'No canvas element' };
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return { error: 'No WebGL context' };

          const w = canvas.width;
          const h = canvas.height;
          const dprX = w / canvas.clientWidth;
          const dprY = h / canvas.clientHeight;

          // Read canvas pixels
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let minX = w, maxX = -1, minY = h, maxY = -1;
          let nonZeroCount = 0;

          // Scan non-transparent pixels (alpha > 15)
          for (let y = 0; y < h; y += 3) {
            for (let x = 0; x < w; x += 3) {
              const idx = (y * w + x) * 4;
              if (pixels[idx + 3] > 15) {
                nonZeroCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          let canBox = null;
          if (nonZeroCount > 0) {
            canBox = {
              left: +(minX / dprX).toFixed(1),
              right: +(maxX / dprX).toFixed(1),
              top: +((h - maxY) / dprY).toFixed(1),
              bottom: +((h - minY) / dprY).toFixed(1),
              width: +((maxX - minX) / dprX).toFixed(1),
              height: +((maxY - minY) / dprY).toFixed(1),
              sampledPixels: nonZeroCount
            };
          }

          // Query all text elements in main
          const textElements = Array.from(document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main input'));
          const visibleTexts = [];
          const collisions = [];

          for (const el of textElements) {
            const rect = el.getBoundingClientRect();
            const textContent = (el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ');
            if (!textContent || rect.width <= 0 || rect.height <= 0) continue;

            // Element must be inside current viewport
            if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
              continue;
            }

            const item = {
              tag: el.tagName.toLowerCase(),
              text: textContent.slice(0, 35),
              rect: {
                left: +rect.left.toFixed(1),
                right: +rect.right.toFixed(1),
                top: +rect.top.toFixed(1),
                bottom: +rect.bottom.toFixed(1),
                width: +rect.width.toFixed(1),
                height: +rect.height.toFixed(1),
              }
            };
            visibleTexts.push(item);

            if (canBox) {
              const overlapLeft = Math.max(rect.left, canBox.left);
              const overlapRight = Math.min(rect.right, canBox.right);
              const overlapTop = Math.max(rect.top, canBox.top);
              const overlapBottom = Math.min(rect.bottom, canBox.bottom);

              if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
                const overlapW = overlapRight - overlapLeft;
                const overlapH = overlapBottom - overlapTop;
                const overlapArea = +(overlapW * overlapH).toFixed(1);

                collisions.push({
                  element: item,
                  overlapArea,
                  overlapBounds: {
                    left: +overlapLeft.toFixed(1),
                    right: +overlapRight.toFixed(1),
                    top: +overlapTop.toFixed(1),
                    bottom: +overlapBottom.toFixed(1),
                  }
                });
              }
            }
          }

          // Horizontal clearance for non-colliding
          let minClearance = null;
          if (canBox && collisions.length === 0 && visibleTexts.length > 0) {
            let smallestGap = Infinity;
            for (const vt of visibleTexts) {
              let gapX = 0;
              if (vt.rect.right <= canBox.left) gapX = canBox.left - vt.rect.right;
              else if (vt.rect.left >= canBox.right) gapX = vt.rect.left - canBox.right;

              let gapY = 0;
              if (vt.rect.bottom <= canBox.top) gapY = canBox.top - vt.rect.bottom;
              else if (vt.rect.top >= canBox.bottom) gapY = vt.rect.top - canBox.bottom;

              const gap = (gapX > 0 && gapY > 0) ? Math.sqrt(gapX * gapX + gapY * gapY) : Math.max(gapX, gapY);
              if (gap < smallestGap) smallestGap = gap;
            }
            minClearance = smallestGap === Infinity ? null : +smallestGap.toFixed(1);
          }

          const audit = window.__KINETIC_AUDIT__;
          return {
            scrollP,
            canBox,
            visibleTextCount: visibleTexts.length,
            collisionCount: collisions.length,
            collisions,
            minClearance,
            activeBeat: audit?.activeBeat,
            cameraPos: audit?.cameraPos ? audit.cameraPos.map(n => +n.toFixed(2)) : null,
          };
        }, p);

        vpResults.intervals[p.toFixed(2)] = measurement;
        if (measurement.collisionCount > 0) {
          vpResults.collisionCount += measurement.collisionCount;
          allMeasurements.summary.totalCollisions += measurement.collisionCount;
          console.log(`    [FAIL] p=${p.toFixed(2)}: ${measurement.collisionCount} collision(s)! Can: [T:${measurement.canBox?.top}, B:${measurement.canBox?.bottom}, L:${measurement.canBox?.left}, R:${measurement.canBox?.right}]`);
          for (const col of measurement.collisions) {
            console.log(`           - <${col.element.tag}> "${col.element.text}" at [T:${col.element.rect.top}, B:${col.element.rect.bottom}, L:${col.element.rect.left}, R:${col.element.rect.right}] (Overlap: ${col.overlapArea}px²)`);
          }
        } else {
          console.log(`    [PASS] p=${p.toFixed(2)}: 0 collisions. Can: [T:${measurement.canBox?.top}, B:${measurement.canBox?.bottom}, L:${measurement.canBox?.left}, R:${measurement.canBox?.right}], clearance: ${measurement.minClearance ?? 'N/A'}px`);
        }
      }

      allMeasurements.viewports[vp.id] = vpResults;
      if (vpResults.collisionCount > 0) {
        allMeasurements.summary.collidingViewports.push(vp.id);
      } else {
        allMeasurements.summary.cleanViewports.push(vp.id);
      }
    }

    // =========================================================================
    // PART 2: SCROLL REVERSIBILITY & HYSTERESIS STRESS TEST
    // =========================================================================
    console.log('\n========================================================================');
    console.log('  TESTING SCROLL REVERSIBILITY & ZERO HYSTERESIS (Desktop & Mobile)');
    console.log('========================================================================\n');

    for (const vpKey of ['desktop_1440x900', 'mobile_390x844']) {
      const vp = VIEWPORTS.find(v => v.id === vpKey);
      console.log(`>>> Reversibility Test on ${vp.name}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      const initialDocMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
      }));

      // Forward sweep: 0.00 -> 1.00
      const forwardStates = {};
      for (const p of SCROLL_INTERVALS) {
        await page.evaluate((prog) => {
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo({ top: maxScroll * prog, behavior: 'instant' });
        }, p);
        await page.waitForTimeout(350);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

        const st = await page.evaluate(() => {
          const audit = window.__KINETIC_AUDIT__;
          return {
            cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
            activeBeat: audit?.activeBeat,
            lighting: audit?.lighting ? { ...audit.lighting } : null,
            scrollProgress: audit?.scrollProgress,
            scrollY: window.scrollY,
          };
        });
        forwardStates[p.toFixed(2)] = st;
      }

      // Backward sweep: 1.00 -> 0.00
      const backwardStates = {};
      const reverseIntervals = [...SCROLL_INTERVALS].reverse();
      for (const p of reverseIntervals) {
        await page.evaluate((prog) => {
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo({ top: maxScroll * prog, behavior: 'instant' });
        }, p);
        await page.waitForTimeout(350);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

        const st = await page.evaluate(() => {
          const audit = window.__KINETIC_AUDIT__;
          return {
            cameraPos: audit?.cameraPos ? [...audit.cameraPos] : null,
            activeBeat: audit?.activeBeat,
            lighting: audit?.lighting ? { ...audit.lighting } : null,
            scrollProgress: audit?.scrollProgress,
            scrollY: window.scrollY,
          };
        });
        backwardStates[p.toFixed(2)] = st;
      }

      const postDocMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollY: window.scrollY,
      }));

      // Evaluate hysteresis delta
      const hysteresisDeltas = {};
      let maxDist = 0;
      let beatMismatches = 0;

      for (const p of SCROLL_INTERVALS) {
        const key = p.toFixed(2);
        const fwd = forwardStates[key];
        const rev = backwardStates[key];

        if (!fwd || !rev) {
          hysteresisDeltas[key] = { error: 'Missing state' };
          continue;
        }

        let cameraDelta = 0;
        if (fwd.cameraPos && rev.cameraPos) {
          const dx = fwd.cameraPos[0] - rev.cameraPos[0];
          const dy = fwd.cameraPos[1] - rev.cameraPos[1];
          const dz = fwd.cameraPos[2] - rev.cameraPos[2];
          cameraDelta = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        if (cameraDelta > maxDist) maxDist = cameraDelta;
        if (fwd.activeBeat !== rev.activeBeat) beatMismatches++;

        hysteresisDeltas[key] = {
          cameraDelta: +cameraDelta.toFixed(4),
          beatMatch: fwd.activeBeat === rev.activeBeat,
          fwdBeat: fwd.activeBeat,
          revBeat: rev.activeBeat,
          fwdCam: fwd.cameraPos,
          revCam: rev.cameraPos,
        };
      }

      // Check layout shift: scrollHeight change
      const layoutShift = Math.abs(postDocMetrics.scrollHeight - initialDocMetrics.scrollHeight);
      const isCleanReturn = postDocMetrics.scrollY <= 2;

      console.log(`    Max camera hysteresis: ${maxDist.toFixed(4)} units (Tolerance: < 0.05)`);
      console.log(`    Beat mismatches: ${beatMismatches}`);
      console.log(`    Layout shift (delta scrollHeight): ${layoutShift}px`);
      console.log(`    Clean return to top: ${isCleanReturn} (final scrollY: ${postDocMetrics.scrollY})`);

      if (maxDist > 0.05) allMeasurements.summary.hysteresisViolations++;
      if (layoutShift > 1) allMeasurements.summary.layoutShiftViolations++;
      if (!isCleanReturn) allMeasurements.summary.runawayStateViolations++;

      allMeasurements.reversibility[vp.id] = {
        maxCameraDelta: +maxDist.toFixed(4),
        beatMismatches,
        layoutShift,
        isCleanReturn,
        deltas: hysteresisDeltas,
        initialDocMetrics,
        postDocMetrics,
      };
    }

    // Save full empirical results JSON
    const reportJsonPath = path.resolve(PROJECT_ROOT, 'tests/adversarial_results.json');
    fs.writeFileSync(reportJsonPath, JSON.stringify(allMeasurements, null, 2));
    console.log(`\n✔ Full empirical data saved to: ${reportJsonPath}`);

    // Print Final Verdict
    console.log('\n========================================================================');
    console.log('  CHALLENGER 1 EMPIRICAL AUDIT SUMMARY');
    console.log('========================================================================');
    console.log(`Total Spatial Collisions Detected: ${allMeasurements.summary.totalCollisions}`);
    console.log(`Colliding Viewports:               ${allMeasurements.summary.collidingViewports.join(', ') || 'None'}`);
    console.log(`Clean Viewports:                   ${allMeasurements.summary.cleanViewports.join(', ') || 'None'}`);
    console.log(`Scroll Hysteresis Violations:      ${allMeasurements.summary.hysteresisViolations}`);
    console.log(`Layout Shift Violations:           ${allMeasurements.summary.layoutShiftViolations}`);
    console.log(`Runaway State Violations:          ${allMeasurements.summary.runawayStateViolations}`);

    const finalVerdict = allMeasurements.summary.totalCollisions > 0 ? 'REQUEST_CHANGES' : 'APPROVE';
    console.log(`\n>>> VERDICT: ${finalVerdict} <<<\n`);

    setTimeout(() => process.exit(allMeasurements.summary.totalCollisions > 0 ? 1 : 0), 100);

  } catch (err) {
    console.error(`Harness error: ${err.message}`);
    process.exit(1);
  }
}

runAdversarialHarness();
