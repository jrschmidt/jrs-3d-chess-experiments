---
name: run-clc-26-004
description: Build, run, and drive the Chess 321 app (formerly x3d-chess and clc-26-004, the "5x5x8 Cube" isometric SVG visualization; Vite + TypeScript, sources under src/). Use when asked to start, serve, run, screenshot, or interact with this app, or to verify a change to src/ or index.html actually renders.
---

The app is a Vite + TypeScript project: `index.html` loads `src/main.ts`,
which imports `src/app.ts` (scene in `src/display/`, widgets in
`src/display/widgets/`, game state in `src/gameState/`). Drive it with the
Playwright driver at `.claude/skills/run-clc-26-004/driver.mjs` — it starts
the Vite dev server, launches headless Chromium, screenshots the scene,
exercises each widget, and reports console errors. All paths below are
relative to the repo root (`chess-321/`).

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
3. Clicks level 2 in the cell indicator cube (`#cell-indicator-cube`, bottom right) and
   confirms the highlighted LEVEL numeral moves (`1 -> 2`). Confirms the
   indicator cube's highlight counts at cells 2,4,1, then 5,4,1 (picks level
   5) and 2,4,2 (picks level 2, file 2), then picks file 1 again: the
   selected level's squares in green (`#339933` / `#336633`), rank's in red
   (`#993333` / `#663333`), file's in blue (`#333399` / `#333366`), squares
   on two of them in `#999933` (level+rank), `#339999` (level+file) or
   `#993399` (rank+file), and the selected cell, when on the surface, in
   `#ff8000`; screenshots `screenshot-level2.png`.
4. Confirms the diagonal overlay (`#diag-squares`) starts hidden, clicks the
   diag toggle, confirms it shows, and prints its distinct stroke colors;
   screenshots `screenshot-diag-on.png`.
5. Clicks rank 5 and file 2 in the cell indicator cube, confirming its highlights
   show only `rank` (4 -> 5) and `file` (1 -> 2) changed, then file 1.
   Checks the cell display (`#cell-display`, top of the widget column) shows the focus
   cell: first an empty cell with its diag color, then, after clicking rank
   8, the black Triton at 2,8,1 (screenshots `screenshot-cell-black.png`).
   Confirms the widgets form one column, all centered on the same vertical
   line: the cell display at the top, the view-option widget + view mode
   picker + diag toggle row (diag toggle halfway down the page) in the middle, the cell indicator
   cube at the bottom, none overlapping; that the view-option widget sits
   just left of the view mode picker, centered on the diag toggle's height;
   that the view mode picker (`#view-mode-picker`) sits just left of the
   diag toggle at the same height, is captioned "View Mode", offers Basic and Iso (Iso-X is
   commented out) with Basic selected, and that clicking Iso
   (`[data-value="iso"]`) highlights it without changing the view or moving
   a widget (screenshot `screenshot-view-mode-iso.png`), that Iso stays
   selected after switching to Front View and back to Cube View (the view
   mode carries over on a view change), then clicks Basic
   to put it back; and that the
   separator line (`#widget-separator`, panel-outline stroke
   `rgba(255,255,255,0.25)`, width 1) runs the page's height between the
   cube and the widget column.
6. For each slice view (Front, Top, Side, in that order): clicks the view
   in the view-option widget, carrying in the cell picked in step 5 (the
   black Triton at 2,8,1, with diagonals on). Confirms only its group
   (`#front-view`, `#top-view`, `#side-view`) is shown and no widget moved.
   Checks its cell and piece counts for the carried plane (Front rank 8:
   25/25, Top level 2: 40/20, Side file 1: 40/20), and that its icons match
   the other flat views' size, and that its grid and plane picker are left
   of the separator line. In Front it also checks that the cube's
   icons are no larger than that, and that the cell display
   still shows the Triton at 2,8,1 and its diag color (diagonals carry
   over). Confirms the cell indicator cube still highlights 2/8/1 and the diag
   toggle is still ON (the cell and the diagonals carry over; the other
   fields reset to the view's initial state; displayState isn't shown on the
   page, so the widgets are the check). Screenshots `screenshot-<front|top|side>-view.png`. Each
   view shows the plane at its own field (Front: rank, Top: level, Side:
   file), so it then picks that field one step over and back, confirming
   the first square's checker color flips and returns and the piece count
   returns; in Front it also picks rank 3 (an empty rank), confirming no
   pieces are drawn (screenshots `screenshot-front-rank3.png`). Then confirms
   `#<front|top|side>-diag-squares` is already shown, one square per cell
   in the cube overlay's colors (screenshots `screenshot-<view>-diag-on.png`),
   then toggles the diagonals off (hidden) and back on (shown). Then clicks one square
   in the view (Front 4,3 → cell 3,8,4; Top 2,7 → 2,7,2; Side 3,4 →
   4,6,1), confirming the cell indicator cube and cell display show that cell,
   the plane and view are unchanged (screenshots
   `screenshot-<view>-clicked.png`), and clicks the 2,8,1 square (under a
   piece icon, so the click must pass through it) to put the cell back.
   Confirms the view's title (`#<front|top|side>-title`, "Front View" etc.)
   is the only title shown and sits above the grid, and that the subtitle
   under it (`#<view>-subtitle`, "Rank 1" / "Level 5" / "File 1") names the
   plane shown and sits between title and grid. Then checks the plane
   picker right of the grid (`#<view>-plane-picker`): numerals max..1 top
   to bottom with the current plane highlighted and a caption (RANK / LEVEL
   / FILE) rotated 90 degrees; clicks its up arrow, down arrow
   (`[data-arrow]`) and numeral 1 (`[data-value]`), confirming the field
   follows and the subtitle updates (screenshots
   `screenshot-<view>-plane-1.png`), then clicks the
   starting numeral to restore it. Then picks Iso in the view mode picker
   and checks the grid (`#<view>-checkers polygon` points): Front's row
   lines tilt -20 degrees on screen (up to the right, counterclockwise),
   Side's +20 (clockwise), Top's stay level, and column lines stay
   vertical; the subtitle is still above the grid, the plane picker right
   of it, and every piece drawn (screenshots `screenshot-<view>-iso.png`).
   Clicks a square and the carried cell's square again to confirm clicks
   still select in Iso, then picks Basic and confirms the grid is square
   again. Finally clicks "Cube
   View" and confirms only `#cube` is shown, the cell is still 2,8,1, the
   diagonals are still on, and only `#cube-title` ("Cube View") is shown, above
   the cube.
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
indicator cube highlights at 2,4,1: L 4, R 4, F 39, LR 0, LF 8, RF 5, LRF 1
indicator cube highlights at 5,4,1: L 32, R 0, F 32, LR 4, LF 15, RF 4, LRF 2
indicator cube highlights at 2,4,2: L 11, R 8, F 11, LR 1, LF 1, RF 1, LRF 0
diag overlay display (before toggle): none
diag overlay display (after toggle): inline
diag square colors (hex): #1953ff | #b300b3 | #b34100 | #178217
rank 5, file 2: widgets level 2, rank 5, file 2, diag ON
file 1: widgets level 2, rank 5, file 1, diag ON
cell display (black Triton at 2,8,1): {"coords":"2, 8, 1",...,"color":"BLACK","letter":"T #000000","name":"Triton","icon":true,...}
widget column: centers cell display 1180.2, row 1180.2, indicator cube 1180.1; diag toggle center y 500.2 (page 500); overlaps []
separator: {"x":982.8,"top":101.1,"bottom":898.9,"stroke":"rgba(255,255,255,0.25)","width":"1","cubeRight":960.3}; widget column left 1005.3
view option: gap to view mode picker 15.0, center y 500.0 (diag toggle 500.2)
view mode picker: {"caption":"View Mode","options":"Basic,Iso","selected":"Basic","gap":15.0,"centerY":500.0,"diagCenterY":500.2}
view mode iso: selected Iso; cube shown true; widgets unmoved true
view mode after view changes: front Iso, cube Iso
front: display {"cube":"none","front-view":"inline","side-view":"none","top-view":"none","not-implemented":"none"}
front: separator x 982.8, grid/plane picker right 772.1
front: 25 cells, 25 pieces; icon size cube 41.6x41.6, front 41.6x41.6; widgets unmoved: true
cube/flat icon size ratio: 1.000
cell display (front: black Triton at 2,8,1, carried): {"coords":"2, 8, 1",...,"name":"Triton","icon":true,"diag":null}
front after switching: widgets level 2, rank 8, file 1, diag OFF
front plane (rank): fill #808080 -> #333333 -> #808080; pieces 25 -> 25 (rank 3: 0) -> 25
front diag overlay: none -> inline; 25 squares; colors #b34100 | #178217 | #b300b3 | #1953ff
front iso: row line -20.00 deg (want -20), column line dx 0.00; subtitle bottom 238.6, grid top 248.6; grid right 678.7, picker left 712.4; 25 pieces
front iso after clicking square 4,3: widgets level 3, rank 8, file 4, diag ON
front iso after clicking the carried cell: widgets level 2, rank 8, file 1, diag ON
top: ... (40 cells, 20 pieces; level 2)
side: ... (40 cells, 20 pieces; file 1)
display after re-selecting cube: {"cube":"inline",...}
cube after switching: widgets level 2, rank 8, file 1, diag OFF
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
  - `#cell-indicator-cube-level`, `#cell-indicator-cube-rank`, `#cell-indicator-cube-file`: one
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
