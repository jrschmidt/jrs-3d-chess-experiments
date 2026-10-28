---
name: run-clc-26-004
description: Build, run, and drive the x3d-chess app (formerly clc-26-004, the "5x5x8 Cube" isometric SVG visualization; Vite + TypeScript, sources under src/). Use when asked to start, serve, run, screenshot, or interact with this app, or to verify a change to src/ or index.html actually renders.
---

The app is a Vite + TypeScript project: `index.html` loads `src/main.ts`,
which imports `src/app.ts` (scene in `src/display/`, widgets in
`src/display/widgets/`, game state in `src/gameState/`). Drive it with the
Playwright driver at `.claude/skills/run-clc-26-004/driver.mjs` — it starts
the Vite dev server, launches headless Chromium, screenshots the scene,
exercises each widget, and reports console errors. All paths below are
relative to the repo root (`x3d-chess/`).

## Prerequisites

Node.js. Install the app's dependencies (Vite, TypeScript) at the repo root
once:

```bash
npm install
```

The driver has its own `package.json` (Playwright) scoped inside the skill
directory, kept separate from the app's. Install once:

```bash
cd .claude/skills/run-clc-26-004 && npm install
```

If Playwright's Chromium isn't cached (`~/Library/Caches/ms-playwright`),
run `npx playwright install chromium` from the skill directory.

## Build

```bash
npm run build   # tsc && vite build -> dist/
```

`tsc` is strict about unused declarations (TS6133), so a build can fail on
code unrelated to the change being checked. The dev server (below) does not
type-check, so the driver still runs in that case.

## Run (agent path)

```bash
node .claude/skills/run-clc-26-004/driver.mjs [outDir]
```

Paths inside the driver are resolved relative to the driver script, not the
CWD. It:

1. Starts `node_modules/.bin/vite --port 8123 --strictPort` at the repo root
   and polls until `http://localhost:8123/` responds.
2. Launches headless Chromium, waits for `#checkers polygon`, and
   screenshots to `<outDir>/screenshot.png`.
3. Clicks level 2 in the cell picker (`#cell-picker`, bottom right) and
   confirms the highlighted LEVEL numeral moves (`1 -> 2`); screenshots
   `screenshot-level2.png`.
4. Confirms the diagonal overlay (`#diag-squares`) starts hidden, clicks the
   diag toggle, confirms it shows, and prints its distinct stroke colors;
   screenshots `screenshot-diag-on.png`.
5. Clicks rank 5 and file 2 in the cell picker, confirming its highlights
   show only `rank` (4 -> 5) and `file` (1 -> 2) changed, then file 1.
   Checks the cell display (`#cell-display`, top right) shows the focus
   cell: first an empty cell with its diag color, then, after clicking rank
   8, the black Triton at 2,8,1 (screenshots `screenshot-cell-black.png`).
   Confirms the cell picker is right of the cube and below the diag toggle,
   the diag toggle is centered halfway down the page and right-aligned with
   the cell picker, and the view-option widget sits just left of it, centered on the
   same height.
6. For each slice view (Front, Top, Side, in that order): clicks level 4
   in the cell picker, then clicks the view in the view-option widget. Confirms only its
   group (`#front-view`, `#top-view`, `#side-view`) is shown and no widget
   moved. Checks
   its cell and piece counts (Front 25/25, Top 40/20, Side 40/20), and that
   its icons match the other flat views' size. In Front it also checks
   that the cube's icons are no larger than that (the cube shrinks only if
   it has to clear the cell display). It checks that the cell display sits one front cell in
   from the page's top-right corner, clear of the cube and every widget,
   and that it shows the white King at 3,1,3, plus its diag color once
   diagonals are on. Confirms the cell picker's LEVEL, RANK and FILE
   highlights and the diag toggle show the view's initial state (displayState isn't shown on the
   page, so the widgets are the check). Screenshots
   `screenshot-<front|top|side>-view.png`. Then toggles the diagonals on,
   confirming `#<front|top|side>-diag-squares` shows one square per cell in
   the cube overlay's colors (screenshots `screenshot-<view>-diag-on.png`),
   and off again. Finally clicks "Cube View" and confirms only `#cube` is
   shown and the widgets reset to cube-view's initial state.
   `#not-implemented` (front-black, side-black) can't be reached from the
   view widget, so it's only checked to be hidden.
7. Prints any browser console/page errors and exits non-zero if there were
   any, or if any check above failed.
8. Kills its own server on exit (success, failure, or Ctrl-C).

`outDir` defaults to the skill directory itself (screenshots there are
gitignored); pass a path — e.g. the session scratchpad — to write them
elsewhere.

Sample output from a real run:

```
focus level: 1 -> 2
diag overlay display (before toggle): none
diag overlay display (after toggle): inline
diag square colors (hex): #1953ff | #b300b3 | #b34100 | #178217
rank 5, file 2: widgets level 2, rank 5, file 2, diag ON
file 1: widgets level 2, rank 5, file 1, diag ON
cell display (black Triton at 2,8,1): {"coords":"2, 8, 1",...,"color":"BLACK","letter":"T #000000","name":"Triton","icon":true,...}
cell picker: left 996.6 (cube right 981.3), top 573.3 (diag toggle bottom 538.2)
diag toggle: center y 500.3 (page 500), right 1354.1 (cell picker 1353.7)
view option: gap to diag toggle 15.3, center y 500.0 (diag toggle 500.3)
front: display {"cube":"none","front-view":"inline","side-view":"none","top-view":"none","not-implemented":"none"}
front: 25 cells, 25 pieces; icon size cube 41.6x41.6, front 41.6x41.6; widgets unmoved: true
cube/flat icon size ratio: 1.000
cell display: top 76.6, right margin 76.6 (front cell 76.6); left 1016.8 vs cube right 982.3; overlaps []
front after reset: widgets level 3, rank 1, file 3, diag OFF
front diag overlay: none -> inline; 25 squares; colors #1953ff | #b300b3 | #178217 | #b34100
top: ... (40 cells, 20 pieces; level 5)
side: ... (40 cells, 20 pieces; level 3)
display after re-selecting cube: {"cube":"inline",...}
cube after reset: widgets level 1, rank 4, file 1, diag OFF
no console errors
```

(`screenshot: ...` lines omitted.) When adding a new widget, add a matching
check to the driver.

## Run (human path)

```bash
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173/`). Vite
hot-reloads on save. `Ctrl-C` to stop.

## Test

No test suite exists in this repo.

---

## Gotchas

- **Widget hit-targets have no id/class.** They're `<rect>` elements with
  `fill: rgba(255,255,255,0.001)` (nearly invisible, intentionally) and
  `style="cursor: pointer"` — that inline style is the only reliable
  selector, scoped by the widget's group id:
  - `#cell-picker-level`, `#cell-picker-rank`, `#cell-picker-file`: one
    per numeral, in drawn order (level 5..1, rank 8..1, file 1..5). The
    selected numeral's `<text>` has `opacity="1"`, the others `0.6`.
  - `#diag-toggle`: a single match.
  - `#view-option`: one per row, in order Cube, Front, Top, Side.
- **The view groups are toggled via `display`.** The SVG's view groups
  (`#cube`, `#front-view`, `#top-view`, `#side-view`, `#not-implemented`)
  are shown and hidden through their `display` attribute; there's no
  on-page view label or displayState readout.
- **Spawn the vite binary directly, not `npx vite`/`npm run dev`.** The
  driver kills its child on exit; with an npm/npx wrapper in between, the
  actual server can survive and keep the port.
- **Port 8123 can be left occupied by a previous killed run.** If a stray
  server is bound, `--strictPort` makes Vite fail rather than pick another
  port. Free it first: `lsof -ti:8123 -sTCP:LISTEN | xargs -r kill`.

## Troubleshooting

- **`Error: browserType.launch: Executable doesn't exist ...`**: Playwright's
  Chromium isn't downloaded. Run `npx playwright install chromium` from
  `.claude/skills/run-clc-26-004/`.
- **`spawn .../node_modules/.bin/vite ENOENT`**: the app's dependencies
  aren't installed; run `npm install` at the repo root.
- **Driver hangs at "server did not come up"**: port 8123 is taken (see
  Gotchas) or Vite failed to start; run `npx vite --port 8123 --strictPort`
  by hand to see its error.
