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

const boardPositions: GameboardState = [];

export const resetGameState = (): void => {
  boardPositions.length = 0;
};

export const placeGamePiece = (type: PieceType, color: PieceColor, location: Location): void => {
  boardPositions.push({ type, color, location });
};

export const removeGamePiece = (piece: ChessPiece): void => {
  const idx = boardPositions.indexOf(piece);
  if (idx !== -1) boardPositions.splice(idx, 1);
};

export const getBoardPositions = (): Readonly<GameboardState> => boardPositions;

const buildExample1 = (): void => {
  placeGamePiece('K', 'white', { level: 1, rank: 1, file: 2 });
  placeGamePiece('K', 'white', { level: 5, rank: 6, file: 4 });
  placeGamePiece('K', 'black', { level: 4, rank: 1, file: 4 });
  placeGamePiece('K', 'black', { level: 5, rank: 4, file: 3 });
  placeGamePiece('Q', 'white', { level: 3, rank: 5, file: 1 });
  placeGamePiece('Q', 'white', { level: 5, rank: 2, file: 5 });
  placeGamePiece('Q', 'black', { level: 3, rank: 2, file: 1 });
  placeGamePiece('Q', 'black', { level: 5, rank: 3, file: 5 });
  placeGamePiece('E', 'white', { level: 5, rank: 1, file: 3 });
  placeGamePiece('E', 'white', { level: 1, rank: 6, file: 1 });
  placeGamePiece('E', 'black', { level: 4, rank: 2, file: 1 });
  placeGamePiece('E', 'black', { level: 3, rank: 4, file: 1 });
  placeGamePiece('B', 'white', { level: 4, rank: 6, file: 1 });
  placeGamePiece('B', 'white', { level: 5, rank: 8, file: 3 });
  placeGamePiece('B', 'black', { level: 5, rank: 5, file: 1 });
  placeGamePiece('B', 'black', { level: 5, rank: 8, file: 5 });
  placeGamePiece('T', 'white', { level: 5, rank: 3, file: 1 });
  placeGamePiece('T', 'white', { level: 2, rank: 7, file: 1 });
  placeGamePiece('T', 'black', { level: 1, rank: 4, file: 1 });
  placeGamePiece('T', 'black', { level: 5, rank: 7, file: 3 });
  placeGamePiece('R', 'white', { level: 5, rank: 3, file: 3 });
  placeGamePiece('R', 'white', { level: 5, rank: 6, file: 5 });
  placeGamePiece('R', 'black', { level: 4, rank: 5, file: 1 });
  placeGamePiece('R', 'black', { level: 5, rank: 5, file: 5 });
  placeGamePiece('P', 'white', { level: 1, rank: 5, file: 1 });
  placeGamePiece('P', 'white', { level: 4, rank: 1, file: 3 });
  placeGamePiece('P', 'black', { level: 1, rank: 2, file: 1 });
  placeGamePiece('P', 'black', { level: 2, rank: 1, file: 4 });
  placeGamePiece('N', 'white', { level: 3, rank: 8, file: 1 });
  placeGamePiece('N', 'white', { level: 2, rank: 4, file: 1 });
  placeGamePiece('N', 'black', { level: 1, rank: 1, file: 4 });
  placeGamePiece('N', 'black', { level: 5, rank: 7, file: 1 });
  placeGamePiece('Z', 'white', { level: 3, rank: 1, file: 2 });
  placeGamePiece('Z', 'white', { level: 5, rank: 5, file: 3 });
  placeGamePiece('Z', 'black', { level: 1, rank: 8, file: 1 });
  placeGamePiece('Z', 'black', { level: 4, rank: 8, file: 1 });
};

export const initGameState = (): void => {
  buildExample1();
};
