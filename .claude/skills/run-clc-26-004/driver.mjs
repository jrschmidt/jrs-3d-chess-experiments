#!/usr/bin/env node
// Driver for Chess 321 (formerly x3d-chess and clc-26-004, the "5x5x8 Cube"
// isometric SVG visualization): starts the Vite dev server, drives the app with
// Playwright/Chromium, takes screenshots, exercises the cell indicator cube, diagonal
// toggle, view-option and view mode picker widgets, and reports console errors.
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

  // The cell indicator cube (see buildCellIndicatorCube in src/display/widgets/cellIndicatorCube.ts)
  // has one hit target per numeral, the only elements with a `cursor:
  // pointer` style in its #cell-indicator-cube-<field> group, in drawn order: level
  // 5..1, rank 8..1, file 1..5. pick(field, value) clicks one; shownValue
  // reads which numeral is highlighted (shown at full opacity).
  const PICKER_ORDER = { level: [5, 4, 3, 2, 1], rank: [8, 7, 6, 5, 4, 3, 2, 1], file: [1, 2, 3, 4, 5] };
  const pick = (field, value) =>
    page.locator(`#cell-indicator-cube-${field} rect[style*="cursor: pointer"]`).nth(PICKER_ORDER[field].indexOf(value)).click();
  const shownValue = (field) => page.evaluate((field) =>
    [...document.querySelectorAll(`#cell-indicator-cube-${field} text`)]
      .filter((t) => t.getAttribute("opacity") === "1").map((t) => t.textContent).join(","), field);

  // Representative interaction: click the indicator cube's level 2 and confirm the
  // highlighted LEVEL numeral moves (1 -> 2).
  const before = await shownValue("level");
  await pick("level", 2);
  const after = await shownValue("level");
  console.log(`focus level: ${before} -> ${after}`);
  if (before !== "1" || after !== "2") {
    console.error("FAIL: clicking level 2 in the cell indicator cube did not move the LEVEL highlight from 1 to 2");
    exitCode = 1;
  }

  // The indicator cube draws the selected level's squares in green, the
  // selected rank's in red and the selected file's in blue, squares on two
  // of them in a mix and the selected cell (when on the surface) in orange.
  // Counts per class (L, R, F, LR, LF, RF, LRF) over the 105 face squares,
  // counted by hand: the top face is all level 5, the front all rank 1 and
  // the left all file 1.
  const HIGHLIGHT_FILLS = {
    L: ["#339933", "#336633"], R: ["#993333", "#663333"], F: ["#333399", "#333366"],
    LR: ["#999933"], LF: ["#339999"], RF: ["#993399"], LRF: ["#ff8000"],
  };
  const indicatorHighlights = () => page.evaluate((classes) => {
    const fills = [...document.querySelectorAll("#cell-indicator-cube-faces polygon")].map((p) => p.getAttribute("fill"));
    return Object.entries(classes)
      .map(([name, colors]) => `${name} ${fills.filter((f) => colors.includes(f)).length}`).join(", ");
  }, HIGHLIGHT_FILLS);
  const HIGHLIGHT_CHECKS = [
    { cell: "2,4,1", picks: [], expected: "L 4, R 4, F 39, LR 0, LF 8, RF 5, LRF 1" },
    { cell: "5,4,1", picks: [["level", 5]], expected: "L 32, R 0, F 32, LR 4, LF 15, RF 4, LRF 2" },
    { cell: "2,4,2", picks: [["level", 2], ["file", 2]], expected: "L 11, R 8, F 11, LR 1, LF 1, RF 1, LRF 0" },
  ];
  for (const { cell, picks, expected } of HIGHLIGHT_CHECKS) {
    for (const [field, value] of picks) await pick(field, value);
    const got = await indicatorHighlights();
    console.log(`indicator cube highlights at ${cell}: ${got}`);
    if (got !== expected) {
      console.error(`FAIL: expected indicator cube highlights at ${cell}: ${expected}`);
      exitCode = 1;
    }
  }
  await pick("file", 1);

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
  // on — see SLICE_VIEWS in src/display/drawSlice/drawSlice.ts). Picking one
  // should show only that view's group, keep the selected cell but reset
  // the other displayState fields to the view's initial state
  // (initDisplayStates in src/display/displayState.ts; checked through the
  // cell indicator cube and diag toggle), and move no widget. Its piece icons must be the same size as
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
    ["cell-indicator-cube", "diag-toggle", "view-option", "view-mode-picker"].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      // Position only: sizes can change with content, which isn't a move.
      return `${id}:${r.x.toFixed(1)},${r.y.toFixed(1)}`;
    }).join(" "));
  // On-screen size of the first piece icon in a view's group.
  const iconSize = (sel) => page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return `${r.width.toFixed(1)}x${r.height.toFixed(1)}`;
  }, sel);
  const diagLabel = page.locator('#diag-toggle text[dominant-baseline="central"]');
  // displayState isn't shown on the page, so it's checked through the
  // widgets that show it (the cell indicator cube's highlights and the diag toggle); `view` and `perspective` in `expected` aren't
  // checked here (the view is checked by which group sceneDisplay shows).
  const checkState = async (name, expected) => {
    const shown = {
      level: await shownValue("level"), rank: await shownValue("rank"),
      file: await shownValue("file"), diag: await diagLabel.textContent(),
    };
    const wantShown = {
      level: String(expected.level), rank: String(expected.rank),
      file: String(expected.file), diag: expected.show3dDiagonals ? "ON" : "OFF",
    };
    const ok = JSON.stringify(shown) === JSON.stringify(wantShown);
    console.log(`${name}: widgets level ${shown.level}, rank ${shown.rank}, file ${shown.file}, diag ${shown.diag}`);
    if (!ok) {
      console.error(`FAIL: ${name} expected widgets ${JSON.stringify(wantShown)}`);
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

  // The indicator cube's RANK and FILE numerals change only their own displayState
  // field. At this point the cube is at level 2 with diagonals on.
  await pick("rank", 5);
  await pick("file", 2);
  await checkState("rank 5, file 2", { ...CUBE_INIT, level: 2, show3dDiagonals: true, rank: 5, file: 2 });
  await pick("file", 1);
  await checkState("file 1", { ...CUBE_INIT, level: 2, show3dDiagonals: true, rank: 5, file: 1 });
  await pick("rank", 8);
  await checkCell("black Triton at 2,8,1", {
    coords: "2, 8, 1", empty: false, color: "BLACK", letter: "T #000000", name: "Triton", icon: true,
  });
  await page.screenshot({ path: path.join(outDir, "screenshot-cell-black.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-cell-black.png")}`);

  // The widgets form one column right of the separator line, centered on
  // one vertical line: the cell display at the top, the view selector +
  // view mode picker + diag toggle row halfway down the page, the cell indicator cube at the
  // bottom. None overlap.
  const column = await page.evaluate(() => {
    const box = (id) => document.getElementById(id).getBoundingClientRect();
    const c = box("cell-display"), v = box("view-option"), d = box("diag-toggle"), m = box("view-mode-picker");
    const p = box("cell-indicator-cube");
    const ids = ["cell-display", "view-option", "diag-toggle", "view-mode-picker", "cell-indicator-cube"];
    const overlaps = ids.flatMap((a, i) => ids.slice(i + 1).filter((b) => {
      const x = box(a), y = box(b);
      return x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
    }).map((b) => `${a}/${b}`));
    return {
      cellCenter: (c.left + c.right) / 2, rowCenter: (v.left + d.right) / 2,
      indicatorCenter: (p.left + p.right) / 2,
      cellBottom: c.bottom, rowTop: Math.min(v.top, d.top, m.top), rowBottom: Math.max(v.bottom, d.bottom, m.bottom),
      indicatorTop: p.top, diagCenterY: d.y + d.height / 2, pageCenterY: window.innerHeight / 2,
      left: Math.min(c.left, v.left, p.left), overlaps,
    };
  });
  console.log(`widget column: centers cell display ${column.cellCenter.toFixed(1)}, row ${column.rowCenter.toFixed(1)}, indicator cube ${column.indicatorCenter.toFixed(1)}; diag toggle center y ${column.diagCenterY.toFixed(1)} (page ${column.pageCenterY}); overlaps ${JSON.stringify(column.overlaps)}`);
  if (Math.abs(column.cellCenter - column.indicatorCenter) > 1 || Math.abs(column.rowCenter - column.indicatorCenter) > 1
      || column.cellBottom > column.rowTop || column.rowBottom > column.indicatorTop
      || Math.abs(column.diagCenterY - column.pageCenterY) > 5 || column.overlaps.length) {
    console.error("FAIL: cell display, selector/toggle row and cell indicator cube should be stacked top to bottom on one center line, the row halfway down the page, none overlapping");
    exitCode = 1;
  }

  // The separator line, styled like the widget outlines, runs between the
  // cube and the widget column (the slice grids are checked in their views).
  const separatorInfo = () => page.evaluate(() => {
    const s = document.getElementById("widget-separator");
    const r = s.getBoundingClientRect();
    return { x: (r.left + r.right) / 2, top: r.top, bottom: r.bottom,
      stroke: s.getAttribute("stroke"), width: s.getAttribute("stroke-width"),
      cubeRight: document.getElementById("cube").getBoundingClientRect().right };
  });
  const separator = await separatorInfo();
  console.log(`separator: ${JSON.stringify(separator)}; widget column left ${column.left.toFixed(1)}`);
  if (separator.stroke !== "rgba(255,255,255,0.25)" || separator.width !== "1"
      || !(separator.x > separator.cubeRight) || !(separator.x < column.left)
      || !(separator.bottom - separator.top > 500)) {
    console.error("FAIL: separator should be a full-height panel-outline line between the cube and the widget column");
    exitCode = 1;
  }

  // The view selector sits just left of the view mode picker, centered on
  // the same height as the diag toggle.
  const viewPlacement = await page.evaluate(() => {
    const v = document.getElementById("view-option").getBoundingClientRect();
    const m = document.getElementById("view-mode-picker").getBoundingClientRect();
    const d = document.getElementById("diag-toggle").getBoundingClientRect();
    return { gap: m.left - v.right, centerY: v.y + v.height / 2, diagCenterY: d.y + d.height / 2 };
  });
  console.log(`view option: gap to view mode picker ${viewPlacement.gap.toFixed(1)}, center y ${viewPlacement.centerY.toFixed(1)} (diag toggle ${viewPlacement.diagCenterY.toFixed(1)})`);
  if (viewPlacement.gap <= 0 || viewPlacement.gap > 30
      || Math.abs(viewPlacement.centerY - viewPlacement.diagCenterY) > 5) {
    console.error("FAIL: view option should sit just left of the view mode picker, centered on the diag toggle's height");
    exitCode = 1;
  }

  // The view mode picker sits just left of the diag toggle, centered on the
  // same height, captioned "View Mode", offering Basic and Iso (Iso-X is
  // commented out for now) with Basic selected. Picking Iso highlights it
  // without changing the view shown or moving any widget (Iso draws the
  // same as Basic for now) and keeps it across view changes; picking Basic
  // puts it back.
  const modeInfo = () => page.evaluate(() => {
    const g = document.getElementById("view-mode-picker");
    const r = g.getBoundingClientRect();
    const d = document.getElementById("diag-toggle").getBoundingClientRect();
    const texts = [...g.querySelectorAll("text")];
    const options = texts.slice(1);
    return {
      caption: texts[0].textContent, options: options.map((t) => t.textContent).join(","),
      selected: options.filter((t) => t.getAttribute("opacity") === "1").map((t) => t.textContent).join(","),
      gap: d.left - r.right, centerY: r.y + r.height / 2, diagCenterY: d.y + d.height / 2,
    };
  });
  const mode = await modeInfo();
  console.log(`view mode picker: ${JSON.stringify(mode)}`);
  if (mode.caption !== "View Mode" || mode.options !== "Basic,Iso" || mode.selected !== "Basic"
      || mode.gap <= 0 || mode.gap > 30 || Math.abs(mode.centerY - mode.diagCenterY) > 5) {
    console.error("FAIL: view mode picker should be captioned View Mode, offer Basic,Iso with Basic selected, and sit just left of the diag toggle at the same height");
    exitCode = 1;
  }
  const modeBoxesBefore = await widgetBoxes();
  await page.locator('#view-mode-picker [data-value="iso"]').click();
  const isoSelected = (await modeInfo()).selected;
  const isoShowsCube = showsOnly(await sceneDisplay(), "cube");
  const isoBoxes = await widgetBoxes();
  console.log(`view mode iso: selected ${isoSelected}; cube shown ${isoShowsCube}; widgets unmoved ${isoBoxes === modeBoxesBefore}`);
  if (isoSelected !== "Iso" || !isoShowsCube || isoBoxes !== modeBoxesBefore) {
    console.error("FAIL: picking Iso should highlight it, keep the cube view shown and move no widget");
    exitCode = 1;
  }
  await page.screenshot({ path: path.join(outDir, "screenshot-view-mode-iso.png") });
  console.log(`screenshot: ${path.join(outDir, "screenshot-view-mode-iso.png")}`);
  // The view mode carries over on a view change (see changeView): still
  // Iso in Front View and back in Cube View.
  await viewRows.nth(1).click();
  const modeInFront = (await modeInfo()).selected;
  await viewRows.nth(0).click();
  const modeBackInCube = (await modeInfo()).selected;
  console.log(`view mode after view changes: front ${modeInFront}, cube ${modeBackInCube}`);
  if (modeInFront !== "Iso" || modeBackInCube !== "Iso") {
    console.error("FAIL: the view mode should stay Iso across view changes");
    exitCode = 1;
  }
  await page.locator('#view-mode-picker [data-value="basic"]').click();
  if ((await modeInfo()).selected !== "Basic") {
    console.error("FAIL: picking Basic should highlight it again");
    exitCode = 1;
  }
  // The cell picked above (the black Triton at 2,8,1) carries into every
  // view; it differs from each view's preset cell (front 3,1,3, top 5,4,3,
  // side 3,4,1, cube 1,4,1), so a reset would show. Diagonals are on going
  // into Front, and carry over (stay on) through every view. Piece counts are for the carried
  // planes: rank 8, level 2, file 1.
  const CARRIED = { level: 2, rank: 8, file: 1 };
  // `clickAt` is a grid square (col, row; 1,1 at the bottom left) and the
  // cell clicking it must select; `carriedAt` is the square of the CARRIED
  // cell, clicked afterwards to put the selection back.
  const SLICE_CHECKS = [
    { row: 1, label: "Front View", prefix: "front", cells: 25, pieces: 25, field: "rank", cols: 5,
      clickAt: { col: 4, row: 3, cell: { level: 3, rank: 8, file: 4 } }, carriedAt: { col: 1, row: 2 },
      expected: { view: "front-white", perspective: "white", ...CARRIED, show3dDiagonals: true } },
    { row: 2, label: "Top View", prefix: "top", cells: 40, pieces: 20, field: "level", cols: 5,
      clickAt: { col: 2, row: 7, cell: { level: 2, rank: 7, file: 2 } }, carriedAt: { col: 1, row: 8 },
      expected: { view: "top-view", perspective: "all", ...CARRIED, show3dDiagonals: true } },
    { row: 3, label: "Side View", prefix: "side", cells: 40, pieces: 20, field: "file", cols: 8,
      clickAt: { col: 3, row: 4, cell: { level: 4, rank: 6, file: 1 } }, carriedAt: { col: 1, row: 2 },
      expected: { view: "side-white", perspective: "white", ...CARRIED, show3dDiagonals: true } },
  ];
  // The view titles currently shown, and where the shown one sits relative
  // to the top of its view's drawing (the slice grid, or the cube).
  const shownTitles = () => page.evaluate(() => {
    const titles = ["cube-title", "front-title", "top-title", "side-title"]
      .map((id) => document.getElementById(id))
      .filter((el) => el.getBoundingClientRect().width > 0);
    const t = titles[0];
    const grid = t && (t.id === "cube-title" ? document.getElementById("cube")
      : document.getElementById(t.id.replace("-title", "-checkers")));
    return { shown: titles.map((el) => el.textContent),
      bottom: t?.getBoundingClientRect().bottom, gridTop: grid?.getBoundingClientRect().top };
  });
  // Clicks the center of a slice view's square with the mouse, so a piece
  // icon drawn over it must let the click through to the square.
  const clickSquare = async (prefix, cols, col, row) => {
    const center = await page.evaluate(({ prefix, i }) => {
      const r = document.querySelectorAll(`#${prefix}-checkers polygon`)[i].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, { prefix, i: (row - 1) * cols + (col - 1) });
    await page.mouse.click(center.x, center.y);
  };

  const cubeIconSize = await iconSize("#cube > g[transform]");
  let flatIconSize = null;
  const boxesBefore = await widgetBoxes();
  for (const { row, label, prefix, cells, pieces, field, cols, clickAt, carriedAt, expected } of SLICE_CHECKS) {
    await viewRows.nth(row).click();
    const display = await sceneDisplay();
    console.log(`${prefix}: display ${JSON.stringify(display)}`);
    if (!showsOnly(display, `${prefix}-view`)) {
      console.error(`FAIL: selecting ${label} did not show only #${prefix}-view`);
      exitCode = 1;
    }
    const boxes = await widgetBoxes();
    if (boxes !== boxesBefore) {
      console.error(`FAIL: widgets moved in ${label}\n  before: ${boxesBefore}\n  after:  ${boxes}`);
      exitCode = 1;
    }
    // The separator stays right of the slice grid and its plane picker.
    const gridRight = await page.evaluate((prefix) => Math.max(
      document.getElementById(`${prefix}-checkers`).getBoundingClientRect().right,
      document.getElementById(`${prefix}-plane-picker`).getBoundingClientRect().right), prefix);
    const sepX = (await separatorInfo()).x;
    console.log(`${prefix}: separator x ${sepX.toFixed(1)}, grid/plane picker right ${gridRight.toFixed(1)}`);
    if (!(sepX > gridRight)) {
      console.error(`FAIL: ${label} grid and plane picker should be left of the separator`);
      exitCode = 1;
    }
    const counts = await page.evaluate((prefix) => ({
      cells: document.querySelectorAll(`#${prefix}-checkers polygon`).length,
      pieces: document.querySelectorAll(`#${prefix}-pieces > g`).length,
    }), prefix);
    const size = await iconSize(`#${prefix}-pieces > g`);
    flatIconSize ??= size;
    console.log(`${prefix}: ${counts.cells} cells, ${counts.pieces} pieces; icon size cube ${cubeIconSize}, ${prefix} ${size}; widgets unmoved: ${boxes === boxesBefore}`);
    if (counts.cells !== cells || counts.pieces !== pieces) {
      console.error(`FAIL: ${label} should show ${cells} cells and ${pieces} pieces`);
      exitCode = 1;
    }
    // The flat views' icons all match, and the cube's are no larger.
    if (size !== flatIconSize) {
      console.error(`FAIL: ${label} icons are not the same size as the other flat views' icons`);
      exitCode = 1;
    }
    if (prefix === "front") {
      const ratio = parseFloat(cubeIconSize) / parseFloat(size);
      console.log(`cube/flat icon size ratio: ${ratio.toFixed(3)}`);
      if (ratio > 1.001) {
        console.error("FAIL: cube icons should be no larger than the flat views' icons");
        exitCode = 1;
      }
      await checkCell("front: black Triton at 2,8,1, carried", {
        coords: "2, 8, 1", values: "2,8,1", empty: false, color: "BLACK", letter: "T #000000", name: "Triton", icon: true, diag: "#b300b3",
      });
    }
    await checkState(`${prefix} after switching`, expected);
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-view.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-view.png`)}`);

    // The view shows the plane at its own field (front: rank, top: level,
    // side: file). Moving it by one flips every square's checker parity, so
    // the first square's fill must change; moving back restores it. In
    // Front, rank 3 is empty, so its pieces must be redrawn as none.
    const planeInfo = () => page.evaluate((prefix) => ({
      fill: document.querySelector(`#${prefix}-checkers polygon`).getAttribute("fill"),
      pieces: document.querySelectorAll(`#${prefix}-pieces > g`).length,
    }), prefix);
    const start = expected[field];
    const atStart = await planeInfo();
    await pick(field, start + (start < PICKER_ORDER[field].length ? 1 : -1));
    const moved = await planeInfo();
    let emptyPieces = null;
    if (prefix === "front") {
      await pick("rank", 3);
      emptyPieces = (await planeInfo()).pieces;
      await page.screenshot({ path: path.join(outDir, "screenshot-front-rank3.png") });
      console.log(`screenshot: ${path.join(outDir, "screenshot-front-rank3.png")}`);
    }
    await pick(field, start);
    const back = await planeInfo();
    console.log(`${prefix} plane (${field}): fill ${atStart.fill} -> ${moved.fill} -> ${back.fill}; pieces ${atStart.pieces} -> ${moved.pieces}${emptyPieces === null ? "" : ` (rank 3: ${emptyPieces})`} -> ${back.pieces}`);
    if (moved.fill === atStart.fill || back.fill !== atStart.fill || back.pieces !== pieces
        || (emptyPieces !== null && emptyPieces !== 0)) {
      console.error(`FAIL: ${label} did not redraw for the ${field} picked`);
      exitCode = 1;
    }

    // Diagonals carried in on, so the overlay is already shown; toggle it
    // off and back on, leaving it on so the state checks are unaffected.
    const viewDiag = () => page.evaluate((prefix) => {
      const g = document.getElementById(`${prefix}-diag-squares`);
      const rects = [...g.querySelectorAll("polygon")];
      return { display: g.getAttribute("display"), count: rects.length,
        colors: [...new Set(rects.map((r) => r.getAttribute("stroke")))] };
    }, prefix);
    const diagOn = await viewDiag();
    if (prefix === "front") await checkCell("front, diagonals on", { diag: "#b300b3" });
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-diag-on.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-diag-on.png`)}`);
    await diagButton.click();
    const diagOff = await viewDiag();
    await diagButton.click();
    const diagBack = await viewDiag();
    console.log(`${prefix} diag overlay: ${diagOn.display} -> ${diagOff.display} -> ${diagBack.display}; ${diagOn.count} squares; colors ${diagOn.colors.join(" | ")}`);
    if (diagOn.display !== "inline" || diagOff.display !== "none" || diagBack.display !== "inline"
        || diagOn.count !== cells
        || JSON.stringify([...diagOn.colors].sort()) !== JSON.stringify([...diagColors].sort())) {
      console.error(`FAIL: ${label} should show its carried-over diag squares in the cube's colors, and the toggle should hide and re-show them`);
      exitCode = 1;
    }

    // Clicking a square selects its cell (all three fields) without moving
    // the plane shown; clicking the carried cell's square (a piece, so the
    // click must pass through its icon) puts the selection back.
    const { level, rank, file } = clickAt.cell;
    await clickSquare(prefix, cols, clickAt.col, clickAt.row);
    await checkState(`${prefix} after clicking square ${clickAt.col},${clickAt.row}`, { ...expected, ...clickAt.cell });
    await checkCell(`${prefix} clicked`, { coords: `${level}, ${rank}, ${file}`, values: `${level},${rank},${file}` });
    if (!showsOnly(await sceneDisplay(), `${prefix}-view`)) {
      console.error(`FAIL: clicking a square in ${label} changed the view`);
      exitCode = 1;
    }
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-clicked.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-clicked.png`)}`);
    await clickSquare(prefix, cols, carriedAt.col, carriedAt.row);
    await checkState(`${prefix} after clicking the carried cell`, expected);

    // The view's title sits above its grid, and is the only title shown.
    const title = await shownTitles();
    console.log(`${prefix}: titles shown ${JSON.stringify(title.shown)}; title bottom ${title.bottom?.toFixed(1)}, grid top ${title.gridTop?.toFixed(1)}`);
    if (JSON.stringify(title.shown) !== JSON.stringify([label]) || !(title.bottom <= title.gridTop)) {
      console.error(`FAIL: ${label} should show only its title, above its grid`);
      exitCode = 1;
    }

    // Under the title, the subtitle names the plane shown ("Rank 1", ...),
    // above the grid, and follows the plane picker (checked below).
    const planeName = field[0].toUpperCase() + field.slice(1);
    const subtitleInfo = () => page.evaluate(({ prefix }) => {
      const el = document.getElementById(`${prefix}-subtitle`);
      const r = el.getBoundingClientRect();
      return { text: el.textContent, top: r.top, bottom: r.bottom,
        titleBottom: document.getElementById(`${prefix}-title`).getBoundingClientRect().bottom,
        gridTop: document.getElementById(`${prefix}-checkers`).getBoundingClientRect().top };
    }, { prefix });
    const sub = await subtitleInfo();
    console.log(`${prefix} subtitle: ${JSON.stringify(sub)}`);
    if (sub.text !== `${planeName} ${start}` || !(sub.top >= sub.titleBottom - 1) || !(sub.bottom <= sub.gridTop)) {
      console.error(`FAIL: ${label} subtitle should read "${planeName} ${start}", between its title and grid`);
      exitCode = 1;
    }

    // The plane picker (right of the grid) shows the view's field max..1
    // and highlights the current one; its up arrow moves the plane one up
    // (or, at the top, does nothing), and clicking a numeral jumps to it.
    const pickerSel = `#${prefix}-plane-picker`;
    const pickerInfo = () => page.evaluate(({ pickerSel, gridSel }) => {
      const g = document.querySelector(pickerSel);
      const nums = [...g.querySelectorAll("text")].filter((t) => /^\d$/.test(t.textContent));
      const lit = [...g.querySelectorAll("rect")].filter((r) => r.getAttribute("rx") && r.getAttribute("display") !== "none");
      const caption = [...g.querySelectorAll("text")].find((t) => !/^\d$/.test(t.textContent));
      return {
        numerals: nums.map((t) => t.textContent).join(""),
        selected: nums.filter((t) => t.getAttribute("opacity") === "1").map((t) => t.textContent).join(""),
        highlights: lit.length,
        caption: caption.textContent, captionRotate: caption.getAttribute("transform").startsWith("rotate(90 "),
        rightOfGrid: g.getBoundingClientRect().left > document.querySelector(gridSel).getBoundingClientRect().right,
      };
    }, { pickerSel, gridSel: `#${prefix}-checkers` });
    const max = PICKER_ORDER[field].length;
    const wantNumerals = Array.from({ length: max }, (_, i) => String(max - i)).join("");
    const info = await pickerInfo();
    console.log(`${prefix} plane picker: ${JSON.stringify(info)}`);
    if (info.numerals !== wantNumerals || info.selected !== String(start) || info.highlights !== 1
        || info.caption !== field.toUpperCase() || !info.captionRotate || !info.rightOfGrid) {
      console.error(`FAIL: ${label} plane picker should show ${wantNumerals} with ${start} highlighted and a rotated ${field.toUpperCase()} caption, right of the grid`);
      exitCode = 1;
    }
    const upTo = Math.min(start + 1, max);
    await page.locator(`${pickerSel} [data-arrow="up"]`).click();
    await checkState(`${prefix} after plane picker up`, { ...expected, [field]: upTo });
    await page.locator(`${pickerSel} [data-arrow="down"]`).click();
    await checkState(`${prefix} after plane picker down`, { ...expected, [field]: upTo - 1 });
    await page.locator(`${pickerSel} [data-value="1"]`).click();
    await checkState(`${prefix} after plane picker numeral 1`, { ...expected, [field]: 1 });
    if ((await pickerInfo()).selected !== "1") {
      console.error(`FAIL: ${label} plane picker should highlight 1 after clicking it`);
      exitCode = 1;
    }
    if ((await subtitleInfo()).text !== `${planeName} 1`) {
      console.error(`FAIL: ${label} subtitle should read "${planeName} 1" after picking plane 1`);
      exitCode = 1;
    }
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-plane-1.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-plane-1.png`)}`);
    await page.locator(`${pickerSel} [data-value="${start}"]`).click();
    await checkState(`${prefix} after plane picker back to ${start}`, expected);

    // In Iso view mode, Front's row lines tilt TILT_DEGREES (20) up to the
    // right (counterclockwise) and Side's down to the right (clockwise),
    // while column lines stay vertical; Top doesn't change. The title stays
    // above the grid, the plane picker right of it, the pieces all drawn,
    // and a click still selects. Basic puts the square grid back.
    const gridShape = () => page.evaluate((prefix) => {
      const pts = document.querySelector(`#${prefix}-checkers polygon`).getAttribute("points")
        .split(" ").map((p) => p.split(",").map(Number));
      const deg = ([x0, y0], [x1, y1]) => Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      return {
        rowLine: deg(pts[0], pts[1]), colLineDx: pts[3][0] - pts[0][0],
        titleBottom: box(`${prefix}-subtitle`).bottom, gridTop: box(`${prefix}-checkers`).top,
        gridRight: box(`${prefix}-checkers`).right, pickerLeft: box(`${prefix}-plane-picker`).left,
        pieces: document.querySelectorAll(`#${prefix}-pieces > g`).length,
      };
    }, prefix);
    const wantTilt = { front: -20, side: 20, top: 0 }[prefix];
    await page.locator('#view-mode-picker [data-value="iso"]').click();
    const iso = await gridShape();
    console.log(`${prefix} iso: row line ${iso.rowLine.toFixed(2)} deg (want ${wantTilt}), column line dx ${iso.colLineDx.toFixed(2)}; subtitle bottom ${iso.titleBottom.toFixed(1)}, grid top ${iso.gridTop.toFixed(1)}; grid right ${iso.gridRight.toFixed(1)}, picker left ${iso.pickerLeft.toFixed(1)}; ${iso.pieces} pieces`);
    if (Math.abs(iso.rowLine - wantTilt) > 0.01 || Math.abs(iso.colLineDx) > 0.01 || !(iso.titleBottom <= iso.gridTop)
        || !(iso.gridRight < iso.pickerLeft) || iso.pieces !== pieces) {
      console.error(`FAIL: ${label} in Iso should tilt its row lines ${wantTilt} deg with vertical column lines, title above and plane picker right of the grid, all ${pieces} pieces drawn`);
      exitCode = 1;
    }
    await page.screenshot({ path: path.join(outDir, `screenshot-${prefix}-iso.png`) });
    console.log(`screenshot: ${path.join(outDir, `screenshot-${prefix}-iso.png`)}`);
    await clickSquare(prefix, cols, clickAt.col, clickAt.row);
    await checkState(`${prefix} iso after clicking square ${clickAt.col},${clickAt.row}`, { ...expected, ...clickAt.cell });
    await clickSquare(prefix, cols, carriedAt.col, carriedAt.row);
    await checkState(`${prefix} iso after clicking the carried cell`, expected);
    await page.locator('#view-mode-picker [data-value="basic"]').click();
    const basic = await gridShape();
    if (Math.abs(basic.rowLine) > 0.01 || Math.abs(basic.colLineDx) > 0.01) {
      console.error(`FAIL: ${label} back in Basic should draw a square grid`);
      exitCode = 1;
    }
  }

  await viewRows.nth(0).click();
  const displayCube = await sceneDisplay();
  console.log(`display after re-selecting cube: ${JSON.stringify(displayCube)}`);
  if (!showsOnly(displayCube, "cube")) {
    console.error("FAIL: re-selecting Cube View did not restore the cube");
    exitCode = 1;
  }
  await checkState("cube after switching", { ...CUBE_INIT, ...CARRIED, show3dDiagonals: true });
  const cubeTitle = await shownTitles();
  console.log(`cube: titles shown ${JSON.stringify(cubeTitle.shown)}; title bottom ${cubeTitle.bottom?.toFixed(1)}, cube top ${cubeTitle.gridTop?.toFixed(1)}`);
  if (JSON.stringify(cubeTitle.shown) !== JSON.stringify(["Cube View"]) || !(cubeTitle.bottom <= cubeTitle.gridTop)) {
    console.error("FAIL: Cube View should show only its title, above the cube");
    exitCode = 1;
  }
  const diagDisplayCube = await page.locator("#diag-squares").getAttribute("display");
  if (diagDisplayCube !== "inline") {
    console.error("FAIL: diag overlay should stay shown after switching to cube-view");
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
