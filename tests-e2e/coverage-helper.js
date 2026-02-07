const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeFileName(name) {
  return name.replace(/[^a-z0-9-_]/gi, "_");
}

async function saveCoverage(page, testInfo) {
  if (!page) return;
  if (typeof page.isClosed === "function" && page.isClosed()) return;

  let coverage = null;
  try {
    // Grab browser coverage object (Istanbul)
    coverage = await page.evaluate(() => window.__coverage__ || null);
  } catch {
    // Page/context can be closed if the test is interrupted or crashes.
    return;
  }

  if (!coverage) return; // if page never loaded instrumented JS

  const outDir = path.join(process.cwd(), ".nyc_output");
  ensureDir(outDir);

  const file = path.join(
    outDir,
    `${Date.now()}_${safeFileName(testInfo?.title || "unknown")}.json`
  );

  fs.writeFileSync(file, JSON.stringify(coverage), "utf8");
}

module.exports = { saveCoverage };
