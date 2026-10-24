export type PieceType = 'K' | 'Q' | 'E' | 'R' | 'B' | 'T' | 'N' | 'Z' | 'P';

// Full name of each piece type. E, T and Z are new pieces for this 3D
// game, not from traditional chess.
export const PIECE_NAMES: Record<PieceType, string> = {
  K: 'King', Q: 'Queen', E: 'Eagle', R: 'Rook', B: 'Bishop',
  T: 'Triton', N: 'Knight', Z: 'Zebra', P: 'Pawn',
};
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

// Index of occupied cells, keyed by cellKey(location); kept in sync with
// boardPositions by placeGamePiece / removeGamePiece / resetGameState.
const piecesByCell = new Map<string, ChessPiece>();

const cellKey = ({ level, rank, file }: Location): string => `${level},${rank},${file}`;

export const resetGameState = (): void => {
  boardPositions.length = 0;
  piecesByCell.clear();
};

export const placeGamePiece = (type: PieceType, color: PieceColor, location: Location): void => {
  const piece: ChessPiece = { type, color, location };
  boardPositions.push(piece);
  piecesByCell.set(cellKey(location), piece);
};

export const removeGamePiece = (piece: ChessPiece): void => {
  const idx = boardPositions.indexOf(piece);
  if (idx !== -1) boardPositions.splice(idx, 1);
  if (piece.location && piecesByCell.get(cellKey(piece.location)) === piece) {
    piecesByCell.delete(cellKey(piece.location));
  }
};

export const getBoardPositions = (): Readonly<GameboardState> => boardPositions;

export const pieceAt = (location: Location): ChessPiece | undefined =>
  piecesByCell.get(cellKey(location));

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
  placeGamePiece('N', 'white', { level: 3, rank: 8, file: 1 });
  placeGamePiece('N', 'white', { level: 2, rank: 4, file: 1 });
  placeGamePiece('N', 'black', { level: 1, rank: 1, file: 4 });
  placeGamePiece('N', 'black', { level: 5, rank: 7, file: 1 });
  placeGamePiece('Z', 'white', { level: 3, rank: 1, file: 2 });
  placeGamePiece('Z', 'white', { level: 5, rank: 5, file: 3 });
  placeGamePiece('Z', 'black', { level: 1, rank: 8, file: 1 });
  placeGamePiece('Z', 'black', { level: 4, rank: 8, file: 1 });
  placeGamePiece('R', 'white', { level: 5, rank: 3, file: 3 });
  placeGamePiece('R', 'white', { level: 5, rank: 6, file: 5 });
  placeGamePiece('R', 'black', { level: 4, rank: 5, file: 1 });
  placeGamePiece('R', 'black', { level: 5, rank: 5, file: 5 });
  placeGamePiece('P', 'white', { level: 1, rank: 5, file: 1 });
  placeGamePiece('P', 'white', { level: 4, rank: 1, file: 3 });
  placeGamePiece('P', 'black', { level: 1, rank: 2, file: 1 });
  placeGamePiece('P', 'black', { level: 2, rank: 1, file: 4 });
};


const initPostions = (): void => {

  // White Pieces
  placeGamePiece('K', 'white', { level: 3, rank: 1, file: 3 });
  placeGamePiece('Q', 'white', { level: 4, rank: 1, file: 1 });
  placeGamePiece('Q', 'white', { level: 2, rank: 1, file: 5 });
  placeGamePiece('E', 'white', { level: 5, rank: 1, file: 4 });
  placeGamePiece('E', 'white', { level: 1, rank: 1, file: 2 });
  placeGamePiece('B', 'white', { level: 5, rank: 1, file: 2 });
  placeGamePiece('B', 'white', { level: 4, rank: 1, file: 4 });
  placeGamePiece('B', 'white', { level: 3, rank: 1, file: 1 });
  placeGamePiece('B', 'white', { level: 2, rank: 1, file: 3 });
  placeGamePiece('T', 'white', { level: 4, rank: 1, file: 2 });
  placeGamePiece('T', 'white', { level: 3, rank: 1, file: 4 });
  placeGamePiece('T', 'white', { level: 2, rank: 1, file: 1 });
  placeGamePiece('T', 'white', { level: 1, rank: 1, file: 3 });
  placeGamePiece('N', 'white', { level: 5, rank: 1, file: 3 });
  placeGamePiece('N', 'white', { level: 4, rank: 1, file: 5 });
  placeGamePiece('N', 'white', { level: 3, rank: 1, file: 2 });
  placeGamePiece('N', 'white', { level: 2, rank: 1, file: 4 });
  placeGamePiece('Z', 'white', { level: 4, rank: 1, file: 3 });
  placeGamePiece('Z', 'white', { level: 3, rank: 1, file: 5 });
  placeGamePiece('Z', 'white', { level: 2, rank: 1, file: 2 });
  placeGamePiece('Z', 'white', { level: 1, rank: 1, file: 4 });
  placeGamePiece('R', 'white', { level: 5, rank: 1, file: 1 });
  placeGamePiece('R', 'white', { level: 5, rank: 1, file: 5 });
  placeGamePiece('R', 'white', { level: 1, rank: 1, file: 1 });
  placeGamePiece('R', 'white', { level: 1, rank: 1, file: 5 });
  
  // White Pawns
  placeGamePiece('P', 'white', { level: 1, rank: 2, file: 1 });
  placeGamePiece('P', 'white', { level: 1, rank: 2, file: 2 });
  placeGamePiece('P', 'white', { level: 1, rank: 2, file: 3 });
  placeGamePiece('P', 'white', { level: 1, rank: 2, file: 4 });
  placeGamePiece('P', 'white', { level: 1, rank: 2, file: 5 });
  placeGamePiece('P', 'white', { level: 2, rank: 2, file: 1 });
  placeGamePiece('P', 'white', { level: 2, rank: 2, file: 2 });
  placeGamePiece('P', 'white', { level: 2, rank: 2, file: 3 });
  placeGamePiece('P', 'white', { level: 2, rank: 2, file: 4 });
  placeGamePiece('P', 'white', { level: 2, rank: 2, file: 5 });
  placeGamePiece('P', 'white', { level: 3, rank: 2, file: 1 });
  placeGamePiece('P', 'white', { level: 3, rank: 2, file: 2 });
  placeGamePiece('P', 'white', { level: 3, rank: 2, file: 3 });
  placeGamePiece('P', 'white', { level: 3, rank: 2, file: 4 });
  placeGamePiece('P', 'white', { level: 3, rank: 2, file: 5 });
  placeGamePiece('P', 'white', { level: 4, rank: 2, file: 1 });
  placeGamePiece('P', 'white', { level: 4, rank: 2, file: 2 });
  placeGamePiece('P', 'white', { level: 4, rank: 2, file: 3 });
  placeGamePiece('P', 'white', { level: 4, rank: 2, file: 4 });
  placeGamePiece('P', 'white', { level: 4, rank: 2, file: 5 });
  placeGamePiece('P', 'white', { level: 5, rank: 2, file: 1 });
  placeGamePiece('P', 'white', { level: 5, rank: 2, file: 2 });
  placeGamePiece('P', 'white', { level: 5, rank: 2, file: 3 });
  placeGamePiece('P', 'white', { level: 5, rank: 2, file: 4 });
  placeGamePiece('P', 'white', { level: 5, rank: 2, file: 5 });
  
  // Black Pieces
  placeGamePiece('K', 'black', { level: 3, rank: 8, file: 3 });
  placeGamePiece('Q', 'black', { level: 4, rank: 8, file: 1 });
  placeGamePiece('Q', 'black', { level: 2, rank: 8, file: 5 });
  placeGamePiece('E', 'black', { level: 5, rank: 8, file: 4 });
  placeGamePiece('E', 'black', { level: 1, rank: 8, file: 2 });
  placeGamePiece('B', 'black', { level: 5, rank: 8, file: 2 });
  placeGamePiece('B', 'black', { level: 4, rank: 8, file: 4 });
  placeGamePiece('B', 'black', { level: 3, rank: 8, file: 1 });
  placeGamePiece('B', 'black', { level: 2, rank: 8, file: 3 });
  placeGamePiece('T', 'black', { level: 4, rank: 8, file: 2 });
  placeGamePiece('T', 'black', { level: 3, rank: 8, file: 4 });
  placeGamePiece('T', 'black', { level: 2, rank: 8, file: 1 });
  placeGamePiece('T', 'black', { level: 1, rank: 8, file: 3 });
  placeGamePiece('N', 'black', { level: 5, rank: 8, file: 3 });
  placeGamePiece('N', 'black', { level: 4, rank: 8, file: 5 });
  placeGamePiece('N', 'black', { level: 3, rank: 8, file: 2 });
  placeGamePiece('N', 'black', { level: 2, rank: 8, file: 4 });
  placeGamePiece('Z', 'black', { level: 4, rank: 8, file: 3 });
  placeGamePiece('Z', 'black', { level: 3, rank: 8, file: 5 });
  placeGamePiece('Z', 'black', { level: 2, rank: 8, file: 2 });
  placeGamePiece('Z', 'black', { level: 1, rank: 8, file: 4 });
  placeGamePiece('R', 'black', { level: 5, rank: 8, file: 1 });
  placeGamePiece('R', 'black', { level: 5, rank: 8, file: 5 });
  placeGamePiece('R', 'black', { level: 1, rank: 8, file: 1 });
  placeGamePiece('R', 'black', { level: 1, rank: 8, file: 5 });
  
  // Black Pawns
  placeGamePiece('P', 'black', { level: 1, rank: 7, file: 1 });
  placeGamePiece('P', 'black', { level: 1, rank: 7, file: 2 });
  placeGamePiece('P', 'black', { level: 1, rank: 7, file: 3 });
  placeGamePiece('P', 'black', { level: 1, rank: 7, file: 4 });
  placeGamePiece('P', 'black', { level: 1, rank: 7, file: 5 });
  placeGamePiece('P', 'black', { level: 2, rank: 7, file: 1 });
  placeGamePiece('P', 'black', { level: 2, rank: 7, file: 2 });
  placeGamePiece('P', 'black', { level: 2, rank: 7, file: 3 });
  placeGamePiece('P', 'black', { level: 2, rank: 7, file: 4 });
  placeGamePiece('P', 'black', { level: 2, rank: 7, file: 5 });
  placeGamePiece('P', 'black', { level: 3, rank: 7, file: 1 });
  placeGamePiece('P', 'black', { level: 3, rank: 7, file: 2 });
  placeGamePiece('P', 'black', { level: 3, rank: 7, file: 3 });
  placeGamePiece('P', 'black', { level: 3, rank: 7, file: 4 });
  placeGamePiece('P', 'black', { level: 3, rank: 7, file: 5 });
  placeGamePiece('P', 'black', { level: 4, rank: 7, file: 1 });
  placeGamePiece('P', 'black', { level: 4, rank: 7, file: 2 });
  placeGamePiece('P', 'black', { level: 4, rank: 7, file: 3 });
  placeGamePiece('P', 'black', { level: 4, rank: 7, file: 4 });
  placeGamePiece('P', 'black', { level: 4, rank: 7, file: 5 });
  placeGamePiece('P', 'black', { level: 5, rank: 7, file: 1 });
  placeGamePiece('P', 'black', { level: 5, rank: 7, file: 2 });
  placeGamePiece('P', 'black', { level: 5, rank: 7, file: 3 });
  placeGamePiece('P', 'black', { level: 5, rank: 7, file: 4 });
  placeGamePiece('P', 'black', { level: 5, rank: 7, file: 5 });
};


export const initGameState = (): void => {
  // buildExample1();
  initPostions();
};
