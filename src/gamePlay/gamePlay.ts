import {
  pieceAt, LEVEL_MAX, RANK_MAX, FILE_MAX,
  type ChessPiece, type Location,
} from '../gameState/gameState.ts';

export type LegalMovesList = {
  emptyCells: Location[];
  captures: ChessPiece[];
};

export function getLegalMoves(piece: ChessPiece): LegalMovesList {
  switch (piece.type) {
    case 'K':
      return getKingMoves();
    case 'Q':
      return getQueenMoves();
    case 'E':
      return getEagleMoves();
    case 'R':
      return getRookMoves(piece);
    case 'B':
      return getBishopMoves();
    case 'T':
      return getTritonMoves();
    case 'N':
      return getKnightMoves();
    case 'Z':
      return getZebraMoves();
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

// ---- Per-piece move functions ----

function getKingMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getQueenMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getEagleMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getRookMoves(piece: ChessPiece): LegalMovesList {
  return slideMoves(piece, ORTHOGONAL);
}

function getBishopMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getTritonMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getKnightMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getZebraMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}

function getPawnMoves(): LegalMovesList {
  return { emptyCells: [], captures: [] };
}
