export type PieceType = 'K' | 'Q' | 'E' | 'R' | 'B' | 'T' | 'N' | 'Z' | 'P';
export type PieceColor = 'white' | 'black';

export interface Location {
  level: number; // 1..5
  rank: number;  // 1..8
  file: number;  // 1..5
}

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  location: Location | null;
}

export type GameboardState = ChessPiece[];

let boardPositions: GameboardState = [];

export const placeGamePiece = (type: PieceType, color: PieceColor, location: Location): void => {
  boardPositions.push({ type, color, location });
};

export const removeGamePiece = (piece: ChessPiece): void => {
  const idx = boardPositions.indexOf(piece);
  if (idx !== -1) boardPositions.splice(idx, 1);
};

export const getBoardPositions = (): Readonly<GameboardState> => boardPositions;
