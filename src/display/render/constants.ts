// Rendering constants for the isometric view of the 5x5x8 cube. The board
// size (LEVEL_MAX, RANK_MAX, FILE_MAX) and coordinate conventions live in
// src/gameState/gameState.ts.

export const PITCH = 70;         // world-unit distance between adjacent cell coordinates

export const TILT_DEGREES = 20;  // isometric tilt angle; try other values freely

// Light and dark variants of green, red and blue, their pairwise mixes, plus a
// cell highlight color.
export const LIGHT_GREEN = "#339933";
export const DARK_GREEN = "#336633";
export const LIGHT_RED = "#993333";
export const DARK_RED = "#663333";
export const LIGHT_BLUE = "#333399";
export const DARK_BLUE = "#333366";
export const GREEN_RED = "#999933";
export const RED_BLUE = "#993399";
export const GREEN_BLUE = "#339999";
export const CELL_HIGHLIGHT = "#ff8000";
