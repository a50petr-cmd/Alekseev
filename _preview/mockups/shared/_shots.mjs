import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:8765/_preview/mockups";

const pages = [
  ["v2/index.html", "v2-home"],
  ["v2/operations-director.html", "v2-operations-director"],
  ["v2/case-fasol.html", "v2-case-fasol"],
  ["v2/case-euroopt.html", "v2-case-euroopt"],
];

const browser = await chromium.launch();
for (const [path, name] of pages) {
  for (const [w, label] of [
    [1440, "1440"],
    [390, "390"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: w, height: label === "390" ? 844 : 900 },
    });
    await page.goto(`${base}/${path}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    console.log(`${name}-${label}: inner=${metrics.innerWidth} scroll=${metrics.scrollWidth}`);
    await page.screenshot({
      path: join(out, `${name}-${label}.png`),
      fullPage: true,
    });
    await page.close();
    console.log(`wrote ${name}-${label}.png`);
  }
}
await browser.close();
