import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";

function loadPlaywright() {
  const candidates = [
    join(tmpdir(), "mockup-shots", "package.json"),
    join(homedir(), "mockup-shots", "package.json"),
    join(process.cwd(), "package.json"),
  ];
  for (const pkg of candidates) {
    try {
      const require = createRequire(pkg);
      return require("playwright");
    } catch (_) {}
  }
  throw new Error("playwright not found (install in TEMP/mockup-shots or locally)");
}
const { chromium } = loadPlaywright();

const root = process.cwd();
const releaseHtml = [
  "index.html",
  "operations-director.html",
  "case-fasol.html",
  "case-euroopt.html",
  "privacy.html",
  "consent.html",
  "404.html",
];
const releaseExtras = ["api/lead.php", "assets/js/lead-form.js", "assets/css/site.css", "sitemap.xml"];

const errors = [];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === "_preview") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function rel(p) {
  return p.replace(root + "\\", "").replace(root + "/", "").replace(/\\/g, "/");
}

// 1) Forbidden strings in release files
const checkFiles = [...releaseHtml, ...releaseExtras].map((f) => join(root, f));
for (const file of checkFiles) {
  if (!existsSync(file)) {
    errors.push(`missing file: ${rel(file)}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  const r = rel(file);
  if (text.includes("[УТОЧНИТЬ")) errors.push(`${r}: found [УТОЧНИТЬ`);
  if (text.includes("[ИНН")) errors.push(`${r}: found [ИНН`);
  if (text.includes("[дата")) errors.push(`${r}: found [дата`);
  if (text.includes("a50petr@yandex.ru")) errors.push(`${r}: found a50petr@yandex.ru`);
  if (text.includes("_preview")) errors.push(`${r}: found _preview`);
  if (text.includes("Макет")) errors.push(`${r}: found Макет`);
  if (text.includes("noindex")) errors.push(`${r}: found noindex`);
  // index.html in hrefs
  const badIndex = [...text.matchAll(/href\s*=\s*["']([^"']*index\.html[^"']*)["']/gi)];
  for (const m of badIndex) errors.push(`${r}: href uses index.html → ${m[1]}`);
}

// Extra: any root html beyond allowed
for (const name of readdirSync(root)) {
  if (extname(name) === ".html" && !releaseHtml.includes(name)) {
    errors.push(`unexpected root html: ${name}`);
  }
}

// 2) Internal links resolve to existing files
for (const page of releaseHtml) {
  const text = readFileSync(join(root, page), "utf8");
  const refs = [
    ...[...text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...text.matchAll(/src\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
  ];
  for (const href of refs) {
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) continue;
    if (!href.startsWith("/")) {
      errors.push(`${page}: non-absolute internal link ${href}`);
      continue;
    }
    const pathOnly = href.split("#")[0].split("?")[0];
    if (!pathOnly || pathOnly === "/") continue;
    const fsPath = join(root, pathOnly.replace(/^\//, ""));
    if (!existsSync(fsPath)) errors.push(`${page}: missing target ${href}`);
  }
}

// 3) scrollWidth check
const base = "http://127.0.0.1:8765";
let browser;
try {
  browser = await chromium.launch();
  for (const pagePath of ["/", "/operations-director.html", "/case-fasol.html", "/case-euroopt.html", "/privacy.html"]) {
    for (const w of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
      await page.addInitScript(() => {
        try {
          localStorage.setItem("pa_analytics_consent_v1", "denied");
        } catch (_) {}
      });
      await page.goto(base + pagePath, { waitUntil: "networkidle" });
      const m = await page.evaluate(() => ({
        iw: window.innerWidth,
        sw: document.documentElement.scrollWidth,
      }));
      if (m.sw !== m.iw) {
        errors.push(`scrollWidth ${pagePath} @${w}: scroll=${m.sw} inner=${m.iw}`);
      } else {
        console.log(`OK scroll ${pagePath} @${w}: ${m.sw}`);
      }
      await page.close();
    }
  }
} catch (e) {
  errors.push(`playwright: ${e.message}`);
} finally {
  if (browser) await browser.close();
}

if (errors.length) {
  console.error("VERIFY FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("VERIFY OK");
