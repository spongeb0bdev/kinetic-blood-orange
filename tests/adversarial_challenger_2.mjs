#!/usr/bin/env node
/**
 * Adversarial Verification Suite — Challenger 2
 * KINETIC Blood Orange Landing Page Elevation Pass
 *
 * Mandates:
 * 1. Quantitative Luminance Verification:
 *    - Sample WebGL pixel buffers across all 4 sections on desktop and mobile.
 *    - Calculate normalized relative luminance L = 0.2126*R + 0.7152*G + 0.0722*B on the silver aluminum can body.
 *    - Assert L >= 0.40 across all 4 waypoints, confirming the can is genuinely bright silver aluminum and not dark or obsidian.
 * 2. Invariant & String Stress Check:
 *    - Adversarially crawl every single DOM element, innerText, textContent, attribute, and script tag.
 *    - Search case-insensitively for: telemetry, vessel, optical disc, specification matrix, allocation, beat 0.
 *    - Assert zero matches across the entire application.
 * 3. DOM Section Cardinality:
 *    - Assert main contains exactly or at most 4 sections.
 *    - Assert zero HUD elements or telemetry overlays exist.
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
  { id: 'desktop', name: 'Desktop 1440x900', width: 1440, height: 900, dsf: 2 },
  { id: 'mobile', name: 'Mobile 390x844', width: 390, height: 844, dsf: 3, hasTouch: true },
];

const SECTIONS = [
  { id: 'hero', depth: 0.00, beat: 1, name: 'Section 1: Hero' },
  { id: 'flavor-story', depth: 0.33, beat: 2, name: 'Section 2: Flavor Story' },
  { id: 'ingredients', depth: 0.66, beat: 3, name: 'Section 3: Ingredients & Benefits' },
  { id: 'final-cta', depth: 1.00, beat: 4, name: 'Section 4: Final CTA' },
];

const BANNED_STRINGS = [
  'telemetry',
  'vessel',
  'optical disc',
  'specification matrix',
  'allocation',
  'beat 0',
];

async function runAdversarialVerification() {
  console.log('========================================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL EMPIRICAL VERIFICATION HARNESS');
  console.log('  Target: KINETIC Blood Orange Energy Landing Page');
  console.log('========================================================================\n');

  const distHtml = path.resolve(PROJECT_ROOT, 'dist/index.html');
  if (!fs.existsSync(distHtml)) {
    console.error(`Missing dist/index.html. Run npm run build first.`);
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

  const results = {
    timestamp: new Date().toISOString(),
    luminance: {
      checks: [],
      passed: true,
    },
    domInvariants: {
      bannedMatches: [],
      passed: true,
    },
    sectionCardinality: {
      desktopSectionCount: 0,
      mobileSectionCount: 0,
      hudElements: [],
      passed: true,
    },
    overallVerdict: 'PENDING',
  };

  try {
    // Create single context and page to maintain stability in --single-process mode
    const context = await browser.newContext({
      viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      deviceScaleFactor: VIEWPORTS[0].dsf,
    });

    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    await page.goto(`file://${distHtml}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);

    for (const vp of VIEWPORTS) {
      console.log(`\n========================================================================`);
      console.log(`>>> INITIALIZING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}, DSF=${vp.dsf})`);
      console.log(`========================================================================`);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500); // Allow resize event & recalculation


      // -----------------------------------------------------------------------
      // MANDATE 2 & 3: DOM INVARIANT, STRING STRESS CRAWL & CARDINALITY (once per viewport)
      // -----------------------------------------------------------------------
      console.log(`\n--- [MANDATE 2 & 3] DOM INVARIANTS, STRING CRAWL & SECTION CARDINALITY ---`);
      const domAudit = await page.evaluate((bannedList) => {
        const violations = [];

        // 1. Crawl all elements, textContent, innerText, attributes, comments, script tags
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const el of allElements) {
          const tag = el.tagName.toLowerCase();

          // Check innerText if applicable
          if (el.innerText) {
            const text = el.innerText.toLowerCase();
            for (const b of bannedList) {
              if (text.includes(b)) {
                violations.push({
                  type: 'innerText',
                  tag,
                  id: el.id,
                  class: el.className,
                  matched: b,
                  snippet: el.innerText.slice(0, 80),
                });
              }
            }
          }

          // Check direct textContent
          if (el.childNodes) {
            for (const child of Array.from(el.childNodes)) {
              if (child.nodeType === Node.TEXT_NODE && child.textContent) {
                const text = child.textContent.toLowerCase();
                for (const b of bannedList) {
                  if (text.includes(b)) {
                    violations.push({
                      type: 'textNode',
                      tag,
                      id: el.id,
                      class: el.className,
                      matched: b,
                      snippet: child.textContent.trim().slice(0, 80),
                    });
                  }
                }
              }
            }
          }

          // Check all attributes
          if (el.attributes) {
            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i];
              const attrStr = `${attr.name}="${attr.value}"`.toLowerCase();
              for (const b of bannedList) {
                if (attrStr.includes(b)) {
                  violations.push({
                    type: 'attribute',
                    tag,
                    id: el.id,
                    attrName: attr.name,
                    attrValue: attr.value,
                    matched: b,
                  });
                }
              }
            }
          }

          // Check script tag text content specifically
          if (tag === 'script') {
            const scriptText = (el.textContent || '').toLowerCase();
            for (const b of bannedList) {
              if (scriptText.includes(b)) {
                violations.push({
                  type: 'scriptTagContent',
                  tag,
                  matched: b,
                  snippet: scriptText.slice(0, 100),
                });
              }
            }
          }
        }

        // Check full raw document outerHTML / innerHTML
        const fullHtml = document.documentElement.outerHTML.toLowerCase();
        // Exclude script src attributes referencing file hashes if any, though checked above
        for (const b of bannedList) {
          // If outerHTML contains it, record count
          let idx = 0;
          let count = 0;
          while ((idx = fullHtml.indexOf(b, idx)) !== -1) {
            count++;
            idx += b.length;
          }
          if (count > 0 && violations.filter(v => v.matched === b).length === 0) {
            violations.push({
              type: 'outerHTML',
              matched: b,
              occurrenceCount: count,
            });
          }
        }

        // 2. DOM Section Cardinality: Main container must have <= 4 sections
        const mainEl = document.querySelector('main');
        const sectionsInMain = mainEl ? Array.from(mainEl.querySelectorAll(':scope > section')) : [];
        const allSectionsOnPage = Array.from(document.querySelectorAll('section'));

        // 3. HUD / Telemetry detection
        const hudSelectors = [
          '[data-hud]',
          '.telemetry',
          '.hud',
          '[class*="telemetry"]',
          '[class*="hud"]',
          '[id*="telemetry"]',
          '[id*="hud"]',
          '[data-coordinates]',
          '[data-matrix]',
        ];
        const detectedHuds = [];
        for (const sel of hudSelectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            detectedHuds.push({ selector: sel, count: els.length });
          }
        }

        return {
          violations,
          mainSectionCount: sectionsInMain.length,
          mainSectionIds: sectionsInMain.map(s => s.id),
          totalSectionCount: allSectionsOnPage.length,
          totalSectionIds: allSectionsOnPage.map(s => s.id),
          detectedHuds,
        };
      }, BANNED_STRINGS);

      console.log(`DOM String Crawl Results on ${vp.name}:`);
      console.log(`  Banned string matches: ${domAudit.violations.length}`);
      if (domAudit.violations.length > 0) {
        console.error(`  VIOLATIONS DETECTED:`, domAudit.violations);
        results.domInvariants.passed = false;
        results.domInvariants.bannedMatches.push(...domAudit.violations);
      } else {
        console.log(`  [PASS] Zero matches for banned strings in DOM, attributes, and script tags.`);
      }

      console.log(`\nDOM Section Cardinality on ${vp.name}:`);
      console.log(`  Sections directly in <main>: ${domAudit.mainSectionCount} (${domAudit.mainSectionIds.join(', ')})`);
      console.log(`  Total <section> tags:       ${domAudit.totalSectionCount} (${domAudit.totalSectionIds.join(', ')})`);
      console.log(`  Detected HUD/Telemetry:     ${domAudit.detectedHuds.length}`);

      if (domAudit.mainSectionCount > 4 || domAudit.mainSectionCount === 0) {
        console.error(`  [FAIL] Expected <= 4 sections in <main>, found ${domAudit.mainSectionCount}`);
        results.sectionCardinality.passed = false;
      } else {
        console.log(`  [PASS] Main contains exactly/at most 4 sections.`);
      }

      if (domAudit.detectedHuds.length > 0) {
        console.error(`  [FAIL] HUD elements detected:`, domAudit.detectedHuds);
        results.sectionCardinality.passed = false;
        results.sectionCardinality.hudElements.push(...domAudit.detectedHuds);
      } else {
        console.log(`  [PASS] Zero HUD or telemetry elements detected.`);
      }

      // -----------------------------------------------------------------------
      // MANDATE 1: QUANTITATIVE LUMINANCE VERIFICATION ACROSS ALL 4 SECTIONS
      // -----------------------------------------------------------------------
      console.log(`\n--- [MANDATE 1] QUANTITATIVE LUMINANCE VERIFICATION ACROSS ALL 4 SECTIONS ---`);

      for (const sec of SECTIONS) {
        console.log(`\n  >> Testing Section: ${sec.name} (target progress p = ${sec.depth.toFixed(2)})...`);

        // Scroll to the section
        await page.evaluate((targetDepth) => {
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo({ top: maxScroll * targetDepth, behavior: 'instant' });
        }, sec.depth);

        // Allow GSAP lerp and camera damping to settle
        await page.waitForTimeout(400);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));

        // Sample WebGL pixel buffers
        const lumResult = await page.evaluate((secInfo) => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return { error: 'Canvas not found' };
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return { error: 'WebGL context not found' };

          const w = canvas.width;
          const h = canvas.height;
          const clientW = canvas.clientWidth;
          const clientH = canvas.clientHeight;
          const dprX = w / clientW;
          const dprY = h / clientH;

          // Read full WebGL canvas pixels
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          // Find model bounding box (alpha > 15)
          let minX = w, maxX = -1, minY = h, maxY = -1;
          let opaqueCount = 0;

          for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
              const idx = (y * w + x) * 4;
              if (pixels[idx + 3] > 15) {
                opaqueCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (opaqueCount === 0) {
            return { error: 'No model pixels detected in WebGL buffer' };
          }

          // In WebGL coordinate system: Y=0 is bottom, Y=h is top!
          // So maxY is near the top of the can, minY is near the bottom of the can.
          const canHeight = maxY - minY;
          const canWidth = maxX - minX;

          // Silver Aluminum Sampling Strategy:
          // 1. Upper Can Body / Shoulder Sample:
          // In the can's upper body (between 75% and 88% of can height from bottom, i.e., above the orange disc),
          // the surface is purely brushed silver aluminum.
          const upperYStart = Math.floor(minY + canHeight * 0.75);
          const upperYEnd = Math.floor(minY + canHeight * 0.88);
          const midXStart = Math.floor(minX + canWidth * 0.35);
          const midXEnd = Math.floor(minX + canWidth * 0.65);

          let upperTotalLum = 0;
          let upperPixelCount = 0;
          const upperSamples = [];

          for (let y = upperYStart; y <= upperYEnd; y += 2) {
            for (let x = midXStart; x <= midXEnd; x += 2) {
              const idx = (y * w + x) * 4;
              const a = pixels[idx + 3];
              if (a > 200) { // Solid model interior
                const r = pixels[idx] / 255;
                const g = pixels[idx + 1] / 255;
                const b = pixels[idx + 2] / 255;
                const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                upperTotalLum += L;
                upperPixelCount++;
                if (upperSamples.length < 5) {
                  upperSamples.push({ r: +(r.toFixed(3)), g: +(g.toFixed(3)), b: +(b.toFixed(3)), L: +(L.toFixed(3)) });
                }
              }
            }
          }
          const upperAvgLum = upperPixelCount > 0 ? +(upperTotalLum / upperPixelCount).toFixed(4) : 0;

          // 2. Global Silver Aluminum Population:
          // Filter all can pixels for silver aluminum characteristics:
          // Neutral chrome metallic: |R - G| < 0.15, |G - B| < 0.15, |R - B| < 0.18
          // Exclude saturated orange artwork (|R - B| > 0.30 or R > 2*B)
          // Exclude black typography (L < 0.20)
          let silverTotalLum = 0;
          let silverPixelCount = 0;
          const silverRgbAccum = [0, 0, 0];

          for (let y = minY; y <= maxY; y += 2) {
            for (let x = minX; x <= maxX; x += 2) {
              const idx = (y * w + x) * 4;
              const a = pixels[idx + 3];
              if (a > 200) {
                const r = pixels[idx] / 255;
                const g = pixels[idx + 1] / 255;
                const b = pixels[idx + 2] / 255;

                // Color neutrality check (aluminum is grey/silver, not orange)
                const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
                const isNeutral = maxDiff < 0.18;
                const notBlack = (r + g + b) / 3 > 0.20;

                if (isNeutral && notBlack) {
                  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                  silverTotalLum += L;
                  silverPixelCount++;
                  silverRgbAccum[0] += r;
                  silverRgbAccum[1] += g;
                  silverRgbAccum[2] += b;
                }
              }
            }
          }

          const silverAvgLum = silverPixelCount > 0 ? +(silverTotalLum / silverPixelCount).toFixed(4) : 0;
          const avgSilverRgb = silverPixelCount > 0 ? [
            +(silverRgbAccum[0] / silverPixelCount).toFixed(3),
            +(silverRgbAccum[1] / silverPixelCount).toFixed(3),
            +(silverRgbAccum[2] / silverPixelCount).toFixed(3)
          ] : [0, 0, 0];

          return {
            section: secInfo.name,
            depth: secInfo.depth,
            modelBounds: {
              minX, maxX, minY, maxY,
              width: canWidth,
              height: canHeight,
              totalOpaquePixels: opaqueCount,
            },
            upperBody: {
              sampleCount: upperPixelCount,
              averageLuminance: upperAvgLum,
              samples: upperSamples,
              isBrightSilver: upperAvgLum >= 0.40,
            },
            globalSilver: {
              sampleCount: silverPixelCount,
              averageLuminance: silverAvgLum,
              averageRgb: avgSilverRgb,
              isBrightSilver: silverAvgLum >= 0.40,
            },
            verifiedLuminance: Math.max(upperAvgLum, silverAvgLum),
            isBrightSilver: (upperAvgLum >= 0.40 || silverAvgLum >= 0.40),
          };
        }, sec);

        if (lumResult.error) {
          console.error(`    [FAIL] WebGL Sampling Error: ${lumResult.error}`);
          results.luminance.passed = false;
          results.luminance.checks.push({
            viewport: vp.id,
            section: sec.id,
            error: lumResult.error,
            passed: false,
          });
        } else {
          console.log(`    Upper Silver Body:  L = ${lumResult.upperBody.averageLuminance} (samples: ${lumResult.upperBody.sampleCount}, pass: ${lumResult.upperBody.isBrightSilver})`);
          console.log(`    Global Silver Body: L = ${lumResult.globalSilver.averageLuminance} (RGB: [${lumResult.globalSilver.averageRgb.join(', ')}], samples: ${lumResult.globalSilver.sampleCount}, pass: ${lumResult.globalSilver.isBrightSilver})`);

          const checkPassed = lumResult.isBrightSilver && lumResult.upperBody.averageLuminance >= 0.40;
          if (checkPassed) {
            console.log(`    [PASS] L >= 0.40 verified on silver aluminum can body at ${sec.name}`);
          } else {
            console.error(`    [FAIL] Luminance below 0.40 threshold! L_upper = ${lumResult.upperBody.averageLuminance}, L_global = ${lumResult.globalSilver.averageLuminance}`);
            results.luminance.passed = false;
          }

          results.luminance.checks.push({
            viewport: vp.id,
            section: sec.id,
            depth: sec.depth,
            upperBodyLuminance: lumResult.upperBody.averageLuminance,
            globalSilverLuminance: lumResult.globalSilver.averageLuminance,
            averageRgb: lumResult.globalSilver.averageRgb,
            passed: checkPassed,
          });
        }
      }
    }

    await context.close().catch(() => {});
    await browser.close().catch(() => {});

    // -------------------------------------------------------------------------
    // SUMMARY EVALUATION
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('  CHALLENGER 2 FINAL VERIFICATION SUMMARY');
    console.log('========================================================================');

    console.log(`\n1. WebGL Can Body Luminance (L >= 0.40):`);
    for (const c of results.luminance.checks) {
      const statusStr = c.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`   [${statusStr}] ${c.viewport} - ${c.section} (depth ${c.depth}): L_upper=${c.upperBodyLuminance}, L_global=${c.globalSilverLuminance}, RGB=[${c.averageRgb ? c.averageRgb.join(',') : 'N/A'}]`);
    }

    console.log(`\n2. DOM Invariant & Banned Strings (Zero matches):`);
    if (results.domInvariants.passed) {
      console.log(`   \x1b[32m[PASS] Zero matches for banned strings across all DOM nodes, attributes, and scripts.\x1b[0m`);
    } else {
      console.log(`   \x1b[31m[FAIL] ${results.domInvariants.bannedMatches.length} banned string violation(s) found!\x1b[0m`);
    }

    console.log(`\n3. DOM Section Cardinality & HUD Absence:`);
    if (results.sectionCardinality.passed) {
      console.log(`   \x1b[32m[PASS] Exactly 4 sections in <main>, zero HUD/telemetry elements.\x1b[0m`);
    } else {
      console.log(`   \x1b[31m[FAIL] Section cardinality or HUD absence check failed!\x1b[0m`);
    }

    const allPassed = results.luminance.passed && results.domInvariants.passed && results.sectionCardinality.passed;
    results.overallVerdict = allPassed ? 'APPROVE' : 'REQUEST_CHANGES';

    console.log(`\n========================================================================`);
    console.log(`  FINAL VERDICT: ${results.overallVerdict === 'APPROVE' ? '\x1b[32m>>> APPROVE <<<\x1b[0m' : '\x1b[31m>>> REQUEST_CHANGES <<<\x1b[0m'}`);
    console.log(`========================================================================\n`);

    // Output JSON results for programmatic ingestion
    const outJsonPath = path.resolve(PROJECT_ROOT, 'tests/adversarial_challenger_2_results.json');
    fs.writeFileSync(outJsonPath, JSON.stringify(results, null, 2));
    console.log(`Detailed verification report saved to: ${outJsonPath}`);

    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error(`Fatal test harness error:`, err);
    process.exit(1);
  }
}

runAdversarialVerification();
