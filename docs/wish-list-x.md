# Wish List — Reference Findings (wish-list-x.md)

Claude found these items by examining the project on 2026-11-18. They are raw material for `wish-list.md`, so pick, reword or drop them as you like. Each item notes where it was found.

---

## 1. Game rules not yet decided
*Source: the "Open Questions" section of `docs/rules.md`*

- **Castling:** whether it exists, and how it works in 3-D.
- **Draw by repetition:** for example, threefold repetition.
- **50-move rule:** a draw after N moves with no capture and no pawn move.
- **Insufficient material:** which combinations of pieces can't force checkmate. This is new ground with the eagle, triton and zebra.
- **Move notation** (new): `rules.md` has no way to write down a move, such as `R(1,1,1)-(1,5,1)` or `Rx…`. You need one before you can have a move list, saved games or a game record.
- **3-d diagonal colour formula** (new): `rules.md` says "the code … can give clues". The rule itself is short and could be written into the doc: `diagForCell` in `src/display/drawCube/drawCube.ts` compares whether rank and file have the same odd/even parity as level.

## 2. Move rules that are written down but not built
*Source: `src/gamePlay/gamePlay.ts`, `CLAUDE.md`*

- **En passant:** this needs the opponent's last move. Its capture also lands on an empty cell, not on the captured pawn, and `LegalMovesList` can't express that yet.
- **Promotion:** moves onto the last rank are listed, but nothing asks which piece to promote to or applies the choice.
- **Checkmate and stalemate:** `isInCheck(color)` exists, but nothing yet checks whether a side has any legal move left.
- **Castling:** once it is decided (see section 1).

## 3. Playing a game (engine)
*Source: nothing in `src/` makes a move yet. `getLegalMoves` and `isInCheck` are not called anywhere outside `gamePlay.ts`.*

- **Make a move**, for example `makeMove(piece, to)`. It would:
  - update `gameState`
  - remove a captured piece
  - handle promotion and en passant
  - record the move
- **Whose turn it is:** a side-to-move field in gameplay state.
- **Move history:** needed for en passant, undo, the repetition and 50-move rules, and a game record.
- **Undo and redo.**
- **Game-over detection:** checkmate, stalemate, and the draw rules once they're decided.
- **New game / reset:** `initGameState()` now clears the board first, so it can be reused for this.
- **Save and load a position or game:** a FEN-like text format for a 5x5x8 board.
- **Optional:** a clock or timer.

## 4. User interface
*Source: `src/display/`, `drawCube.ts`, `displayState.ts`, `cellVisibility.ts`*

- **Selecting and moving pieces:** click a piece, show its legal moves, then click a target cell.
- **Highlighting legal moves and captures:** `cellVisibility.ts` already has a `'highlighted'` mode that nothing uses yet.
- **Showing check, checkmate, stalemate and draws:** for example, highlight the king or show a status line.
- **A turn indicator** (white or black to move).
- **Captured pieces display** and **a move list panel.**
- **A promotion picker:** choose from queen, eagle, rook, bishop, triton, knight or zebra.
- **The `front-black` and `side-black` views:** these still show the "THIS VIEW / NOT IMPLEMENTED" placeholder.
- **Perspective:** `displayState.perspective` (all / white / black) is set, but nothing reads it (`getPerspective` is never called).
- **Cell visibility rules:** only `'all'` exists (`CellVisibilityOption = 'all'`), and `cellClassifierFor` is never called. Ideas include:
  - show only the focused slice
  - hide the cells that block the view
  - show only a piece's legal moves
- **Unused visibility rule:** `drawCube.ts:265` has `isVisibleCell` ("Placeholder visibility rule — subject to change"), and it isn't used.
- **A "New game" button.**

## 5. Code health
*Source: `npx tsc --noEmit`, file headers, `package.json`*

- **Fix the two build errors**, which currently fail `npm run build`:
  - `src/display/cellVisibility.ts:21`: the rule key `'all-visible'` doesn't match the type `CellVisibilityOption = 'all'`.
  - `src/gameState/gameState.ts:65`: `buildExample1` is declared but never used. Remove it, or keep it behind a debug switch.
- **Remove `// @ts-nocheck` and add types** in these 12 modules:
  - `app.ts`
  - `drawCube.ts`
  - `render/svg.ts`
  - every widget in `src/display/widgets/`
- **Add a real test suite**, such as Vitest. The move tests written so far live only in a temporary scratchpad and are lost when it is cleared. They cover rook, bishop, triton, queen, eagle, knight, zebra, king/check and pawn, and could become permanent tests in `src/gamePlay/`.
- **Typo:** `initPostions` should be `initPositions` (`gameState.ts`).
- **Unused code:** `isVisibleCell`, `cellClassifierFor`, `getPerspective` and `getCellVisibility` are never called. Remove them or start using them.
- **Optional linter or formatter**, such as ESLint or Prettier. Right now `tsc` is the only check.

## 6. Bigger ideas (optional)
- **A computer opponent:** even a simple one, such as random moves or one-move lookahead, would use `getLegalMoves` directly.
- **Two-player play** on one screen, or online.
- **A tutorial or piece-move demo:** pick a piece type and see every cell it can reach from a chosen cell. Most of what this needs is already built.
- **Export a screenshot** of the board, or of a game record.
