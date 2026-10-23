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
3. Clicks the focus-level widget's up arrow and confirms the LEVEL numeral
   advances (`1 -> 2`); screenshots `screenshot-level2.png`.
4. Confirms the diagonal overlay (`#diag-squares`) starts hidden, clicks the
   diag toggle, confirms it shows, and prints its distinct stroke colors;
   screenshots `screenshot-diag-on.png`.
5. Clicks "Front View" in the view-option widget and confirms the caption's
   red `#view-label` reads "Front View", only the `#front-view` group (rank 1
   seen straight on) is shown, and no widget (or the caption) moved. Checks
   it has 25 cells and 25 piece icons, and that its icons are the same
   on-screen size as the cube's; screenshots `screenshot-front-view.png`.
   Confirms the switch reset
   displayState (read from `#display-state-debug`) to front-white's initial
   state and that the LEVEL numeral and diag toggle show it. Toggles the
   diagonals on, confirming `#front-diag-squares` shows 25 squares in the
   cube overlay's colors (screenshots `screenshot-front-diag-on.png`), then
   off again. Steps the level
   up and clicks "Top View" (no initial state), confirming only `view`
   changed and only the `#not-implemented` placeholder is shown. Then clicks
   "Cube View" and confirms only `#cube` is shown and state/widgets reset to
   cube-view's initial state.
6. Prints any browser console/page errors and exits non-zero if there were
   any, or if any check above failed.
7. Kills its own server on exit (success, failure, or Ctrl-C).

`outDir` defaults to the skill directory itself (screenshots there are
gitignored); pass a path — e.g. the session scratchpad — to write them
elsewhere.

Sample output from a real run:

```
focus level: 1 -> 2
diag overlay display (before toggle): none
diag overlay display (after toggle): inline
diag square colors (hex): #1953ff | #b300b3 | #b34100 | #178217
view label: Cube View -> Front View; display {"cube":"none","front-view":"inline","not-implemented":"none"}
widgets unmoved: true
front view: 25 cells, 25 pieces; icon size cube 44.1x44.1, front 44.1x44.1
front after reset: state {"view":"front-white",...,"level":3,...}; widgets level 3, diag OFF
front diag overlay: none -> inline; 25 squares; colors #1953ff | #b300b3 | #178217 | #b34100
top (no initial state): state {"view":"top-view",...,"level":4,...}; widgets level 4, diag OFF
top view display: {"cube":"none","front-view":"none","not-implemented":"inline"}
view label after re-selecting cube: Cube View; display {"cube":"inline","front-view":"none","not-implemented":"none"}
cube after reset: state {"view":"cube-view",...,"level":1,...}; widgets level 1, diag OFF
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
  - `#level-focus-widget`: first match is "up", second is "down".
  - `#diag-toggle`: a single match.
  - `#view-option`: one per row, in order Cube, Front, Top, Side.
- **The caption is HTML, not SVG.** `#caption` in `index.html` holds the
  static text plus `#view-label` and the debug readout. The SVG's `#cube`,
  `#front-view` and `#not-implemented` groups, by contrast, are toggled via their
  `display` attribute.
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
