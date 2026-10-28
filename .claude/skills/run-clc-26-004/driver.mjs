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
  // Front, Top and Side are slice views (one slice of the cube seen straight
  // on — see SLICE_VIEWS in src/display/drawCube/drawCube.ts). Picking one
  // should relabel the caption's red #view-label, show only that view's
  // group, reset displayState to its initial state (initDisplayStates in
  // src/display/displayState.ts, also shown by the level widget and diag
  // toggle), and move no widget. Its piece icons must be the same size as
  // the cube's, and the diag toggle must show its own overlay in the cube
  // overlay's colors.
  const viewRows = page.locator('#view-option rect[style*="cursor: pointer"]');
  const diagButton = page.locator('#diag-toggle rect[style*="cursor: pointer"]');
  const sceneDisplay = () => page.evaluate(() => Object.fromEntries(
    ["cube", "front-view", "side-view", "top-view", "not-implemented"].map((id) =>
      [id, document.getElementById(id).getAttribute("display")])));
  const showsOnly = (display, id) =>
    Object.entries(display).every(([k, v]) => v === (k === id ? "inline" : "none"));
  const widgetBoxes = () => page.evaluate(() =>
    ["level-focus-widget", "rank-focus-widget", "file-focus-widget", "diag-toggle", "view-option", "caption"].map((id) => {
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
  const diagLabel = page.locator('#diag-toggle text[dominant-baseline="central"]');
  const rankNumeral = page.locator('#rank-focus-widget text[dominant-baseline="central"]');
  const fileNumeral = page.locator('#file-focus-widget text[dominant-baseline="central"]');
  const debugState = async () => JSON.parse(await page.textContent("#display-state-debug"));
  const checkState = async (name, expected) => {
    const state = await debugState();
    const shown = {
      level: await numeral.textContent(), rank: await rankNumeral.textContent(),
      file: await fileNumeral.textContent(), diag: await diagLabel.textContent(),
    };
    const wantShown = {
      level: String(expected.level), rank: String(expected.rank),
      file: String(expected.file), diag: expected.show3dDiagonals ? "ON" : "OFF",
    };
    const ok = JSON.stringify(state) === JSON.stringify(expected)
      && JSON.stringify(shown) === JSON.stringify(wantShown);
    console.log(`${name}: state ${JSON.stringify(state)}; widgets level ${shown.level}, rank ${shown.rank}, file ${shown.file}, diag ${shown.diag}`);
    if (!ok) {
      console.error(`FAIL: ${name} expected state ${JSON.stringify(expected)}, widgets ${JSON.stringify(wantShown)}`);
      exitCode = 1;
    }
  };
  const CUBE_INIT = { view: "cube-view", perspective: "all", level: 1, rank: 4, file: 1, show3dDiagonals: false };

  // The cell display (top right) shows the focus cell (level, rank, file):
  // coordinates, the piece's color, letter (colored like the piece) and
  // name, its icon or "EMPTY", and the cell's diag color when diagonals
  // are on.
  const cellInfo = () => page.evaluate(() => {
    const el = (id) => document.getElementById(`cell-display-${id}`);
    const shown = (id) => el(id).getAttribute("display") !== "none";
    return {
      coords: el("coords").textContent,
      values: ["level", "rank", "file"].map((id) => el(id).textContent).join(","),
      empty: shown("empty"),
      color: shown("color") ? el("color").textContent : null,
      letter: shown("letter") ? `${el("letter").textContent} ${el("letter").getAttribute("fill")}` : null,
      name: shown("name") ? el("name").textContent : null,
      icon: el("icon").childElementCount > 0,
      diag: shown("diag") ? el("diag").getAttribute("stroke") : null,
    };
  });
  const checkCell = async (name, expected) => {
    const info = await cellInfo();
    console.log(`cell display (${name}): ${JSON.stringify(info)}`);
    const mismatch = Object.entries(expected).filter(([k, v]) => info[k] !== v);
    if (mismatch.length) {
      console.error(`FAIL: cell display (${name}) expected ${JSON.stringify(Object.fromEntries(mismatch))}`);
      exitCode = 1;
    }
  };
  const EMPTY_CELL = { empty: true, color: null, letter: null, name: null, icon: false };
  await checkCell("rank/file before", { coords: "2, 4, 1", values: "2,4,1", ...EMPTY_CELL, diag: "#b300b3" });

  // The RANK and FILE widgets (same layout as LEVEL: up then down hit
  // target) change only their own displayState field, clamped to their
  // range. At this point the cube is at level 2 with diagonals on.
  const rankArrows = page.locator('#rank-focus-widget rect[style*="cursor: pointer"]');
  const fileArrows = page.locator('#file-focus-widget rect[style*="cursor: pointer"]');
  await rankArrows.first().click();
  await fileArrows.first().click();
  await checkState("rank/file up", { ...CUBE_INIT, level: 2, show3dDiagonals: true, rank: 5, file: 2 });
  await fileArrows.nth(1).click();
  await fileArrows.nth(1).click();
  await checkState("file down twice (clamped at 1)", { ...CUBE_INIT, level: 2, show3dDiagonals: true, rank: 5, file: 1 });
  for (let i = 0; i < 3; i++) await rankArrows.first().click();
  await checkCell("black Triton at 2,8,1", {
    coords: "2, 8, 1", empty: false, color: "BLACK", letter: "T #000000", name: "Triton", icon: true,
  });
  await page.screenshot({ path: path.join(outDir, "screenshot-cell-black.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-cell-black.png")}`);

  // The cell display sits one front-view cell (on screen) in from the
  // page's top and right edges, right of the shrunken cube, overlapping
  // no widget.
  const cellPlacement = await page.evaluate(() => {
    const box = (id) => document.getElementById(id).getBoundingClientRect();
    const c = box("cell-display");
    const overlaps = ["level-focus-widget", "rank-focus-widget", "file-focus-widget", "diag-toggle", "view-option"]
      .filter((id) => {
        const w = box(id);
        return w.left < c.right && c.left < w.right && w.top < c.bottom && c.top < w.bottom;
      });
    return {
      top: c.top, right: window.innerWidth - c.right, left: c.left,
      cubeRight: box("cube").right, overlaps,
    };
  });

  // The diag toggle sits at the right, halfway down the page, right-aligned
  // with the FILE widget.
  const diagPlacement = await page.evaluate(() => {
    const d = document.getElementById("diag-toggle").getBoundingClientRect();
    const f = document.getElementById("file-focus-widget").getBoundingClientRect();
    return { centerY: d.y + d.height / 2, pageCenterY: window.innerHeight / 2, right: d.right, fileRight: f.right };
  });
  console.log(`diag toggle: center y ${diagPlacement.centerY.toFixed(1)} (page ${diagPlacement.pageCenterY}), right ${diagPlacement.right.toFixed(1)} (file widget ${diagPlacement.fileRight.toFixed(1)})`);
  if (Math.abs(diagPlacement.centerY - diagPlacement.pageCenterY) > 5
      || Math.abs(diagPlacement.right - diagPlacement.fileRight) > 1) {
    console.error("FAIL: diag toggle should be halfway down the page, right-aligned with the FILE widget");
    exitCode = 1;
  }
  const SLICE_CHECKS = [
    { row: 1, label: "Front View", prefix: "front", cells: 25, pieces: 25,
      init: { view: "front-white", perspective: "white", level: 3, rank: 1, file: 3, show3dDiagonals: false } },
    { row: 2, label: "Top View", prefix: "top", cells: 40, pieces: 20,
      init: { view: "top-view", perspective: "all", level: 5, rank: 4, file: 3, show3dDiagonals: false } },
    { row: 3, label: "Side View", prefix: "side", cells: 40, pieces: 20,
      init: { view: "side-white", perspective: "white", level: 3, rank: 4, file: 1, show3dDiagonals: false } },
  ];

  const cubeIconSize = await iconSize("#cube > g[transform]");
  let flatIconSize = null;
  const boxesBefore = await widgetBoxes();
  for (const { row, label, prefix, cells, pieces, init } of SLICE_CHECKS) {
    // Step the level first, so the reset to the view's initial state shows.
    await page.locator('#level-focus-widget rect[style*="cursor: pointer"]').first().click();
    await viewRows.nth(row).click();
    const viewLabel = await page.textContent("#view-label");
    const display = await sceneDisplay();
    console.log(`${prefix}: view label ${viewLabel}; display ${JSON.stringify(display)}`);
    if (viewLabel !== label || !showsOnly(display, `${prefix}-view`)) {
      console.error(`FAIL: selecting ${label} did not show only #${prefix}-view`);
      exitCode = 1;
    }
    const boxes = await widgetBoxes();
    if (boxes !== boxesBefore) {
      console.error(`FAIL: widgets moved in ${label}\n  before: ${boxesBefore}\n  after:  ${boxes}`);
      exitCode = 1;
    }
    const counts = await page.evaluate((prefix) => ({
      cells: document.querySelectorAll(`#${prefix}-checkers rect`).length,
      pieces: document.querySelectorAll(`#${prefix}-pieces > g`).length,
    }), prefix);
    const size = await iconSize(`#${prefix}-pieces > g`);
    flatIconSize ??= size;
    console.log(`${prefix}: ${counts.cells} cells, ${counts.pieces} pieces; icon size cube ${cubeIconSize}, ${prefix} ${size}; widgets unmoved: ${boxes === boxesBefore}`);
    if (counts.cells !== cells || counts.pieces !== pieces) {
      console.error(`FAIL: ${label} should show ${cells} cells and ${pieces} pieces`);
      exitCode = 1;
    }
    // The flat views' icons all match; the cube's are shrunk with the cube
    // (see shrinkCubeToClear in drawCube.ts).
    if (size !== flatIconSize) {
      console.error(`FAIL: ${label} icons are not the same size as the other flat views' icons`);
      exitCode = 1;
    }
    if (prefix === "front") {
      const ratio = parseFloat(cubeIconSize) / parseFloat(size);
      console.log(`cube/flat icon size ratio: ${ratio.toFixed(3)}`);
      if (ratio < 0.8 || ratio > 0.9) {
        console.error("FAIL: cube icons should be about 0.85x the flat views' icons");
        exitCode = 1;
      }
      const cellW = await page.evaluate(() => document.querySelector("#front-checkers rect").getBoundingClientRect().width);
      console.log(`cell display: top ${cellPlacement.top.toFixed(1)}, right margin ${cellPlacement.right.toFixed(1)} (front cell ${cellW.toFixed(1)}); left ${cellPlacement.left.toFixed(1)} vs cube right ${cellPlacement.cubeRight.toFixed(1)}; overlaps ${JSON.stringify(cellPlacement.overlaps)}`);
      if (Math.abs(cellPlacement.top - cellW) > 3 || Math.abs(cellPlacement.right - cellW) > 3
          || cellPlacement.left <= cellPlacement.cubeRight || cellPlacement.overlaps.length) {
        console.error("FAIL: cell display should be one front cell in from the top-right corner, clear of the cube and widgets");
        exitCode = 1;
      }
      await checkCell("front: white King at 3,1,3", {
        coords: "3, 1, 3", values: "3,1,3", empty: false, color: "WHITE", letter: "K #ffffff", name: "King", icon: true, diag: null,
      });
    }
    await checkState(`${prefix} after reset`, init);
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-view.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-view.png`)}`);

    // Toggled back off afterwards so the state checks are unaffected.
    const viewDiag = () => page.evaluate((prefix) => {
      const g = document.getElementById(`${prefix}-diag-squares`);
      const rects = [...g.querySelectorAll("rect")];
      return { display: g.getAttribute("display"), count: rects.length,
        colors: [...new Set(rects.map((r) => r.getAttribute("stroke")))] };
    }, prefix);
    const diagOff = await viewDiag();
    await diagButton.click();
    const diagOn = await viewDiag();
    console.log(`${prefix} diag overlay: ${diagOff.display} -> ${diagOn.display}; ${diagOn.count} squares; colors ${diagOn.colors.join(" | ")}`);
    if (diagOff.display !== "none" || diagOn.display !== "inline" || diagOn.count !== cells
        || JSON.stringify([...diagOn.colors].sort()) !== JSON.stringify([...diagColors].sort())) {
      console.error(`FAIL: diag toggle did not show ${label}'s diag squares in the cube's colors`);
      exitCode = 1;
    }
    if (prefix === "front") await checkCell("front, diagonals on", { diag: "#1953ff" });
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-diag-on.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-diag-on.png`)}`);
    await diagButton.click();
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
