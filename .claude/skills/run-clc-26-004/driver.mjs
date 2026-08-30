#!/usr/bin/env node
// Driver for clc-26-004 (the "5x5x8 Cube" isometric SVG visualization):
// serves the static site, drives it with Playwright/Chromium, takes a
// screenshot, exercises the focus-level widget, and reports console errors.
//
// Usage:
//   node .claude/skills/run-clc-26-004/driver.mjs [outDir]
//
// outDir defaults to this skill directory. Writes screenshot.png there.
// Exits non-zero (and prints why) if the page throws a console error or the
// focus-level interaction doesn't change the numeral.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../.."); // .claude/skills/run-clc-26-004 -> repo root
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const PORT = 8123;
const BASE_URL = `http://localhost:${PORT}/index.html`;

const waitForServer = async (url, timeoutMs = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not come up at ${url} within ${timeoutMs}ms`);
};

const server = spawn("python3", ["-m", "http.server", String(PORT)], {
  cwd: repoRoot,
  stdio: "ignore",
});

const cleanup = () => server.kill();
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(1); });

let exitCode = 0;

try {
  await waitForServer(BASE_URL);

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(BASE_URL);
  await page.waitForSelector("#scene polygon");

  await page.screenshot({ path: path.join(outDir, "screenshot.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot.png")}`);

  // Representative interaction: click the focus-level widget's up arrow and
  // confirm the LEVEL numeral advances (1 -> 2). The two hit-target rects
  // inside #focus-widget are the only elements with a `cursor: pointer`
  // style; the first is "up", the second is "down" (see buildFocusWidget in
  // app.js — up is wired before down).
  const numeral = page.locator('#focus-widget text[dominant-baseline="central"]');
  const before = await numeral.textContent();
  await page.locator('#focus-widget rect[style*="cursor: pointer"]').first().click();
  const after = await numeral.textContent();
  console.log(`focus level: ${before} -> ${after}`);
  if (after === before) {
    console.error("FAIL: clicking the up arrow did not change the LEVEL numeral");
    exitCode = 1;
  }

  await page.screenshot({ path: path.join(outDir, "screenshot-level2.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-level2.png")}`);

  // Sample the diag-square colors actually on screen.
  const diagColors = await page.$$eval("#diag-squares polygon", (els) => {
    const set = new Set();
    for (const el of els) {
      const m = el.getAttribute("stroke")?.match(/rgba\((\d+),(\d+),(\d+)/);
      if (m) set.add(`${m[1]},${m[2]},${m[3]}`);
    }
    return [...set];
  });
  console.log("diag square colors (r,g,b):", diagColors.join(" | "));

  if (consoleErrors.length) {
    console.error("FAIL: console errors:", JSON.stringify(consoleErrors));
    exitCode = 1;
  } else {
    console.log("no console errors");
  }

  await browser.close();
} catch (err) {
  console.error("FAIL:", err);
  exitCode = 1;
} finally {
  cleanup();
}

process.exit(exitCode);
