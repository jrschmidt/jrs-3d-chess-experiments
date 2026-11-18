import {
  pieceAt, getBoardPositions, LEVEL_MAX, RANK_MAX, FILE_MAX,
  type ChessPiece, type Location, type PieceType, type PieceColor,
} from '../gameState/gameState.ts';

export type LegalMovesList = {
  emptyCells: Location[];
  captures: ChessPiece[];
};

// Legal moves: the piece's candidate moves, minus any that would leave its
// own king attacked (moving into check, ignoring a check, or breaking a pin).
export function getLegalMoves(piece: ChessPiece): LegalMovesList {
  const moves = getCandidateMoves(piece);
  return {
    emptyCells: moves.emptyCells.filter((cell) => !leavesKingInCheck(piece, cell)),
    captures: moves.captures.filter((target) => !leavesKingInCheck(piece, target.location!)),
  };
}

export function isInCheck(color: PieceColor): boolean {
  const king = kingLocation(color);
  return king !== null && isAttacked(king, opponent(color));
}

// Moves by the piece's movement rules alone, ignoring check.
function getCandidateMoves(piece: ChessPiece): LegalMovesList {
  switch (piece.type) {
    case 'K':
      return getKingMoves(piece);
    case 'Q':
      return getQueenMoves(piece);
    case 'E':
      return getEagleMoves(piece);
    case 'R':
      return getRookMoves(piece);
    case 'B':
      return getBishopMoves(piece);
    case 'T':
      return getTritonMoves(piece);
    case 'N':
      return getKnightMoves(piece);
    case 'Z':
      return getZebraMoves(piece);
    case 'P':
      return getPawnMoves();
  }
}

// ---- Shared move helpers (see docs/rules.md, "Computing moves in different directions") ----

type Offset = readonly [number, number, number]; // (level, rank, file) change

// Each pattern stands for every sign combination of its non-zero entries,
// matching the ± formulas in docs/rules.md: [1, 1, 0] → 4 offsets, [1, 1, 1] → 8.
function expandSigns(patterns: readonly Offset[]): Offset[] {
  const result: Offset[] = [];
  for (const pattern of patterns) {
    let variants: number[][] = [[]];
    for (const v of pattern) {
      const signs = v === 0 ? [0] : [v, -v];
      variants = variants.flatMap((prefix) => signs.map((s) => [...prefix, s]));
    }
    for (const [l, r, f] of variants) result.push([l, r, f]);
  }
  return result;
}

// Orthogonal: (±n, ±0, ±0) (±0, ±n, ±0) (±0, ±0, ±n)
const ORTHOGONAL = expandSigns([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);

// 2-d diagonal: (±n, ±n, ±0) (±n, ±0, ±n) (±0, ±n, ±n) → 12 directions
const DIAGONAL_2D = expandSigns([[1, 1, 0], [1, 0, 1], [0, 1, 1]]);

// 3-d diagonal: (±n, ±n, ±n) → 8 directions
const DIAGONAL_3D = expandSigns([[1, 1, 1]]);

// Orthogonal + 2-d diagonal + 3-d diagonal → all 26 directions
const ALL_DIRECTIONS = [...ORTHOGONAL, ...DIAGONAL_2D, ...DIAGONAL_3D];

// Knight: (±2, ±1, ±0) (±1, ±2, ±0) (±2, ±0, ±1) (±0, ±2, ±1) (±1, ±0, ±2) (±0, ±1, ±2) → 24 jumps
const KNIGHT = expandSigns([[2, 1, 0], [1, 2, 0], [2, 0, 1], [0, 2, 1], [1, 0, 2], [0, 1, 2]]);

// Zebra: (±2, ±1, ±1) (±1, ±2, ±1) (±1, ±1, ±2) → 24 jumps
const ZEBRA = expandSigns([[2, 1, 1], [1, 2, 1], [1, 1, 2]]);

function onBoard({ level, rank, file }: Location): boolean {
  return level >= 1 && level <= LEVEL_MAX
      && rank >= 1 && rank <= RANK_MAX
      && file >= 1 && file <= FILE_MAX;
}

// Applies the "Capturing" rule to one target cell. Returns true only when the
// cell was empty, i.e. a sliding piece may keep going past it.
function addTarget(result: LegalMovesList, piece: ChessPiece, target: Location): boolean {
  const occupant = pieceAt(target);
  if (!occupant) {
    result.emptyCells.push(target);
    return true;
  }
  if (occupant.color !== piece.color) result.captures.push(occupant);
  return false;
}

// Slides along each offset, n = 1, 2, 3, …, until the board edge or the
// first occupied cell.
function slideMoves(piece: ChessPiece, offsets: readonly Offset[]): LegalMovesList {
  const result: LegalMovesList = { emptyCells: [], captures: [] };
  const from = piece.location;
  if (!from) return result;
  for (const [dl, dr, df] of offsets) {
    for (let n = 1; ; n++) {
      const target = { level: from.level + n * dl, rank: from.rank + n * dr, file: from.file + n * df };
      if (!onBoard(target) || !addTarget(result, piece, target)) break;
    }
  }
  return result;
}

// Tries each offset once (n = 1 only). Used for the one-step pieces (king,
// eagle) and the leapers (knight, zebra): nothing in between blocks the move.
function stepMoves(piece: ChessPiece, offsets: readonly Offset[]): LegalMovesList {
  const result: LegalMovesList = { emptyCells: [], captures: [] };
  const from = piece.location;
  if (!from) return result;
  for (const [dl, dr, df] of offsets) {
    const target = { level: from.level + dl, rank: from.rank + dr, file: from.file + df };
    if (onBoard(target)) addTarget(result, piece, target);
  }
  return result;
}

// ---- Check ----

type Occupancy = (cell: Location) => ChessPiece | undefined;

const sameCell = (a: Location, b: Location): boolean =>
  a.level === b.level && a.rank === b.rank && a.file === b.file;

const opponent = (c: PieceColor): PieceColor => (c === 'white' ? 'black' : 'white');

// The board as it would be after `piece` moves to `to`, without changing game
// state. Whatever stood on `to` is captured, and the cell it left is empty.
function afterMove(piece: ChessPiece, to: Location): Occupancy {
  const from = piece.location!;
  return (cell) => (sameCell(cell, to) ? piece : sameCell(cell, from) ? undefined : pieceAt(cell));
}

// Which enemy pieces attack along which offsets. isAttacked looks outward from
// the cell, so it never generates enemy moves (no recursion).
const ATTACKERS: { offsets: readonly Offset[]; slide: boolean; types: PieceType[] }[] = [
  { offsets: ORTHOGONAL,     slide: true,  types: ['R', 'Q'] },
  { offsets: DIAGONAL_2D,    slide: true,  types: ['B', 'Q'] },
  { offsets: DIAGONAL_3D,    slide: true,  types: ['T', 'Q'] },
  { offsets: ALL_DIRECTIONS, slide: false, types: ['K', 'E'] },
  { offsets: KNIGHT,         slide: false, types: ['N'] },
  { offsets: ZEBRA,          slide: false, types: ['Z'] },
];

function isAttacked(cell: Location, byColor: PieceColor, at: Occupancy = pieceAt): boolean {
  for (const { offsets, slide, types } of ATTACKERS) {
    for (const [dl, dr, df] of offsets) {
      for (let n = 1; ; n++) {
        const loc = { level: cell.level + n * dl, rank: cell.rank + n * dr, file: cell.file + n * df };
        if (!onBoard(loc)) break;
        const p = at(loc);
        if (p) {
          if (p.color === byColor && types.includes(p.type)) return true;
          break;
        }
        if (!slide) break;
      }
    }
  }
  // A pawn captures one rank forward plus one step in file or level, so it
  // attacks from one rank behind the cell (from its own side's point of view).
  const behind = byColor === 'white' ? -1 : 1;
  for (const [dl, df] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const loc = { level: cell.level + dl, rank: cell.rank + behind, file: cell.file + df };
    const p = onBoard(loc) ? at(loc) : undefined;
    if (p && p.color === byColor && p.type === 'P') return true;
  }
  return false;
}

function kingLocation(color: PieceColor): Location | null {
  return getBoardPositions().find((p) => p.type === 'K' && p.color === color)?.location ?? null;
}

// True if moving `piece` to `to` would leave its own king attacked.
function leavesKingInCheck(piece: ChessPiece, to: Location): boolean {
  const king = piece.type === 'K' ? to : kingLocation(piece.color);
  if (!king) return false; // no king on the board (e.g. test positions)
  return isAttacked(king, opponent(piece.color), afterMove(piece, to));
}

// ---- Per-piece move functions ----

function getKingMoves(piece: ChessPiece): LegalMovesList {
  return stepMoves(piece, ALL_DIRECTIONS); // check is applied in getLegalMoves
}

function getQueenMoves(piece: ChessPiece): LegalMovesList {
  return slideMoves(piece, ALL_DIRECTIONS);
}

function getEagleMoves(piece: ChessPiece): LegalMovesList {
  return stepMoves(piece, ALL_DIRECTIONS);
}

function getRookMoves(piece: ChessPiece): LegalMovesList {
  return slideMoves(piece, ORTHOGONAL);
}

function getBishopMoves(piece: ChessPiece): LegalMovesList {
  return slideMoves(piece, DIAGONAL_2D);
}

function getTritonMoves(piece: ChessPiece): LegalMovesList {
  return slideMoves(piece, DIAGONAL_3D);
}

function getKnightMoves(piece: ChessPiece): LegalMovesList {
  return stepMoves(piece, KNIGHT);
}

function getZebraMoves(piece: ChessPiece): LegalMovesList {
  return stepMoves(piece, ZEBRA);
}

function getPawnMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}
