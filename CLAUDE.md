# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chess 321 is a 3-D chess variant played on a 5x5x8 board (5 levels × 8 ranks × 5 files), drawn as an isometric SVG scene in the browser. The game rules (board geometry, cell coloring, diagonal types, piece moves) are in `docs/rules.md`. Besides the traditional pieces, the game adds three new ones: Eagle (`E`), Triton (`T`) and Zebra (`Z`).

Right now the app is only a visualization: it draws the board and pieces, with widgets for choosing the view and focus cell. Move computation is in progress in `src/gamePlay/` and isn't wired into the UI yet.

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
- **Display state** is in `src/display/displayState.ts`: the view, perspective, focus `level`/`rank`/`file` (the selected cell), `show3dDiagonals`, `viewMode` (`'basic' | 'iso' | 'isoX'`; Iso tilts the Front and Side slice views, and Iso-X isn't offered yet) and `cellVisibility`. It's a private object, read and written only through the getters and setters. `changeView(view)` resets every field to that view's entry in `initDisplayStates` but keeps the selected cell, `show3dDiagonals` and `viewMode`. A setter changes only its own field. Add a cross-field rule only when the user asks for that specific rule.

Widgets and the scene talk through events:

- Each widget in `src/display/widgets/` is an SVG `<g>` builder. It returns `{ el, minX, maxX, minY, maxY, ... }` so its caller can lay it out and merge bounds. When the user changes a value, it fires a bubbling `display-change` CustomEvent `{ field, value }` (`emitDisplayChange` in `widgetChrome.ts`). Widgets never call displayState setters themselves.
- `src/display/scene.ts` is the scene controller. It builds the views, the "not implemented" placeholder (for `front-black`/`side-black`) and the controls (including the cell indicator cube, `widgets/cellIndicatorCube.ts`), and fits the viewBox. The widgets sit in one column right of the views, all centered on the same vertical line (`buildControls`): the cell display at the top, the view selector, view mode picker (`widgets/viewModePicker.ts`) and 3-D diagonals toggle in a row halfway down, the cell indicator cube at the bottom. A full-height separator line (`#widget-separator`, `buildSeparatorLine` in `widgetChrome.ts`, styled like the widget panel outlines) runs between the views and the column. Its `onDisplayChange` listener on `#scene` calls the matching displayState setter, then `refreshDisplay()` takes one `getDisplayState()` snapshot and re-syncs the views and the widgets from it.
- Each view is built by its own module and returned as a `ViewController` (`src/display/viewController.ts`: `{ el, refresh(state) }`). The view keeps its elements private in a closure; the scene only appends `el`, shows or hides it, and calls `refresh(state)` on every view (hidden ones too) after each change. Views read display state only from the `state` passed in, never from the displayState getters.
  - `src/display/drawCube/drawCube.ts` draws only the cube view (checkers clipped to each level's visible chevron, diagonal overlay squares, frame). `buildCubeView` also returns `bbox` and `drawPieces()` (the cube's pieces are drawn once, after game state is set up). Cube view has no click-to-select.
  - `src/display/drawSlice/drawSlice.ts` draws the flat slice views (Front = one rank, Top = one level, Side = one file), configured by `SLICE_VIEWS`. Clicking a slice-view square selects its cell: the square fires `display-change` for `level`, `rank` and `file`, like a widget; the pieces, diag squares and frame drawn over it have `pointer-events: none`. Each slice view also has a plane picker child widget to the right of its grid (`widgets/planePicker.ts`: numerals max..1 between up/down arrows, rotated caption) for the coordinate a click can't change (Front: rank, Top: level, Side: file). In the Iso view mode, Front and Side draw their columns along `isoColStep` (as on the matching cube face): row lines tilt `TILT_DEGREES` (Front counterclockwise, Side clockwise) and column lines stay vertical; Top is unchanged. `layout(mode)` places the squares (polygons), frame and title, and `refresh` reruns it when `viewMode` changes.
  - Every view has a title above it ("Cube View", "Front View", ...; `buildViewTitle` in `widgets/widgetChrome.ts`); the cube's is placed by `scene.ts`, outside the cube group. Each slice view also has a subtitle under its title naming the plane shown ("Rank 1", "Level 5", "File 1"; `buildViewSubtitle`), updated on refresh.

Other modules:

- `src/gamePlay/gamePlay.ts` holds move computation. It defines `LegalMovesList` (`emptyCells: Location[]`, `captures: ChessPiece[]`). The private `getCandidateMoves(piece)` switches on `piece.type` and dispatches to per-piece functions (moves by movement rules alone). The exported `getLegalMoves(piece)` filters those through `leavesKingInCheck`, which checks the board as it would be after the move (`afterMove`, without changing game state) with `isAttacked`. That covers moving into check, pins and answering a check. `isAttacked` looks outward from a cell using the `ATTACKERS` table plus the pawn capture rule, and `isInCheck(color)` is exported. Shared helpers: `expandSigns` builds offset tables from the rules.md ± formulas (`ORTHOGONAL`, `DIAGONAL_2D`, `DIAGONAL_3D`, `ALL_DIRECTIONS` combining all 26, `KNIGHT`, `ZEBRA`), `onBoard`, `addTarget` (applies the capture rule to one cell), `slideMoves` (for sliding pieces) and `stepMoves` (one try per offset, for one-step and leaping pieces). All nine pieces are implemented; the pawn has its own `getPawnMoves` (forward moves and captures differ), sharing `PAWN_CAPTURES`/`pawnForward` with `isAttacked`. En passant, promotion, castling, checkmate and stalemate are not done yet.
- `src/display/drawOrder.ts` defines `ViewName` and a back-to-front ordering for each view. SVG has no z-index, so DOM append order decides which icons are drawn in front.
- `src/display/cellVisibility.ts` turns a DisplayState snapshot into a classifier that marks each cell `hidden`, `visible` or `highlighted`, using one rule per `CellVisibilityOption`.
- `src/display/render/` holds shared constants (`PITCH`, `TILT_DEGREES`, the green/red/blue palette for level/rank/file), helpers for creating SVG elements, and the piece icon SVGs (plus `renderPieceIcon`). It also holds `isoProjection.ts` (the isometric projection math: `projectCenter`, level perimeters, visible chevrons, cell footprints), `cellColors.ts` (checker, frame and diagonal-set colors, `perimeterStroke`, `isDarkCell`, `diagForCell`, diag square sizes) and `bounds.ts` (the `Bounds` type, `extendBounds`, `mergeBounds`), shared by the views and the scene.

Coordinates: level 1 is the bottom, rank 1 is the front (White's side), and file 1 is on the left as seen from the front. Each is 1-based.

Typing: most display and widget modules start with `// @ts-nocheck`. The strictly typed modules are `gameState.ts`, `gamePlay.ts`, `displayState.ts`, `drawOrder.ts`, `cellVisibility.ts`, `constants.ts`, `isoProjection.ts`, `cellColors.ts`, `bounds.ts`, `pieceIcons.ts` and `viewController.ts`. Keep new code in them typed.

`info/` (sketches, screenshots, icon sources, snippets) and `vite-conversion/` are reference material and aren't part of the build.
