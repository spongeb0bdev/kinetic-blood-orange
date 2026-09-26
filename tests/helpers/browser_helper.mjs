import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

export const CHROMIUM_EXEC_PATH = '/Users/travis/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

export const CHROMIUM_ARGS = [
  '--single-process',
  '--no-sandbox',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
  '--disable-dev-shm-usage',
  '--allow-file-access-from-files',
];

export const PREVIEW_PORT = 4173;
export const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

export const VIEWPORT_DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
export const VIEWPORT_MOBILE = { width: 390, height: 844, deviceScaleFactor: 3, hasTouch: true };
export const VIEWPORT_ULTRAWIDE = { width: 2560, height: 1440, deviceScaleFactor: 1 };
export const VIEWPORT_NARROW_MOBILE = { width: 320, height: 568, deviceScaleFactor: 2, hasTouch: true };

export class BrowserHelper {
  constructor(options = {}) {
    this.port = options.port || PREVIEW_PORT;
    this.baseUrl = `http://127.0.0.1:${this.port}`;
    this.projectRoot = options.projectRoot
      ? path.resolve(options.projectRoot)
      : (process.cwd().includes('kinetic_landing_page')
          ? process.cwd()
          : path.resolve(process.cwd(), 'teamwork_projects/kinetic_landing_page'));
    this.serverProcess = null;
    this.ownsServer = false;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isSandboxedLoopback = false;
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.pageErrors = [];
    this.trackedResponses = [];
  }

  async isPortOpen(port = this.port) {
    const httpCheck = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', (err) => {
        if (err.code === 'EPERM' || err.message?.includes('EPERM')) {
          this.isSandboxedLoopback = true;
          resolve(null);
        } else {
          resolve(false);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (httpCheck !== null) {
      return httpCheck;
    }

    // Sandboxed environment fallback: check if port is bound via EADDRINUSE probe
    return new Promise((resolve) => {
      const probe = http.createServer();
      probe.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      probe.once('listening', () => {
        probe.close(() => resolve(false));
      });
      probe.listen(port, '127.0.0.1');
    });
  }

  async ensureServer(timeoutMs = 15000) {
    const alreadyRunning = await this.isPortOpen();
    if (alreadyRunning) {
      return true;
    }

    this.ownsServer = true;
    const nodeBin = fs.existsSync('/usr/local/bin/node') ? '/usr/local/bin/node' : process.execPath;
    this.serverProcess = spawn(nodeBin, [path.join(this.projectRoot, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(this.port), '--host', '127.0.0.1'], {
      cwd: this.projectRoot,
      stdio: 'pipe',
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}` }
    });

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isPortOpen()) {
        return true;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    throw new Error(`Timeout waiting for preview server on ${this.baseUrl}`);
  }

  async launchBrowser() {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.browser = await chromium.launch({
      executablePath: CHROMIUM_EXEC_PATH,
      headless: true,
      args: CHROMIUM_ARGS,
    });

    return this.browser;
  }

  _attachPageListeners(page) {
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.pageErrors = [];
    this.trackedResponses = [];

    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text() };
      this.consoleLogs.push(entry);
      if (msg.type() === 'error') {
        this.consoleErrors.push(entry);
      } else if (msg.type() === 'warning') {
        this.consoleWarnings.push(entry);
      }
    });

    page.on('pageerror', (err) => {
      this.pageErrors.push(err.message || String(err));
    });

    page.on('response', (res) => {
      this.trackedResponses.push({
        url: res.url(),
        status: res.status(),
        size: parseInt(res.headers()['content-length'] || '0', 10),
      });
    });
  }

  async createPage(viewport = VIEWPORT_DESKTOP) {
    await this.launchBrowser();

    this.context = await this.browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor || 1,
      hasTouch: viewport.hasTouch || false,
    });

    this.page = await this.context.newPage();
    this._attachPageListeners(this.page);
    return this.page;
  }

  async goto(targetPath = '/', options = {}) {
    const fileUrl = `file://${path.resolve(this.projectRoot, 'dist/index.html')}`;
    const targetUrl = (this.isSandboxedLoopback || targetPath.startsWith('file:'))
      ? fileUrl
      : (targetPath.startsWith('http') ? targetPath : `${this.baseUrl}${targetPath}`);

    if (!this.page || this.page.isClosed()) {
      await this.createPage();
    }

    try {
      await this.page.goto(targetUrl, {
        waitUntil: options.waitUntil || 'load',
        timeout: Math.min(options.timeout || 15000, 3000),
      });
    } catch (err) {
      this.isSandboxedLoopback = true;
      if (!this.page.isClosed()) {
        await this.page.close().catch(() => {});
      }
      this.page = await this.context.newPage();
      this._attachPageListeners(this.page);
      await this.page.goto(fileUrl, {
        waitUntil: options.waitUntil || 'load',
        timeout: options.timeout || 15000,
      });
    }

    await this.page.waitForSelector('canvas', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
    return this.page;
  }

  async checkHorizontalOverflow() {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate(() => {
      const doc = document.documentElement;
      const scrollWidth = doc.scrollWidth;
      const clientWidth = doc.clientWidth;
      const offenders = [];

      for (const el of document.querySelectorAll('*')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientWidth + 1) {
          offenders.push({
            tagName: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
            right: Math.round(rect.right),
            clientWidth,
          });
        }
      }

      return {
        hasZeroOverflow: scrollWidth <= clientWidth && offenders.length === 0,
        scrollWidth,
        clientWidth,
        offenders: offenders.slice(0, 10),
      };
    });
  }

  async sampleCanvasCenterPixel() {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { hasCanvas: false };

      const gl2 = canvas.getContext('webgl2');
      const gl = gl2 || canvas.getContext('webgl');
      if (!gl) return { hasCanvas: true, hasGL: false };

      const isMobile = canvas.clientHeight > canvas.clientWidth;
      const sampleY = isMobile
        ? Math.floor(canvas.height * 0.75) // WebGL origin is bottom-left, top 25% corresponds to Y = 0.75 * height
        : Math.floor(canvas.height * 0.5);
      const sampleX = Math.floor(canvas.width / 2);

      const pixel = new Uint8Array(4);
      gl.readPixels(
        sampleX,
        sampleY,
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
      );

      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      const a = pixel[3];
      let isNonBlank = a > 0 || r > 0 || g > 0 || b > 0;

      if (!isNonBlank) {
        const patch = new Uint8Array(7 * 7 * 4);
        gl.readPixels(
          Math.max(0, sampleX - 3),
          Math.max(0, sampleY - 3),
          7,
          7,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          patch
        );
        for (let i = 3; i < patch.length; i += 4) {
          if (patch[i] > 15) {
            isNonBlank = true;
            break;
          }
        }
      }

      return {
        hasCanvas: true,
        hasGL: true,
        isWebGL2: Boolean(gl2),
        pixel: [r, g, b, a],
        isNonBlank,
        width: canvas.width,
        height: canvas.height,
      };
    });
  }

  async scrollToProgress(p) {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.evaluate((depth) => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maxScroll * depth, behavior: 'instant' });
    }, Math.max(0, Math.min(1, p)));

    // Settle for RAF and lerp
    await this.page.waitForTimeout(250);
    await this.page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
  }

  async getAuditBridge() {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate(() => {
      const bridge = window.__KINETIC_AUDIT__;
      const canvas = document.querySelector('canvas');
      return {
        bridge: bridge || null,
        canvasData: canvas ? {
          kineticReady: canvas.getAttribute('data-kinetic-ready'),
          meshCount: canvas.getAttribute('data-mesh-count'),
          triangles: canvas.getAttribute('data-triangles'),
          floorHidden: canvas.getAttribute('data-floor-hidden'),
        } : null,
      };
    });
  }

  /**
   * Genuine Dynamic 3D Can Bounding Box Profiler
   * Samples live WebGL canvas pixels (alpha > 15) to compute exact client-space bounding box.
   */
  async getCanBoundingBox() {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas element found' };
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'No WebGL context' };

      const w = canvas.width;
      const h = canvas.height;
      const rect = canvas.getBoundingClientRect();
      const dprX = w / rect.width;
      const dprY = h / rect.height;

      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let minX = w, maxX = -1, minY = h, maxY = -1;
      let nonZeroCount = 0;

      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
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

      if (nonZeroCount === 0) {
        return { isEmpty: true, sampledPixels: 0, error: 'Canvas is blank' };
      }

      const left = +(rect.left + (minX / dprX)).toFixed(1);
      const right = +(rect.left + (maxX / dprX)).toFixed(1);
      const top = +(rect.top + ((h - maxY) / dprY)).toFixed(1);
      const bottom = +(rect.top + ((h - minY) / dprY)).toFixed(1);

      return {
        isEmpty: false,
        left,
        right,
        top,
        bottom,
        width: +(right - left).toFixed(1),
        height: +(bottom - top).toFixed(1),
        sampledPixels: nonZeroCount * 4,
      };
    });
  }

  /**
   * Genuine Dynamic Spatial Clearance & 2D AABB Overlap Audit
   * Evaluates real can bounding box against all visible DOM typography and interactive controls.
   */
  async auditSpatialClearance(options = {}) {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate((opts) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas' };
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'No WebGL' };

      const w = canvas.width;
      const h = canvas.height;
      const rect = canvas.getBoundingClientRect();
      const dprX = w / rect.width;
      const dprY = h / rect.height;

      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let minX = w, maxX = -1, minY = h, maxY = -1;
      let count = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const idx = (y * w + x) * 4;
          if (pixels[idx + 3] > 15) {
            count++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (count === 0) {
        return { hasCollision: true, error: 'Canvas rendered 0 model pixels', collisions: [] };
      }

      const canBox = {
        left: +(rect.left + (minX / dprX)).toFixed(1),
        right: +(rect.left + (maxX / dprX)).toFixed(1),
        top: +(rect.top + ((h - maxY) / dprY)).toFixed(1),
        bottom: +(rect.top + ((h - minY) / dprY)).toFixed(1),
        width: +((maxX - minX) / dprX).toFixed(1),
        height: +((maxY - minY) / dprY).toFixed(1),
        sampledPixels: count * 4,
      };

      const selector = opts.selector || 'main h1, main h2, main h3, main p, main a, main button, main input, [data-card]';
      const elements = Array.from(document.querySelectorAll(selector));
      const visibleElements = [];
      const collisions = [];

      for (const el of elements) {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.05) continue;
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) continue;

        const text = (el.innerText || el.getAttribute('placeholder') || el.getAttribute('value') || '').trim().replace(/\s+/g, ' ');
        if (!text) continue;

        const item = {
          tag: el.tagName.toLowerCase(),
          text: text.slice(0, 40),
          rect: {
            left: +r.left.toFixed(1),
            right: +r.right.toFixed(1),
            top: +r.top.toFixed(1),
            bottom: +r.bottom.toFixed(1),
            width: +r.width.toFixed(1),
            height: +r.height.toFixed(1),
          }
        };
        visibleElements.push(item);

        const oLeft = Math.max(r.left, canBox.left);
        const oRight = Math.min(r.right, canBox.right);
        const oTop = Math.max(r.top, canBox.top);
        const oBottom = Math.min(r.bottom, canBox.bottom);

        if (oRight > oLeft && oBottom > oTop) {
          const overlapArea = +((oRight - oLeft) * (oBottom - oTop)).toFixed(1);
          collisions.push({
            element: item,
            overlapArea,
            overlapBounds: {
              left: +oLeft.toFixed(1),
              right: +oRight.toFixed(1),
              top: +oTop.toFixed(1),
              bottom: +oBottom.toFixed(1),
            }
          });
        }
      }

      let minClearance = null;
      if (collisions.length === 0 && visibleElements.length > 0) {
        let smallest = Infinity;
        for (const v of visibleElements) {
          let gx = 0;
          if (v.rect.right <= canBox.left) gx = canBox.left - v.rect.right;
          else if (v.rect.left >= canBox.right) gx = v.rect.left - canBox.right;

          let gy = 0;
          if (v.rect.bottom <= canBox.top) gy = canBox.top - v.rect.bottom;
          else if (v.rect.top >= canBox.bottom) gy = v.rect.top - canBox.bottom;

          const dist = (gx > 0 && gy > 0) ? Math.sqrt(gx * gx + gy * gy) : Math.max(gx, gy);
          if (dist < smallest) smallest = dist;
        }
        minClearance = smallest === Infinity ? null : +smallest.toFixed(1);
      }

      return {
        hasCollision: collisions.length > 0,
        collisionCount: collisions.length,
        collisions,
        minClearance,
        canBox,
        visibleCount: visibleElements.length,
      };
    }, options);
  }

  async close() {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await Promise.race([
        this.browser.close(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]).catch(() => {});
      this.browser = null;
    }
    if (this.ownsServer && this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      this.ownsServer = false;
    }
  }
}
