// A single 5x5x8 cube, rendered in isometric view. (rank, level, file) are
// coordinates of a cell within that one cube — see plan doc for full definition.
//   level 1..LEVEL_MAX  1 = bottom, LEVEL_MAX = top
//   rank  1..RANK_MAX   1 = front,  RANK_MAX = back
//   file  1..FILE_MAX   1 = left (as seen from front), FILE_MAX = right

export const LEVEL_MAX = 5;
export const RANK_MAX = 8;
export const FILE_MAX = 5;

export const PITCH = 70;         // world-unit distance between adjacent cell coordinates

export const TILT_DEGREES = 20;  // isometric tilt angle; try other values freely
