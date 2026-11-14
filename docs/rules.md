# **Chess 321** 3-D Chess
# Piece Moves and Game Rules

## The Game Board
Chess 321 is played on a 5x5x8 3-dimensional board, also called the grid or cube. The three dimensions are called "level", "rank" and "file". There are five levels (1-5), eight ranks (1-8) and five files (1-5). The eight ranks, each consisting of a 5x5 grid, are intended to be an analog of the eight ranks on a traditional two dimensional chessboard, with opposing white and black pieces on the first and eighth ranks and pawns on the second and seventh ranks.

The individual positions on this three-dimensional grid, corresponding to "squares" in two-dimensional chess, are called "cells".

## Geometry of the gameboard

### Orthogonal movement
Orthogonal piece movements are the easiest to generalize to three dimensions. The rule is simple. An orthogonal move is made when just one of the three dimensions change, and the value of the other two dimensions remains unchanged.

### Two-dimensional diagonal movement.
A two-dimensional diagonal move is a change in one dimension, in conjunction with a corresponding change in a second dimension of the same length, in either a positive or negative direction, while the third dimension remains unchanged.

On a traditional chessboard, the squares are colored in a "checkerboard" pattern, with alternating darker and lighter colors called "black" and "white". In Chess 321, this convention is extrapolated into three dimensions, so that the cell above a black cell will be white, and the cell above a white cell will be black. Thus, a bishop on a white cell, which can only move diagonally, will always remain on white cells, while a bishop on a black cell will be restricted to black cells, whether that movement takes place on a horizontal plane or a vertical plane.

### Three-dimensional diagonal movement.
A three-dimensional diagonal move is defined by a change of equal length in all three dimensions.

Just as two-dimensional diagonal movement divides the squares of the chessboard into two separate sets, and a diagonal move will always leave you on a cell of the same color, three dimensional diagonal movement divides the cells into four sets, and a piece that can only move in three-dimensional diagonals will always be constricted to the same set of cells.

In Chess 321, we have been using the convention that the cell with (level, rank, file) coordinates of (1,1,1) is designated as being a member of the "blue" set of three-dimensionally diagonal cells. (1,1,2) is "purple", (1,2,1) is "orange", and (1,2,2) is "green". The code for drawing the four 3-d diagonal colors can give clues about algorithms for computing which set of 3-d diagonals any given cell is in.

### Capturing
A piece captures by moving onto a cell occupied by an opposing piece, which is removed from the board. A piece can never move onto a cell occupied by one of its own pieces.

## The Pieces and Their Moves

There are nine pieces in Chess 321. Three new pieces are introduced, the eagle, triton and zebra. For each side, white and black, there are 25 pieces and 25 pawns.

1 King
2 Queens
2 Eagles
4 Rooks
4 Bishops
4 Tritons
4 Knights
4 Zebras
25 Pawns

### King
The king (symbol "K") moves one cell in any orthogonal, 2-d diagonal or 3-d diagonal direction. Standard rules for check, checkmate and stalemate apply.

I am considering several options for castling, or perhaps leaving it out altogether.

### Queen
The queen (symbol "Q") moves any number of unobstructed cells in any orthogonal, 2-d diagonal or 3-d diagonal direction.

### Eagle
The eagle (symbol "E") moves the same as a king, one space in any orthogonal, 2-d diagonal or 3-d diagonal direction, but can be captured or left in check like a normal piece.

### Rook
The rook (symbol "R") moves any number of unobstructed cells in any orthogonal direction.

### Bishop
The bishop (symbol "B") moves any number of unobstructed cells in any 2-d diagonal direction.

### Triton
The triton (symbol "T") moves any number of unobstructed cells in any 3-d diagonal direction.

### Knight
The knight (symbol "N") moves like a traditional knight, leaping two cells in one dimension and one cell in a second dimension, without movement in the third dimension.

### Zebra
The move of the zebra (symbol "Z") is a three dimensional analog of the traditional knight move, leaping two cells in one dimension, one cell in a second dimension,  and one cell in the remaining third dimension.

### Pawn
The pawns (symbol "P") move in a three dimensional analog of traditional pawns on a two-dimensional chessboard. A pawn moves forward only. Pawns can move one cell straight forward if the cell is empty, or capture with a two-dimensionally diagonal move left, right, up or down. That is, a pawn captures by moving one rank forward together with one cell in either the file direction (left or right) or the level direction (up or down), so each pawn has four possible capture cells. Pawns never move or capture along a 3-d diagonal. A white pawn on the second rank or a black pawn on the seventh rank can move two cells forward, to the fourth rank for white or the fifth rank for black, if the path is unobstructed.

En passant captures are allowed as in traditional chess. If a two-cell move passes through a cell where it could have been captured by an opposing pawn, then the opposing pawn can capture it by moving to the passed over cell, just as if the pawn had only moved one cell forward, provided this move is made immediately after the captured pawn's two-cell leap.

A white pawn reaching the eighth rank, or a black pawn reaching the first rank, is promoted, per the player's choice, to a queen, eagle, rook, bishop, triton, knight or zebra.

### Computing moves in different directions
Formulas for moves are based on changes to (level, rank, file) / (L,R,F) coordinates. Multiple entries mean using any of the listed formulas will result in a legal move.

(±1, ±2, ±0) means (
  level = level ± 1
  rank = rank ± 2
  file = file
)

**Notation**
- `n` is a whole number, n ≥ 1. Within one formula, every `n` has the same value: (±n, ±n, ±0) moves the same distance in level and rank.
- Each `±` sign is chosen on its own, so (±n, ±n, ±0) stands for four directions.
- The target cell must be on the board: 1 ≤ L ≤ 5, 1 ≤ R ≤ 8, 1 ≤ F ≤ 5.
- The target must be empty or hold an opposing piece (see "Capturing").

**Range**
- King and eagle: n = 1 only (one step in any orthogonal, 2-d diagonal or 3-d diagonal direction).
- Queen, rook, bishop and triton slide: n = 1, 2, 3, … in a chosen direction, stopping at the board edge or at the first occupied cell. That cell can be captured if it holds an opposing piece.
- Knight and zebra leap: each formula is one fixed jump, and any pieces in between don't block it.

#### Orthogonal (king, queen, eagle, rook)
(±n, ±0, ±0)
(±0, ±n, ±0)
(±0, ±0, ±n)

#### 2-dimensional diagonal (king, queen, eagle, bishop)
(±n, ±n, ±0)
(±n, ±0, ±n)
(±0, ±n, ±n)

#### Pawn
Formulas are for white. For black, rank changes the other way (+1 becomes −1, +2 becomes −2).

Move (target must be empty)
(±0, +1, ±0)

Double move (white from rank 2, black from rank 7; both cells must be empty)
(±0, +2, ±0)

Capture (2-dimensional diagonal, forward only, left right up or down; target holds an opposing piece, or en passant)
(±0, +1, ±1)
(±1, +1, ±0)

#### 3-dimensional diagonal (king, queen, eagle, triton)
(±n, ±n, ±n)

#### Knight move (Knight)
(±2, ±1, ±0)
(±1, ±2, ±0)
(±2, ±0, ±1)
(±0, ±2, ±1)
(±1, ±0, ±2)
(±0, ±1, ±2)

#### Zebra move (3d analog of knight move)
(±1, ±1, ±2)
(±1, ±2, ±1)
(±2, ±1, ±1)

## Initial Piece Setup
*(L,R,F) = (level, rank, file)*

### WHITE

**\[K\] King** (1)
(3,1,3)

**\[Q\] Queen** (2)
(4,1,1) (2,1,5)

**\[E\] Eagle** (2)
(5,1,4) (1,1,2)

**\[R\] Rook** (4)
(1,1,1) (1,1,5) (5,1,1) (5,1,5) 

**\[B\] Bishop** (4)
(5,1,2) (4,1,4) (3,1,1) (2,1,3) 

**\[T\] Triton** (4)
(4,1,2) (3,1,4) (2,1,1) (1,1,3) 

**\[N\] Knight** (4)
(5,1,3) (4,1,5) (3,1,2) (2,1,4) 

**\[Z\] Zebra** (4)
(4,1,3) (3,1,5) (2,1,2) (1,1,4)

**\[P\] Pawn** (25)
Each cell on Rank 2 contains a white pawn.

### BLACK

**\[K\] King** (1)
(3,8,3)

**\[Q\] Queen** (2)
(4,8,1) (2,8,5)

**\[E\] Eagle** (2)
(5,8,4) (1,8,2)

**\[R\] Rook** (4)
(1,8,1) (1,8,5) (5,8,1) (5,8,5) 

**\[B\] Bishop** (4)
(5,8,2) (4,8,4) (3,8,1) (2,8,3) 

**\[T\] Triton** (4)
(4,8,2) (3,8,4) (2,8,1) (1,8,3) 

**\[N\] Knight** (4)
(5,8,3) (4,8,5) (3,8,2) (2,8,4) 

**\[Z\] Zebra** (4)
(4,8,3) (3,8,5) (2,8,2) (1,8,4)

**\[P\] Pawn** (25)
Each cell on Rank 7 contains a black pawn.

## Open Questions

- **Castling:** whether castling exists, and if so, how it works. Several options are under consideration, including leaving it out altogether.
- **Draw by repetition:** whether repeating a position (e.g., threefold repetition) is a draw.
- **50-move rule:** whether a game is drawn after a set number of moves with no capture or pawn move.
- **Insufficient material:** whether a game is drawn when neither side has enough material to checkmate, and which combinations of pieces count as insufficient.



