import type { ChessPiece, Location } from '../gameState/gameState.ts';

export type LegalMovesList = {
  emptyCells: Location[];
  captures: ChessPiece[];
};

export function getLegalMoves(piece: ChessPiece): LegalMovesList {
  switch (piece.type) {
    case 'K':
      return { emptyCells: [], captures: [] };
    case 'Q':
      return { emptyCells: [], captures: [] };
    case 'E':
      return { emptyCells: [], captures: [] };
    case 'R':
      return { emptyCells: [], captures: [] };
    case 'B':
      return { emptyCells: [], captures: [] };
    case 'T':
      return { emptyCells: [], captures: [] };
    case 'N':
      return { emptyCells: [], captures: [] };
    case 'Z':
      return { emptyCells: [], captures: [] };
    case 'P':
      return { emptyCells: [], captures: [] };
  }
}
