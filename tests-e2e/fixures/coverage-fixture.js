import { test, expect } from "../tests-e2e/fixtures/coverage-fixture.js";
import fs from "fs";
import path from "path";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safe(name) {
  return String(name).replace(/[^a-z0-9-_]/gi, "_");
}

export const test = base.extend({});

test.afterEach(async ({ page }, testInfo) => {
  // Grab Istanbul coverage object written by instrumented JS
  const coverage = await page.evaluate(() => window.__coverage__ || null);
  if (!coverage) return;

  const outDir = path.join(process.cwd(), ".nyc_output");
  ensureDir(outDir);

  const filename = `${Date.now()}_${safe(testInfo.title)}.json`;
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(coverage), "utf8");
});

export { expect };
