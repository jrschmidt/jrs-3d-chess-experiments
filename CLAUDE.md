# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chess 321 is a 3-D chess variant played on a 5x5x8 board (5 levels × 8 ranks × 5 files), drawn as an isometric SVG scene in the browser. The game rules (board geometry, cell coloring, diagonal types, piece moves) are in `docs/rules.md`. Besides the traditional pieces, the game adds three new ones: Eagle (`E`), Triton (`T`) and Zebra (`Z`).

Right now the app is only a visualization: it draws the board and pieces, with widgets for choosing the view and focus cell. Move logic hasn't been written yet.

## Commands

```bash
npm install
npm run dev       # Vite dev server (does not type-check)
npm run build     # tsc && vite build -> dist/
npm run preview   # serve dist/
```

The project has no test suite and no linter. `tsc` doubles as the linter: `noUnusedLocals`/`noUnusedParameters` are on, so an unused declaration (TS6133) fails the build.

To check that a change renders and the widgets still work, use the project skill `run-clc-26-004` (`.claude/skills/run-clc-26-004/`). It runs a Playwright driver (`node .claude/skills/run-clc-26-004/driver.mjs [outDir]`) that starts Vite on port 8123, clicks through every widget and view, takes screenshots, and exits non-zero on failed checks or console errors. When you change widget behavior or layout, update the driver's assertions and the SKILL.md description too.

## Architecture

The entry point is `index.html` (a single `<svg id="scene">`), which loads `src/main.ts` and then `src/app.ts`. `app.ts` calls `buildScene()`, `initGameState()` and `renderPieceIcons()`.

There are two kinds of state, and they live in separate places:

- **Gameplay state** is in `src/gameState/gameState.ts`: the list of pieces, plus a `piecesByCell` index keyed `"level,rank,file"`, kept in sync by `placeGamePiece`/`removeGamePiece`/`resetGameState`. Look pieces up with `pieceAt(location)`. It also defines the board size, `LEVEL_MAX`/`RANK_MAX`/`FILE_MAX`. This directory holds gameplay state only; render and UI state never goes here.
- **Display state** is in `src/display/displayState.ts`: the view, perspective, focus `level`/`rank`/`file` (the selected cell), `show3dDiagonals` and `cellVisibility`. It's a private object, read and written only through the getters and setters. `changeView(view)` resets every field to that view's entry in `initDisplayStates` but keeps the selected cell. A setter changes only its own field. Add a cross-field rule only when the user asks for that specific rule.

Widgets and the scene talk through events:

- Each widget in `src/display/widgets/` is an SVG `<g>` builder. It returns `{ el, minX, maxX, minY, maxY, ... }` so its caller can lay it out and merge bounds. When the user changes a value, it fires a bubbling `display-change` CustomEvent `{ field, value }` (`emitDisplayChange` in `widgetChrome.ts`). Widgets never call displayState setters themselves.
- `src/display/drawCube/drawCube.ts` is the scene controller, and the largest file. It builds the cube (checkers, diagonal overlay squares, frame), the flat slice views (Front = one rank, Top = one level, Side = one file), the "not implemented" placeholder and the controls. It also places the cell display in the top-right corner, re-placing it on resize, and shrinks the cube so the two don't overlap. Its `onDisplayChange` listener on `#scene` calls the matching displayState setter, then `refreshDisplay()` re-syncs the scene and the widgets from displayState.

Other modules:

- `src/gamePlay/gamePlay.ts` holds move computation. So far it defines `LegalMovesList` (`emptyCells: Location[]`, `captures: ChessPiece[]`) and `getLegalMoves(piece)`, which switches on `piece.type` and dispatches to per-piece functions. Shared helpers: `expandSigns` builds offset tables from the rules.md ± formulas (`ORTHOGONAL`, `DIAGONAL_2D`, `DIAGONAL_3D`, and `ALL_DIRECTIONS` combining all 26), `onBoard`, `addTarget` (applies the capture rule to one cell), `slideMoves` (for sliding pieces) and `stepMoves` (one try per offset, for one-step and leaping pieces). The sliding pieces (rook, bishop, triton, queen) and the eagle are implemented; king, knight, zebra and pawn are stubs that return empty lists.
- `src/display/drawOrder.ts` defines `ViewName` and a back-to-front ordering for each view. SVG has no z-index, so DOM append order decides which icons are drawn in front.
- `src/display/cellVisibility.ts` turns a DisplayState snapshot into a classifier that marks each cell `hidden`, `visible` or `highlighted`, using one rule per `CellVisibilityOption`.
- `src/display/render/` holds shared constants (`PITCH`, `TILT_DEGREES`, the green/red/blue palette for level/rank/file), helpers for creating SVG elements, and the piece icon SVGs.

Coordinates: level 1 is the bottom, rank 1 is the front (White's side), and file 1 is on the left as seen from the front. Each is 1-based.

Typing: most display and widget modules start with `// @ts-nocheck`. The strictly typed modules are `gameState.ts`, `gamePlay.ts`, `displayState.ts`, `drawOrder.ts`, `cellVisibility.ts` and `constants.ts`. Keep new code in them typed.

`info/` (sketches, screenshots, icon sources, snippets) and `vite-conversion/` are reference material and aren't part of the build.
