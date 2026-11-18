import { LEVEL_MAX, RANK_MAX, FILE_MAX } from '../../gameState/gameState.ts';
import { PITCH, TILT_DEGREES } from './constants.ts';

// Isometric projection of the cube: from a cell (rank, level, file) to SVG
// screen coordinates, and the screen-space outlines built from it (level
// perimeters, visible chevrons, cell footprints). Pure math, no DOM. Every
// function takes (rank, level, file), the argument order the views use.

export interface Point {
  x: number;
  y: number;
}

// The four outer vertical corners of one horizontal plane of the cube.
export interface PlaneCorners {
  frontLeft: Point;
  frontRight: Point;
  backRight: Point;
  backLeft: Point;
}

const CELL_FRACTION = 1;    // fraction of PITCH each cell's floor occupies (1 = cells abut, no gap)
export const HALF = CELL_FRACTION / 2;

const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const COS_TILT = Math.cos(TILT_RAD);
const SIN_TILT = Math.sin(TILT_RAD);

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (file - rank) * cos(tilt), -(rank + file) * sin(tilt) - level. This puts
// the rank=max/file=max corner (back-right) at the top of the view and the
// rank=max/file=1 corner (back-left) at the left — i.e. the viewer faces the
// right-front face of the cube, with the left-rear face away from them.
const V_FILE: Point = { x: COS_TILT * PITCH, y: -SIN_TILT * PITCH };
const V_RANK: Point = { x: -COS_TILT * PITCH, y: -SIN_TILT * PITCH };
export const V_LEVEL: Point = { x: 0, y: -PITCH };

export const add = (...vecs: Point[]): Point => {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
};
export const scale = (v: Point, s: number): Point => {
  return { x: v.x * s, y: v.y * s };
};

export const projectCenter = (rank: number, level: number, file: number): Point => {
  return {
    x: (file - rank) * COS_TILT * PITCH,
    y: -(rank + file) * SIN_TILT * PITCH - level * PITCH,
  };
};

// An SVG `points` attribute for a polygon or polyline.
export const pointsAttr = (corners: Point[]): string => {
  return corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
};

// The four outer vertical corners of a level, at its floor (dropSign -1) or
// ceiling (dropSign +1) plane. rank=max/file=max (backRight) is the corner
// farthest from the viewer, at the rear of the cube — see the basis-vector
// comment above.
const perimeterCorners = (level: number, dropSign: number): PlaneCorners => {
  const drop = scale(V_LEVEL, dropSign * HALF);
  const rMin = scale(V_RANK, -HALF);
  const rMax = scale(V_RANK, HALF);
  const fMin = scale(V_FILE, -HALF);
  const fMax = scale(V_FILE, HALF);

  const frontLeft = add(projectCenter(1, level, 1), rMin, fMin, drop);
  const frontRight = add(projectCenter(1, level, FILE_MAX), rMin, fMax, drop);
  const backRight = add(projectCenter(RANK_MAX, level, FILE_MAX), rMax, fMax, drop);
  const backLeft = add(projectCenter(RANK_MAX, level, 1), rMax, fMin, drop);
  return { frontLeft, frontRight, backRight, backLeft };
};

export const floorPerimeter = (level: number): Point[] => {
  const { frontLeft, frontRight, backRight, backLeft } = perimeterCorners(level, -1);
  return [frontLeft, frontRight, backRight, backLeft];
};

// The level-LEVEL_MAX ceiling perimeter — the top face of the cube.
export const ceilingPerimeter = (): Point[] => {
  const { frontLeft, frontRight, backRight, backLeft } = perimeterCorners(LEVEL_MAX, 1);
  return [frontLeft, frontRight, backRight, backLeft];
};

// The 4 named corners of horizontal boundary `i`, where boundaries are
// indexed 0..LEVEL_MAX from the floor of level 1 to the ceiling of
// LEVEL_MAX. boundaryCorners(level - 1) is floorPerimeter(level)'s corners;
// boundaryCorners(LEVEL_MAX) is ceilingPerimeter()'s corners.
export const boundaryCorners = (i: number): PlaneCorners =>
  i < LEVEL_MAX ? perimeterCorners(i + 1, -1) : perimeterCorners(LEVEL_MAX, 1);

// The visible portion of level L's floor (L = 1..LEVEL_MAX-1; the top level
// is always fully visible), as a 6-vertex chevron in screen space. Named
// per the vertical edges A (back-right), B (front-right), C (front-left),
// D (back-left): [D_L, C_L, B_L, B_(L-1), C_(L-1), D_(L-1)], where the
// subscript indexes boundaryCorners (0 = floor of level 1, LEVEL_MAX =
// ceiling of level LEVEL_MAX).
export const chevronPoints = (level: number): Point[] => {
  const upper = boundaryCorners(level);
  const lower = boundaryCorners(level - 1);
  return [
    upper.backLeft, upper.frontLeft, upper.frontRight,
    lower.frontRight, lower.frontLeft, lower.backLeft,
  ];
};

// Vertical edges at 3 of the 4 outer corners, spanning the cube's full
// height (floor of level 1 to ceiling of LEVEL_MAX). The 4th corner,
// backRight, is where the two always-hidden faces (back, right) meet — see
// chevronPoints — so it's omitted entirely rather than drawn hidden.
export const verticalEdges = (): [Point, Point][] => {
  const bottom = perimeterCorners(1, -1);
  const top = perimeterCorners(LEVEL_MAX, 1);
  return [
    [bottom.frontLeft, top.frontLeft],
    [bottom.frontRight, top.frontRight],
    [bottom.backLeft, top.backLeft],
  ];
};

// The floor-plane footprint of a single cell, half-extent `half` (in units
// of PITCH) out from center along the rank and file axes. Corner order is
// front-left, front-right, back-right, back-left (matching floorPerimeter).
const cellFootprintAt = (rank: number, level: number, file: number, half: number): Point[] => {
  const drop = scale(V_LEVEL, -HALF);
  const rMin = scale(V_RANK, -half);
  const rMax = scale(V_RANK, half);
  const fMin = scale(V_FILE, -half);
  const fMax = scale(V_FILE, half);
  const center = projectCenter(rank, level, file);

  return [
    add(center, rMin, fMin, drop),
    add(center, rMin, fMax, drop),
    add(center, rMax, fMax, drop),
    add(center, rMax, fMin, drop),
  ];
};

// The footprint of a single cell's whole floor.
export const cellFootprint = (rank: number, level: number, file: number): Point[] =>
  cellFootprintAt(rank, level, file, HALF);

// The footprint of a cell's diag square, inset `marginPx` from the cell's
// outer edge. V_RANK and V_FILE both have magnitude PITCH, so a screen-space
// inset of marginPx along either axis is marginPx / PITCH of HALF.
export const cellFootprintInset = (rank: number, level: number, file: number, marginPx: number): Point[] =>
  cellFootprintAt(rank, level, file, HALF - marginPx / PITCH);
