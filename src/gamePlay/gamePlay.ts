import type { ChessPiece, Location } from '../gameState/gameState.ts';

export type LegalMovesList = {
  emptyCells: Location[];
  captures: ChessPiece[];
};
