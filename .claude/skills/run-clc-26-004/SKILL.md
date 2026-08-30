---
name: run-clc-26-004
description: Build, run, and drive the clc-26-004 "5x5x8 Cube" isometric SVG visualization (index.html + app.js, no build step). Use when asked to start, serve, run, screenshot, or interact with this app, or to verify a change to app.js/index.html actually renders.
---

This is a plain static site (`index.html` loads `app.js`, no build step, no
`package.json` for the app itself). Drive it with the Playwright driver at
`.claude/skills/run-clc-26-004/driver.mjs` — it serves the site, launches
headless Chromium, screenshots the scene, clicks the focus-level widget, and
reports console errors. All paths below are relative to the repo root
(`clc-26-004/`).

## Prerequisites

Node.js and `python3` (used only as a static file server — any static server
works, but the driver shells out to `python3 -m http.server`). Both were
already present in this container; nothing extra needed via `apt-get`.

## Setup

The driver has its own `package.json` (Playwright) scoped inside the skill
directory, kept separate from the app so the app itself stays dependency-free.
Install once:

```bash
cd .claude/skills/run-clc-26-004 && npm install
```

Playwright's Chromium binary was already cached at
`~/Library/Caches/ms-playwright` in this container; if it's missing, run
`npx playwright install chromium` after `npm install`.

## Build

No build step — `index.html` and `app.js` are served as-is.

## Run (agent path)

```bash
node .claude/skills/run-clc-26-004/driver.mjs [outDir]
```

Run from the repo root (or anywhere — paths inside the driver are resolved
relative to the driver script itself, not the CWD). It:

1. Starts `python3 -m http.server 8123` at the repo root and polls until
   `http://localhost:8123/index.html` responds.
2. Launches headless Chromium, navigates, waits for `#scene polygon` to
   exist, and screenshots to `<outDir>/screenshot.png`.
3. Clicks the focus-level widget's up arrow (the first
   `#focus-widget rect[style*="cursor: pointer"]`) and confirms the LEVEL
   numeral advances (e.g. `1 -> 2`), then takes a second screenshot,
   `<outDir>/screenshot-level2.png`.
4. Prints the distinct `(r,g,b)` stroke colors found on `#diag-squares
   polygon` elements — useful for confirming diagonal-marking colors after a
   change to `DIAG_COLORS` in `app.js`.
5. Prints any browser console/page errors and exits non-zero if there were
   any, or if the focus-level click didn't change the numeral.
6. Kills its own server on exit (success, failure, or Ctrl-C).

`outDir` defaults to the skill directory itself
(`.claude/skills/run-clc-26-004/`); pass a path to write screenshots
elsewhere.

Sample output from a real run in this container:

```
screenshot: .../screenshot.png
focus level: 1 -> 2
screenshot: .../screenshot-level2.png
diag square colors (r,g,b): 51,51,204 | 204,51,204 | 51,204,51 | 204,102,51
no console errors
```

## Run (human path)

```bash
python3 -m http.server 8123   # from repo root
```

Then open `http://localhost:8123/index.html` in a browser. `Ctrl-C` to stop.
Only useful for a human with a display — the agent path above is what to use
in a headless container.

## Test

No test suite exists in this repo.

---

## Gotchas

- **The focus-level up/down hit-targets have no id/class.** They're
  `<rect>` elements with `fill: rgba(255,255,255,0.001)` (nearly invisible,
  intentionally) and `style="cursor: pointer"` — that inline style is the
  only reliable selector. The "up" button is the first match inside
  `#focus-widget`, "down" the second (`buildFocusWidget` in `app.js` wires
  up before down).
- **Don't `npm install` at the repo root.** The app itself has no
  `package.json` and is meant to stay dependency-free; the driver's
  `package.json`/`node_modules` are scoped inside the skill directory on
  purpose (both are gitignored) and resolve fine regardless of the caller's
  CWD, since Node resolves `require`/`import` relative to the requiring
  file's directory, not the process CWD.
- **Port 8123 can be left occupied by a previous killed run.** The driver
  kills its own child server on exit (including SIGINT), but if a stray
  server is already bound, free it first: `lsof -ti:8123 -sTCP:LISTEN |
  xargs -r kill`.

## Troubleshooting

- **`Error: browserType.launch: Executable doesn't exist ...`**: Playwright's
  Chromium isn't downloaded. Run `npx playwright install chromium` from
  `.claude/skills/run-clc-26-004/`.
- **Driver hangs at "server did not come up"**: something else is already
  listening on port 8123 but not serving `index.html` (e.g. a different
  app). Free the port (see Gotchas) and rerun.
