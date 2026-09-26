/**
 * Standalone ESM Test Framework for KINETIC Landing Page E2E Verification
 * Supports describe, test, it, expect, lifecycle hooks, tier filtering, and auto-run.
 */

export class ExpectationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExpectationError';
  }
}

export class Expectation {
  constructor(actual) {
    this.actual = actual;
    this.isNot = false;
  }

  get not() {
    this.isNot = !this.isNot;
    return this;
  }

  _check(pass, message) {
    const finalPass = this.isNot ? !pass : pass;
    if (!finalPass) {
      throw new ExpectationError(message);
    }
  }

  toBe(expected) {
    const pass = Object.is(this.actual, expected);
    this._check(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`
    );
  }

  toEqual(expected) {
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    const pass = actualStr === expectedStr;
    this._check(
      pass,
      `Expected ${actualStr} ${this.isNot ? 'not to equal' : 'to equal'} ${expectedStr}`
    );
  }

  toBeCloseTo(expected, delta = 0.05) {
    const diff = Math.abs(this.actual - expected);
    const pass = diff <= delta;
    this._check(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be close to' : 'to be close to'} ${expected} (diff: ${diff}, maxDelta: ${delta})`
    );
  }

  toBeGreaterThan(expected) {
    const pass = this.actual > expected;
    this._check(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be >' : 'to be >'} ${expected}`
    );
  }

  toBeGreaterThanOrEqual(expected) {
    const pass = this.actual >= expected;
    this._check(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be >=' : 'to be >='} ${expected}`
    );
  }

  toBeLessThan(expected) {
    const pass = this.actual < expected;
    this._check(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be <' : 'to be <'} ${expected}`
    );
  }

  toBeLessThanOrEqual(expected) {
    const pass = this.actual <= expected;
    this._check(
      pass,
      `Expected ${this.actual} ${this.isNot ? 'not to be <=' : 'to be <='} ${expected}`
    );
  }

  toBeTruthy() {
    const pass = Boolean(this.actual);
    this._check(pass, `Expected ${this.actual} ${this.isNot ? 'to be falsy' : 'to be truthy'}`);
  }

  toBeFalsy() {
    const pass = !Boolean(this.actual);
    this._check(pass, `Expected ${this.actual} ${this.isNot ? 'to be truthy' : 'to be falsy'}`);
  }

  toBeDefined() {
    const pass = this.actual !== undefined;
    this._check(pass, `Expected ${this.actual} ${this.isNot ? 'to be undefined' : 'to be defined'}`);
  }

  toBeNull() {
    const pass = this.actual === null;
    this._check(pass, `Expected ${this.actual} ${this.isNot ? 'not to be null' : 'to be null'}`);
  }

  toContain(expected) {
    let pass = false;
    if (typeof this.actual === 'string' || Array.isArray(this.actual)) {
      pass = this.actual.includes(expected);
    } else if (this.actual && typeof this.actual === 'object') {
      pass = expected in this.actual;
    }
    this._check(
      pass,
      `Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'not to contain' : 'to contain'} ${JSON.stringify(expected)}`
    );
  }

  toMatch(regex) {
    const pass = regex.test(String(this.actual));
    this._check(
      pass,
      `Expected "${this.actual}" ${this.isNot ? 'not to match' : 'to match'} ${regex}`
    );
  }

  toThrow(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new ExpectationError('Expected actual value to be a function for toThrow assertion');
    }
    let threw = false;
    let error;
    try {
      this.actual();
    } catch (e) {
      threw = true;
      error = e;
    }
    if (this.isNot) {
      if (threw) throw new ExpectationError(`Expected function not to throw, but it threw: ${error?.message}`);
    } else {
      if (!threw) throw new ExpectationError('Expected function to throw, but it did not throw');
      if (expectedError) {
        if (typeof expectedError === 'string') {
          if (!error.message.includes(expectedError)) {
            throw new ExpectationError(`Expected error message to include "${expectedError}", got "${error.message}"`);
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(error.message)) {
            throw new ExpectationError(`Expected error message to match ${expectedError}, got "${error.message}"`);
          }
        }
      }
    }
  }
}

export function expect(actual) {
  return new Expectation(actual);
}

class TestSuiteRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.globalBeforeAllHooks = [];
    this.globalAfterAllHooks = [];
    this.globalBeforeEachHooks = [];
    this.globalAfterEachHooks = [];
  }

  describe(name, fn, meta = {}) {
    const suite = {
      name,
      meta,
      tests: [],
      beforeAllHooks: [],
      afterAllHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
    };
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    this.suites.push(suite);
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn, meta = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {});
    }
    this.currentSuite.tests.push({
      name,
      fn,
      meta: { ...this.currentSuite.meta, ...meta },
    });
  }

  skip(name, fn, meta = {}) {
    this.test(name, fn, { ...meta, skip: true });
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAllHooks.push(fn);
    } else {
      this.globalBeforeAllHooks.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAllHooks.push(fn);
    } else {
      this.globalAfterAllHooks.push(fn);
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachHooks.push(fn);
    } else {
      this.globalBeforeEachHooks.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachHooks.push(fn);
    } else {
      this.globalAfterEachHooks.push(fn);
    }
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.globalBeforeAllHooks = [];
    this.globalAfterAllHooks = [];
    this.globalBeforeEachHooks = [];
    this.globalAfterEachHooks = [];
  }

  async run(options = {}) {
    const tierFilter = options.tier || 'all';
    const reporter = options.reporter || 'spec';
    const bail = options.bail || false;

    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      duration: 0,
      suites: [],
    };

    for (const hook of this.globalBeforeAllHooks) {
      await hook();
    }

    for (const suite of this.suites) {
      const suiteResult = {
        name: suite.name,
        meta: suite.meta,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
      };

      const activeTests = suite.tests.filter((t) => {
        const tier = t.meta.tier || suite.meta.tier;
        if (tierFilter !== 'all' && tier && String(tier) !== String(tierFilter)) return false;
        return true;
      });

      if (activeTests.length === 0) continue;

      if (reporter === 'spec') {
        console.log(`\n  \x1b[1m\x1b[38;2;231;66;2m[KINETIC]\x1b[0m \x1b[1m\x1b[36m${suite.name}\x1b[0m`);
      }

      for (const hook of suite.beforeAllHooks) {
        await hook();
      }

      for (const t of activeTests) {
        results.total++;
        const testResult = {
          name: t.name,
          meta: t.meta,
          status: 'passed',
          error: null,
          duration: 0,
        };

        if (t.meta.skip) {
          testResult.status = 'skipped';
          results.skipped++;
          suiteResult.skipped++;
          suiteResult.tests.push(testResult);
          if (reporter === 'spec') {
            console.log(`    \x1b[33m○\x1b[0m \x1b[90m${t.name} (SKIPPED)\x1b[0m`);
          }
          continue;
        }

        const tStart = Date.now();

        try {
          for (const hook of suite.beforeEachHooks) {
            await hook();
          }

          await t.fn();

          for (const hook of suite.afterEachHooks) {
            await hook();
          }

          testResult.status = 'passed';
          testResult.duration = Date.now() - tStart;
          suiteResult.passed++;
          results.passed++;

          if (reporter === 'spec') {
            console.log(`    \x1b[32m✓\x1b[0m \x1b[37m${t.name}\x1b[0m \x1b[90m(${testResult.duration}ms)\x1b[0m`);
          }
        } catch (err) {
          testResult.status = 'failed';
          testResult.error = err;
          testResult.duration = Date.now() - tStart;
          suiteResult.failed++;
          results.failed++;

          if (reporter === 'spec') {
            console.log(`    \x1b[31m✗\x1b[0m \x1b[31m${t.name}\x1b[0m`);
            console.log(`      \x1b[90m${err.message}\x1b[0m`);
          }

          if (bail) break;
        }

        suiteResult.tests.push(testResult);
      }

      for (const hook of suite.afterAllHooks) {
        await hook();
      }

      results.suites.push(suiteResult);
      if (bail && results.failed > 0) break;
    }

    for (const hook of this.globalAfterAllHooks) {
      await hook();
    }

    results.duration = Date.now() - results.startTime;

    if (reporter === 'spec' || reporter === 'summary') {
      console.log('\n============================================================');
      console.log('  KINETIC BLOOD ORANGE E2E VERIFICATION SUITE SUMMARY');
      console.log('============================================================');
      console.log(`  \x1b[1mTotal Tests:\x1b[0m  ${results.total}`);
      console.log(`  \x1b[32mPassed:\x1b[0m       ${results.passed}`);
      console.log(`  \x1b[31mFailed:\x1b[0m       ${results.failed}`);
      console.log(`  \x1b[33mSkipped:\x1b[0m      ${results.skipped}`);
      console.log(`  \x1b[90mDuration:\x1b[0m     ${results.duration}ms`);
      console.log('============================================================\n');
    }

    return results;
  }
}

export const registry = new TestSuiteRegistry();
export const describe = registry.describe.bind(registry);
export const test = registry.test.bind(registry);
export const it = test;
export const skip = registry.skip.bind(registry);
export const beforeAll = registry.beforeAll.bind(registry);
export const afterAll = registry.afterAll.bind(registry);
export const beforeEach = registry.beforeEach.bind(registry);
export const afterEach = registry.afterEach.bind(registry);
