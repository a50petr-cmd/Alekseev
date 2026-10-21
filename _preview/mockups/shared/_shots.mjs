import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots");
mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:8765/_preview/mockups";

const pages = [
  ["v1/index.html", "v1-home"],
  ["v2/index.html", "v2-home"],
  ["v3/index.html", "v3-home"],
  ["v1/case-fasol.html", "v1-case-fasol"],
  ["v1/case-euroopt.html", "v1-case-euroopt"],
];

const browser = await chromium.launch();
for (const [path, name] of pages) {
  for (const [w, label] of [
    [1440, "1440"],
    [390, "390"],
  ]) {
    if (name.startsWith("v1-case") && label === "390") continue;
    const page = await browser.newPage({ viewport: { width: w, height: label === "390" ? 844 : 900 } });
    await page.goto(`${base}/${path}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: join(out, `${name}-${label}.png`),
      fullPage: true,
    });
    await page.close();
    console.log(`${name}-${label}.png`);
  }
}
await browser.close();
