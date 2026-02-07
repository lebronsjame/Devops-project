const { test: base, expect } = require("@playwright/test");
const { saveCoverage } = require("./coverage-helper");

const test = base;

test.afterEach(async ({ page }, testInfo) => {
  try {
    await saveCoverage(page, testInfo);
  } catch {
    // Never fail a test due to coverage collection.
  }
});

module.exports = { test, expect };
