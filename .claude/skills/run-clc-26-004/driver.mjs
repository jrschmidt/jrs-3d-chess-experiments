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
  // inside #level-focus-widget are the only elements with a `cursor: pointer`
  // style; the first is "up", the second is "down" (see buildLevelFocusWidget in
  // src/display/widgets/levelFocusWidget.ts — up is wired before down).
  const numeral = page.locator('#level-focus-widget text[dominant-baseline="central"]');
  const before = await numeral.textContent();
  await page.locator('#level-focus-widget rect[style*="cursor: pointer"]').first().click();
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
  // Picking Front should relabel the caption's red #view-label and swap the
  // #cube group for #front-view (rank 1 seen straight on), without moving
  // any widget; its piece icons must be the same size as the cube's. Top
  // isn't drawn yet, so it shows the #not-implemented placeholder.
  const viewRows = page.locator('#view-option rect[style*="cursor: pointer"]');
  const sceneDisplay = () => page.evaluate(() => Object.fromEntries(
    ["cube", "front-view", "not-implemented"].map((id) =>
      [id, document.getElementById(id).getAttribute("display")])));
  const showsOnly = (display, id) =>
    Object.entries(display).every(([k, v]) => v === (k === id ? "inline" : "none"));
  const widgetBoxes = () => page.evaluate(() =>
    ["level-focus-widget", "diag-toggle", "view-option", "caption"].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      // Position only: sizes can change with content (e.g. the caption's
      // debug readout), which isn't a move.
      return `${id}:${r.x.toFixed(1)},${r.y.toFixed(1)}`;
    }).join(" "));
  // On-screen size of the first piece icon in a view's group.
  const iconSize = (sel) => page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return `${r.width.toFixed(1)}x${r.height.toFixed(1)}`;
  }, sel);
  const cubeIconSize = await iconSize("#cube > g[transform]");
  const viewLabelBefore = await page.textContent("#view-label");
  const boxesBefore = await widgetBoxes();
  await viewRows.nth(1).click();
  const viewLabelFront = await page.textContent("#view-label");
  const displayFront = await sceneDisplay();
  const boxesFront = await widgetBoxes();
  console.log(`view label: ${viewLabelBefore} -> ${viewLabelFront}; display ${JSON.stringify(displayFront)}`);
  if (viewLabelBefore !== "Cube View" || viewLabelFront !== "Front View" || !showsOnly(displayFront, "front-view")) {
    console.error("FAIL: selecting Front View did not swap the cube for the front view");
    exitCode = 1;
  }
  console.log(`widgets unmoved: ${boxesBefore === boxesFront}`);
  if (boxesBefore !== boxesFront) {
    console.error(`FAIL: widgets moved\n  before: ${boxesBefore}\n  after:  ${boxesFront}`);
    exitCode = 1;
  }
  const frontCounts = await page.evaluate(() => ({
    cells: document.querySelectorAll("#front-checkers rect").length,
    pieces: document.querySelectorAll("#front-pieces > g").length,
  }));
  const frontIconSize = await iconSize("#front-pieces > g");
  console.log(`front view: ${frontCounts.cells} cells, ${frontCounts.pieces} pieces; icon size cube ${cubeIconSize}, front ${frontIconSize}`);
  if (frontCounts.cells !== 25 || frontCounts.pieces !== 25) {
    console.error("FAIL: front view should show 25 rank-1 cells and 25 pieces");
    exitCode = 1;
  }
  if (cubeIconSize !== frontIconSize) {
    console.error("FAIL: front-view icons are not the same size as cube-view icons");
    exitCode = 1;
  }

  await page.screenshot({ path: path.join(outDir, "screenshot-front-view.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-front-view.png")}`);

  // Switching to a view with an initial display state (cube-view,
  // front-white — see initDisplayStates in src/display/displayState.ts)
  // resets every field to it, and the level widget and diag toggle must
  // show the reset values. A view without one (Top) changes only `view`.
  const diagLabel = page.locator('#diag-toggle text[dominant-baseline="central"]');
  const debugState = async () => JSON.parse(await page.textContent("#display-state-debug"));
  const checkState = async (name, expected) => {
    const state = await debugState();
    const shown = { level: await numeral.textContent(), diag: await diagLabel.textContent() };
    const wantShown = { level: String(expected.level), diag: expected.show3dDiagonals ? "ON" : "OFF" };
    const ok = JSON.stringify(state) === JSON.stringify(expected)
      && JSON.stringify(shown) === JSON.stringify(wantShown);
    console.log(`${name}: state ${JSON.stringify(state)}; widgets level ${shown.level}, diag ${shown.diag}`);
    if (!ok) {
      console.error(`FAIL: ${name} expected state ${JSON.stringify(expected)}, widgets ${JSON.stringify(wantShown)}`);
      exitCode = 1;
    }
  };
  const FRONT_INIT = { view: "front-white", perspective: "white", level: 3, rank: 1, file: 3, show3dDiagonals: false };
  const CUBE_INIT = { view: "cube-view", perspective: "all", level: 1, rank: 4, file: 1, show3dDiagonals: false };
  await checkState("front after reset", FRONT_INIT);

  // The front view has its own diag overlay, shown by the same toggle, in
  // the same colors as the cube's. Toggled back off afterwards so the
  // state checks below are unaffected.
  const frontDiag = () => page.evaluate(() => {
    const g = document.getElementById("front-diag-squares");
    const rects = [...g.querySelectorAll("rect")];
    return { display: g.getAttribute("display"), count: rects.length,
      colors: [...new Set(rects.map((r) => r.getAttribute("stroke")))] };
  });
  const frontDiagOff = await frontDiag();
  await page.locator('#diag-toggle rect[style*="cursor: pointer"]').click();
  const frontDiagOn = await frontDiag();
  console.log(`front diag overlay: ${frontDiagOff.display} -> ${frontDiagOn.display}; ${frontDiagOn.count} squares; colors ${frontDiagOn.colors.join(" | ")}`);
  if (frontDiagOff.display !== "none" || frontDiagOn.display !== "inline" || frontDiagOn.count !== 25
      || JSON.stringify([...frontDiagOn.colors].sort()) !== JSON.stringify([...diagColors].sort())) {
    console.error("FAIL: diag toggle did not show the front view's diag squares in the cube's colors");
    exitCode = 1;
  }
  await page.screenshot({ path: path.join(outDir, "screenshot-front-diag-on.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-front-diag-on.png")}`);
  await page.locator('#diag-toggle rect[style*="cursor: pointer"]').click();

  await page.locator('#level-focus-widget rect[style*="cursor: pointer"]').first().click();
  await viewRows.nth(2).click();
  await checkState("top (no initial state)", { ...FRONT_INIT, view: "top-view", level: 4 });
  const displayTop = await sceneDisplay();
  console.log(`top view display: ${JSON.stringify(displayTop)}`);
  if (!showsOnly(displayTop, "not-implemented")) {
    console.error("FAIL: Top View should show only the not-implemented placeholder");
    exitCode = 1;
  }

  await viewRows.nth(0).click();
  const displayCube = await sceneDisplay();
  console.log(`view label after re-selecting cube: ${await page.textContent("#view-label")}; display ${JSON.stringify(displayCube)}`);
  if (!showsOnly(displayCube, "cube")) {
    console.error("FAIL: re-selecting Cube View did not restore the cube");
    exitCode = 1;
  }
  await checkState("cube after reset", CUBE_INIT);
  const diagDisplayCube = await page.locator("#diag-squares").getAttribute("display");
  if (diagDisplayCube !== "none") {
    console.error("FAIL: diag overlay should be hidden after resetting to cube-view");
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
