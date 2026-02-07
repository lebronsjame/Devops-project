const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

const SOURCE_DIR = "public"; // change if your frontend folder name differs
const OUT_DIR = "public-coverage";

rmDir(OUT_DIR);
copyDir(SOURCE_DIR, OUT_DIR);

// Instrument only frontend JS (adjust if your JS folder differs)
const srcJs = path.join(SOURCE_DIR, "js");
const outJs = path.join(OUT_DIR, "js");

if (!fs.existsSync(srcJs)) {
  console.error(`Expected ${srcJs} but it doesn't exist. Update paths in instrument-frontend.js`);
  process.exit(1);
}

execSync(`npx nyc instrument "${srcJs}" "${outJs}"`, { stdio: "inherit" });

console.log(`Instrumented frontend written to ${OUT_DIR}`);
