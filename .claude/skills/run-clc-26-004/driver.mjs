#!/usr/bin/env node
// Driver for x3d-chess (formerly clc-26-004, the "5x5x8 Cube" isometric SVG
// visualization): starts the Vite dev server, drives the app with
// Playwright/Chromium, takes screenshots, exercises the focus-level, diagonal
// toggle and view-option widgets, and reports console errors.
//
// Usage:
//   node .claude/skills/run-clc-26-004/driver.mjs [outDir]
//
// outDir defaults to this skill directory. Writes screenshot.png there.
// Exits non-zero (and prints why) if the page throws a console error or any
// widget interaction doesn't have its expected effect.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../.."); // .claude/skills/run-clc-26-004 -> repo root
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const PORT = 8123;
const BASE_URL = `http://localhost:${PORT}/`;

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

// Run the repo's own vite binary directly (not via npx/npm) so that
// server.kill() reaches the server process itself.
const server = spawn(path.join(repoRoot, "node_modules/.bin/vite"), ["--port", String(PORT), "--strictPort"], {
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
  await page.waitForSelector("#checkers polygon");

  await page.screenshot({ path: path.join(outDir, "screenshot.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot.png")}`);

  // Representative interaction: click the focus-level widget's up arrow and
  // confirm the LEVEL numeral advances (1 -> 2). The two hit-target rects
  // inside #focus-widget are the only elements with a `cursor: pointer`
  // style; the first is "up", the second is "down" (see buildFocusWidget in
  // src/display/widgets/focusWidget.ts — up is wired before down).
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

  // The diag-square overlay defaults to off; confirm that, then toggle it on
  // via the diag-toggle widget's single click target (see buildDiagToggle in
  // src/display/widgets/diagToggle.ts) and confirm squares appear.
  const sampleDiagColors = () => page.$$eval("#diag-squares polygon", (els) => {
    const set = new Set();
    for (const el of els) {
      const stroke = el.getAttribute("stroke");
      if (stroke) set.add(stroke);
    }
    return [...set];
  });

  const diagDisplayBefore = await page.locator("#diag-squares").getAttribute("display");
  console.log(`diag overlay display (before toggle): ${diagDisplayBefore}`);
  if (diagDisplayBefore !== "none") {
    console.error("FAIL: diag overlay should default to hidden (display=none)");
    exitCode = 1;
  }

  await page.locator('#diag-toggle rect[style*="cursor: pointer"]').click();
  const diagDisplayAfter = await page.locator("#diag-squares").getAttribute("display");
  const diagColors = await sampleDiagColors();
  console.log(`diag overlay display (after toggle): ${diagDisplayAfter}`);
  console.log("diag square colors (hex):", diagColors.join(" | ") || "(none)");
  if (diagDisplayAfter !== "inline" || diagColors.length === 0) {
    console.error("FAIL: clicking the diag toggle did not reveal diag squares");
    exitCode = 1;
  }

  await page.screenshot({ path: path.join(outDir, "screenshot-diag-on.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-diag-on.png")}`);

  // The view-option widget has one click target per row, in order Cube,
  // Front, Top, Side (see buildViewOption in src/display/widgets/viewOption.ts).
  // Picking Front should relabel the caption's red #view-label, hide the
  // #cube group, and show the #not-implemented placeholder — without moving
  // any widget. Picking Cube again should restore the cube.
  const viewRows = page.locator('#view-option rect[style*="cursor: pointer"]');
  const sceneDisplay = () => page.evaluate(() => ({
    cube: document.getElementById("cube").getAttribute("display"),
    placeholder: document.getElementById("not-implemented").getAttribute("display"),
  }));
  const widgetBoxes = () => page.evaluate(() =>
    ["focus-widget", "diag-toggle", "view-option", "caption"].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return `${id}:${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)}x${r.height.toFixed(1)}`;
    }).join(" "));
  const viewLabelBefore = await page.textContent("#view-label");
  const boxesBefore = await widgetBoxes();
  await viewRows.nth(1).click();
  const viewLabelFront = await page.textContent("#view-label");
  const displayFront = await sceneDisplay();
  const boxesFront = await widgetBoxes();
  console.log(`view label: ${viewLabelBefore} -> ${viewLabelFront}; cube: ${displayFront.cube}, placeholder: ${displayFront.placeholder}`);
  if (viewLabelBefore !== "Cube View" || viewLabelFront !== "Front View"
      || displayFront.cube !== "none" || displayFront.placeholder !== "inline") {
    console.error("FAIL: selecting Front View did not swap the cube for the placeholder");
    exitCode = 1;
  }
  console.log(`widgets unmoved: ${boxesBefore === boxesFront}`);
  if (boxesBefore !== boxesFront) {
    console.error(`FAIL: widgets moved\n  before: ${boxesBefore}\n  after:  ${boxesFront}`);
    exitCode = 1;
  }

  await page.screenshot({ path: path.join(outDir, "screenshot-front-view.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-front-view.png")}`);

  await viewRows.nth(0).click();
  const displayCube = await sceneDisplay();
  console.log(`view label after re-selecting cube: ${await page.textContent("#view-label")}; cube: ${displayCube.cube}, placeholder: ${displayCube.placeholder}`);
  if (displayCube.cube !== "inline" || displayCube.placeholder !== "none") {
    console.error("FAIL: re-selecting Cube View did not restore the cube");
    exitCode = 1;
  }

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
