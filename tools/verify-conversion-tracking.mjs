#!/usr/bin/env node
/**
 * Headless check: stub ym/gtag and assert conversion calls.
 * Run from repo root: node tools/verify-conversion-tracking.mjs
 */
import { chromium } from "playwright";
import { createServer } from "http";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".php": "text/html; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let url = (req.url || "/").split("?")[0];
      if (url === "/") url = "/index.html";
      const filePath = path.join(root, decodeURIComponent(url));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function installCapture(page) {
  await page.evaluate(() => {
    window.__ymCalls = [];
    window.__gtagCalls = [];
    window.ym = function () {
      window.__ymCalls.push(Array.from(arguments));
    };
    window.gtag = function () {
      window.__gtagCalls.push(Array.from(arguments));
    };
  });
}

async function clickWithoutNavigation(page, selector) {
  const locator = page.locator(selector).first();
  await locator.evaluate((el) => {
    el.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await locator.click({ noWaitAfter: true });
}

async function resetCalls(page) {
  await page.evaluate(() => {
    window.__ymCalls = [];
    window.__gtagCalls = [];
  });
}

async function getCalls(page) {
  return page.evaluate(() => ({
    ym: window.__ymCalls || [],
    gtag: window.__gtagCalls || [],
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dataLayerHasEvent(dataLayer, eventName) {
  return (dataLayer || []).some(function (entry) {
    if (Array.isArray(entry)) {
      return entry[0] === "event" && entry[1] === eventName;
    }
    if (entry && typeof entry === "object") {
      return entry[0] === "event" && entry[1] === eventName;
    }
    return false;
  });
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(base + "/case-fasol.html", { waitUntil: "load" });
  const dataLayer = await page.evaluate(() => window.dataLayer || []);
  assert(dataLayerHasEvent(dataLayer, "view_case"), "case page load: gtag view_case via dataLayer");

  await page.goto(base + "/index.html", { waitUntil: "domcontentloaded" });
  await installCapture(page);

  await clickWithoutNavigation(page, 'a.case-card__cta[href*="case-euroopt"]');
  let calls = await getCalls(page);
  assert(calls.ym.some((a) => a[2] === "view_case"), "view_case link: ym");
  assert(calls.gtag.some((a) => a[1] === "view_case"), "view_case link: gtag");

  await resetCalls(page);
  await clickWithoutNavigation(page, 'a[href^="tel:"]');
  calls = await getCalls(page);
  assert(calls.gtag.some((a) => a[0] === "event" && a[1] === "click_phone"), "tel: gtag click_phone");
  assert(!calls.ym.some((a) => a[2] === "click_phone"), "tel: no Metrika click_phone goal");

  await resetCalls(page);
  await clickWithoutNavigation(page, 'a[href^="mailto:"]');
  calls = await getCalls(page);
  assert(calls.ym.some((a) => a[2] === "click_email"), "mailto: ym click_email");
  assert(calls.gtag.some((a) => a[1] === "click_email"), "mailto: gtag click_email");

  await resetCalls(page);
  await clickWithoutNavigation(page, 'a[href*="t.me/PetroAlekseev"]');
  calls = await getCalls(page);
  assert(calls.ym.some((a) => a[2] === "click_telegram"), "personal tg: ym");
  assert(calls.gtag.some((a) => a[1] === "click_telegram"), "personal tg: gtag");

  await resetCalls(page);
  await page.locator('[data-goal="click_primary_cta"]').first().click({ noWaitAfter: true });
  calls = await getCalls(page);
  assert(calls.ym.some((a) => a[2] === "click_primary_cta"), "CTA: ym");
  assert(calls.gtag.some((a) => a[1] === "click_primary_cta"), "CTA: gtag");

  await page.locator("[data-lead-form]").evaluate((el) => {
    el.dataset.stub = "1";
  });
  await page.fill('[data-lead-form] [name="name"]', "Ivan");
  const phoneInput = page.locator('[data-lead-form] [name="phone"]');
  await phoneInput.click();
  await phoneInput.fill("");
  await phoneInput.type("9269232929", { delay: 15 });
  await page.fill('[data-lead-form] [name="task"]', "Analytics goals test");
  await page.check('[data-lead-form] [name="consent"]');
  await resetCalls(page);
  await page.waitForTimeout(3100);
  await page.locator('[data-lead-form] [type=submit]').click();
  await page.waitForSelector(".lead-status.is-ok", { timeout: 5000 });
  calls = await getCalls(page);
  assert(calls.ym.some((a) => a[2] === "form_submit"), "form: ym form_submit");
  assert(calls.gtag.some((a) => a[0] === "event" && a[1] === "generate_lead"), "form: gtag generate_lead");

  console.log("OK: conversion tracking verified");
  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
