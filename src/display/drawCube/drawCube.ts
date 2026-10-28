// @ts-nocheck
import { PIECE_ICONS } from '../render/pieceIcons.ts';
import { piecesInDrawOrder } from '../drawOrder.ts';
import { pieceAt, PIECE_NAMES } from '../../gameState/gameState.ts';
import { LEVEL_MAX, RANK_MAX, FILE_MAX, PITCH, TILT_DEGREES } from '../render/constants.ts';
import { svgEl, parseSvgFragment } from '../render/svg.ts';
import { buildCellPicker } from '../widgets/cellPicker.ts';
import { buildDiagToggle } from '../widgets/diagToggle.ts';
import { buildViewOption } from '../widgets/viewOption.ts';
import { buildCellDisplay } from '../widgets/cellDisplay.ts';
import { DISPLAY_CHANGE, TEXT_STYLE } from '../widgets/widgetChrome.ts';
import {
  getView, getLevel, getRank, getFile, getShow3dDiagonals,
  changeView, setPerspective, setLevel, setRank, setFile, setShow3dDiagonals,
} from '../displayState.ts';


// Cell coordinates (rank, level, file) are defined in render/constants.ts.
// Shorthand (l, r, f) = (level, rank, file) is used below wherever a cell's
// diagonal-set membership is computed.

// A "floor" is a thin outline tracing the full rank x file perimeter of each
// level — a subtle visual aid for telling the five levels of the cube apart.
// (A filled full-footprint plane was tried first, but adjacent levels' planes
// overlapped almost completely on screen since the rank/file extent is much
// wider than one level's vertical spacing.)
const PERIMETER_COLOR = "#505050";
const PERIMETER_HIGHLIGHT = "#999999";

// Flat checkerboard colors, chosen by whether the square's level is the
// focus level. Only the visible portion of each level's floor (see
// chevronPoints below) is ever drawn; the hidden portion renders nothing.
const CHECKER_COLORS = {
  focus: { light: "#a0a0a0", dark: "#1f1f1f" },
  unfocused: { light: "#808080", dark: "#333333" },
};

// Display state (focus level, diagonal overlay, view, ...) lives in
// displayState.ts. The "focus level" (getLevel) is the level the viewer is
// currently paying attention to; its checkerboard is shown brightest, with
// every other level faint.

const checkerColor = (level, variant, focus) =>
  CHECKER_COLORS[level === focus ? "focus" : "unfocused"][variant];

// Diagonal color lookup table — the only place a diagonal label (diag_a
// .. diag_d) is tied to an actual color. Change a value here to recolor
// every cell in that diagonal set; nothing else needs to change.
//
// The four values are matched for perceived brightness (OKLab lightness
// L ~ 0.53-0.55, perceived-luminance ~74-92 on a 0-255 scale) rather than
// for equal hex saturation — human vision reads green as much brighter
// than blue at the same saturation, so matching hex patterns (as the
// original #3333cc/#cc33cc/#cc6633/#33cc33 did) left green looking like
// it "popped" out of the set. To adjust brightness later, shift all four
// L values by the same amount rather than editing one hex in isolation,
// or the imbalance comes back.
const DIAG_BLUE = "#1953ff";
const DIAG_PURPLE = "#b300b3";
const DIAG_ORANGE = "#b34100";
const DIAG_GREEN = "#178217";

const DIAG_COLORS = {
  diag_a: DIAG_BLUE,
  diag_b: DIAG_PURPLE,
  diag_c: DIAG_ORANGE,
  diag_d: DIAG_GREEN,
};

const CELL_FRACTION = 1;    // fraction of PITCH each cell's floor occupies (1 = cells abut, no gap)
const HALF = CELL_FRACTION / 2;
const ICON_HALF = HALF / 2;    // half-cell scale (half width/height of the cell footprint) used for icons

const DIAG_SQUARE_MARGIN = 3;      // px gap between a diag square and the cell's outer edge
const DIAG_SQUARE_STROKE_WIDTH = 3; // px width of the diag square's outline

const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const COS_TILT = Math.cos(TILT_RAD);
const SIN_TILT = Math.sin(TILT_RAD);

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (file - rank) * cos(tilt), -(rank + file) * sin(tilt) - level. This puts
// the rank=max/file=max corner (back-right) at the top of the view and the
// rank=max/file=1 corner (back-left) at the left — i.e. the viewer faces the
// right-front face of the cube, with the left-rear face away from them.
const V_FILE = { x: COS_TILT * PITCH, y: -SIN_TILT * PITCH };
const V_RANK = { x: -COS_TILT * PITCH, y: -SIN_TILT * PITCH };
const V_LEVEL = { x: 0, y: -PITCH };

const add = (...vecs) => {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
};
const scale = (v, s) => {
  return { x: v.x * s, y: v.y * s };
};

const projectCenter = (rank, level, file) => {
  return {
    x: (file - rank) * COS_TILT * PITCH,
    y: -(rank + file) * SIN_TILT * PITCH - level * PITCH,
  };
};

const pointsAttr = (corners) => {
  return corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
};

// The four outer vertical corners of a level, at its floor (dropSign -1) or
// ceiling (dropSign +1) plane. rank=max/file=max (backRight) is the corner
// farthest from the viewer, at the rear of the cube — see the basis-vector
// comment above.
const perimeterCorners = (level, dropSign) => {
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

const floorPerimeter = (level) => {
  const { frontLeft, frontRight, backRight, backLeft } = perimeterCorners(level, -1);
  return [frontLeft, frontRight, backRight, backLeft];
};

// The level-LEVEL_MAX ceiling perimeter — the top face of the cube.
const ceilingPerimeter = () => {
  const { frontLeft, frontRight, backRight, backLeft } = perimeterCorners(LEVEL_MAX, 1);
  return [frontLeft, frontRight, backRight, backLeft];
};

// The 4 named corners of horizontal boundary `i`, where boundaries are
// indexed 0..LEVEL_MAX from the floor of level 1 to the ceiling of
// LEVEL_MAX. boundaryCorners(level - 1) is floorPerimeter(level)'s corners;
// boundaryCorners(LEVEL_MAX) is ceilingPerimeter()'s corners.
const boundaryCorners = (i) =>
  i < LEVEL_MAX ? perimeterCorners(i + 1, -1) : perimeterCorners(LEVEL_MAX, 1);

// The visible portion of level L's floor (L = 1..LEVEL_MAX-1; the top level
// is always fully visible), as a 6-vertex chevron in screen space. Named
// per the vertical edges A (back-right), B (front-right), C (front-left),
// D (back-left): [D_L, C_L, B_L, B_(L-1), C_(L-1), D_(L-1)], where the
// subscript indexes boundaryCorners (0 = floor of level 1, LEVEL_MAX =
// ceiling of level LEVEL_MAX).
const chevronPoints = (level) => {
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
const verticalEdges = () => {
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
const cellFootprintAt = (rank, level, file, half) => {
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
const cellFootprint = (rank, level, file) => cellFootprintAt(rank, level, file, HALF);

// The footprint of a cell's diag square, inset `marginPx` from the cell's
// outer edge. V_RANK and V_FILE both have magnitude PITCH, so a screen-space
// inset of marginPx along either axis is marginPx / PITCH of HALF.
const cellFootprintInset = (rank, level, file, marginPx) =>
  cellFootprintAt(rank, level, file, HALF - marginPx / PITCH);

// Corners of a rhombus with half-extent `half` along the rank/file axes,
// centered at the origin (unpositioned) — the building block for icon
// shapes that renderPieceIcon then translates onto a specific cell.
const rhombusCorners = (half) => {
  const rMin = scale(V_RANK, -half);
  const rMax = scale(V_RANK, half);
  const fMin = scale(V_FILE, -half);
  const fMax = scale(V_FILE, half);
  return [
    add(rMin, fMin),
    add(rMin, fMax),
    add(rMax, fMax),
    add(rMax, fMin),
  ];
};

// Draws the icon for a (type, color) piece (e.g. "K"/"black" -> PIECE_ICONS
// key "kb") centered on `center`, inside `parent`.
const renderPieceIcon = (type, color, center, parent) => {
  const iconKey = `${type.toLowerCase()}${color[0]}`;
  const g = svgEl("g", { transform: `translate(${center.x.toFixed(2)}, ${center.y.toFixed(2)})` });
  g.appendChild(parseSvgFragment(PIECE_ICONS[iconKey]));
  parent.appendChild(g);
  return g;
};

// Draws every piece into the cube, centered on its cell floor footprint,
// back to front (see drawOrder.ts) so nearer icons paint over farther ones.
// Then draws each slice view's pieces, centered on their grid squares; those
// never overlap, so their order doesn't matter.
export const renderPieceIcons = () => {
  for (const { type, color, location } of piecesInDrawOrder('cube-view')) {
    const { level, rank, file } = location;
    const center = add(projectCenter(rank, level, file), scale(V_LEVEL, -HALF));
    renderPieceIcon(type, color, center, cubeGroupEl);
  }
  for (const { config, center, piecesEl } of sliceViews) {
    forEachSliceSquare(config, (col, row, cell) => {
      const piece = pieceAt(cell);
      if (piece) renderPieceIcon(piece.type, piece.color, sliceSquareCenter(config, center, col, row), piecesEl);
    });
  }
  // The pieces are placed after buildScene's first refresh.
  refreshCellDisplay();
};

// Checkerboard parity: a cell is "dark" when rank + level + file is odd.
const isDarkCell = (rank, level, file) => (rank + level + file) % 2 === 1;

// Diagonal membership: every cell (l, r, f) = (level, rank, file) belongs to
// exactly one of four mutually exclusive sets of 3D-diagonally-adjacent
// cells, determined by comparing the parity of rank and file against level:
//
//   is_odd(R) == is_odd(L)  &&  is_odd(F) == is_odd(L)  ->  diag_a
//   is_odd(R) == is_odd(L)  &&  is_odd(F) != is_odd(L)  ->  diag_b
//   is_odd(R) != is_odd(L)  &&  is_odd(F) == is_odd(L)  ->  diag_c
//   is_odd(R) != is_odd(L)  &&  is_odd(F) != is_odd(L)  ->  diag_d
const isOdd = (n) => (n % 2) === 1;

const diagForCell = (rank, level, file) => {
  const rMatchesL = isOdd(rank) === isOdd(level);
  const fMatchesL = isOdd(file) === isOdd(level);
  if (rMatchesL && fMatchesL) return "diag_a";
  if (rMatchesL && !fMatchesL) return "diag_b";
  if (!rMatchesL && fMatchesL) return "diag_c";
  return "diag_d";
};

// Placeholder visibility rule — subject to change.
const isVisibleCell = (l, r, f) => l === 5 || r === 1 || f === 1;

// --- Bounding-box helpers ---
const extendBounds = (b, points) => {
  for (const p of points) {
    b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
    b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
  }
};
const mergeBounds = (b, other) => {
  b.minX = Math.min(b.minX, other.minX); b.maxX = Math.max(b.maxX, other.maxX);
  b.minY = Math.min(b.minY, other.minY); b.maxY = Math.max(b.maxY, other.maxY);
};

// A horizontal boundary is highlighted when it's the floor or ceiling of
// the focused level (boundary indices focus-1 and focus — see
// boundaryCorners above).
const perimeterStroke = (boundaryIndex, focus) =>
  (boundaryIndex === focus - 1 || boundaryIndex === focus) ? PERIMETER_HIGHLIGHT : PERIMETER_COLOR;

// Repositions the 4 vertical highlight overlays to span the focused level,
// from its floor boundary up to its ceiling boundary.
const updateVerticalHighlights = (focus) => {
  const lower = boundaryCorners(focus - 1);
  const upper = boundaryCorners(focus);
  for (const { el, corner } of verticalHighlightEls) {
    const a = lower[corner], b = upper[corner];
    el.setAttribute("x1", a.x); el.setAttribute("y1", a.y);
    el.setAttribute("x2", b.x); el.setAttribute("y2", b.y);
  }
};

// Populated by buildScene; used by refreshFocus to recolor checkers, diag
// squares, and perimeter boundaries in place (no geometry change, except
// the vertical highlights which reposition) when the focus level changes.
let checkerPolys = [];
let floorPolys = [];
let verticalHighlightEls = [];
// The diag-square overlay groups (cube and slice views), all shown or hidden
// together by refreshDisplay.
let diagGroupEls = [];

// Populated by buildScene. refreshDisplay shows the current view's group
// (see viewGroups), or the "THIS VIEW / NOT IMPLEMENTED" placeholder for a
// view that isn't drawn yet. Piece icons are drawn into each view's group,
// so they hide along with it.
let cubeGroupEl = null;
let sliceViewEls = {};
let notImplementedEl = null;

// The group drawing each implemented view; views not listed (front-black,
// side-black) show the placeholder.
const viewGroups = () => ({ "cube-view": cubeGroupEl, ...sliceViewEls });

const refreshFocus = () => {
  const focusLevel = getLevel();
  for (const { el, level, variant } of checkerPolys) {
    el.setAttribute("fill", checkerColor(level, variant, focusLevel));
  }
  for (const { el, boundaryIndex } of floorPolys) {
    el.setAttribute("stroke", perimeterStroke(boundaryIndex, focusLevel));
  }
  updateVerticalHighlights(focusLevel);
};

// Brings everything that depends on displayState up to date. Cheap enough
// to run in full after any change, rather than tracking which field moved.
const refreshDisplay = () => {
  refreshFocus();
  for (const el of diagGroupEls) {
    el.setAttribute("display", getShow3dDiagonals() ? "inline" : "none");
  }
  const groups = viewGroups();
  for (const [view, el] of Object.entries(groups)) {
    el.setAttribute("display", view === getView() ? "inline" : "none");
  }
  notImplementedEl.setAttribute("display", getView() in groups ? "none" : "inline");
  // A view change can reset fields other widgets own, so resync them.
  cellPickerEl.setValue({ level: getLevel(), rank: getRank(), file: getFile() });
  diagToggleEl.setValue(getShow3dDiagonals());
  refreshCellDisplay();
};

// Shows the focus cell (level, rank, file) in the cell display: its focus
// checker color, its diagonal color when diagonals are on, and its piece.
const refreshCellDisplay = () => {
  const level = getLevel(), rank = getRank(), file = getFile();
  const isCell = level !== null && rank !== null && file !== null;
  const piece = isCell ? pieceAt({ level, rank, file }) : undefined;
  cellDisplayEl.update({
    level, rank, file,
    fill: isCell ? CHECKER_COLORS.focus[isDarkCell(rank, level, file) ? "dark" : "light"] : null,
    diagColor: isCell && getShow3dDiagonals() ? DIAG_COLORS[diagForCell(rank, level, file)] : null,
    piece: piece ? { type: piece.type, color: piece.color, name: PIECE_NAMES[piece.type] } : null,
  });
};

// Every widget reports its changes as a display-change event {field, value}
// (see emitDisplayChange in widgets/widgetChrome.ts); this maps each field
// to the displayState setter that records it. A view change also resets
// the other fields when that view has an initial state (see changeView).
const SETTERS = {
  view: changeView,
  perspective: setPerspective,
  level: setLevel,
  rank: setRank,
  file: setFile,
  show3dDiagonals: setShow3dDiagonals,
};

const onDisplayChange = (e) => {
  const { field, value } = e.detail;
  SETTERS[field](value);
  refreshDisplay();
};

// Attrs for a cell polygon at `level`: a clip-path masking it to its
// visible chevron portion, or none for the always-fully-visible top level.
const clipAttrsForLevel = (level) =>
  level < LEVEL_MAX ? { "clip-path": `url(#visible-clip-${level})` } : {};

const addEdgeLine = (group, bottom, top, bbox) => {
  group.appendChild(svgEl("line", {
    x1: bottom.x, y1: bottom.y, x2: top.x, y2: top.y,
    stroke: PERIMETER_COLOR,
    "stroke-width": 3,
  }));
  extendBounds(bbox, [bottom, top]);
};

// Calls fn(rank, level, file) once for every cell in the cube.
const forEachCell = (fn) => {
  for (let level = 1; level <= LEVEL_MAX; level++) {
    for (let rank = 1; rank <= RANK_MAX; rank++) {
      for (let file = 1; file <= FILE_MAX; file++) {
        fn(rank, level, file);
      }
    }
  }
};

// One clipPath per non-top level, masking a cell to just its visible
// (chevron-shaped) portion of that level's floor.
const buildClipDefs = () => {
  const defs = svgEl("defs", {});
  for (let level = 1; level < LEVEL_MAX; level++) {
    const clipPath = svgEl("clipPath", { id: `visible-clip-${level}` });
    clipPath.appendChild(svgEl("polygon", { points: pointsAttr(chevronPoints(level)) }));
    defs.appendChild(clipPath);
  }
  return defs;
};

// The checkerboard floor of every cell, recorded in checkerPolys so
// refreshFocus can recolor it when the focus level changes.
const buildCheckers = (bbox) => {
  const checkerGroup = svgEl("g", { id: "checkers" });
  forEachCell((rank, level, file) => {
    const corners = cellFootprint(rank, level, file);
    const variant = isDarkCell(rank, level, file) ? "dark" : "light";
    const poly = svgEl("polygon", {
      points: pointsAttr(corners),
      fill: checkerColor(level, variant, getLevel()),
      stroke: "none",
      ...clipAttrsForLevel(level),
    });
    checkerPolys.push({ el: poly, level, variant });
    checkerGroup.appendChild(poly);
    extendBounds(bbox, corners);
  });
  return checkerGroup;
};

// The diagonal-square overlay: one inset outline per cell, colored by its
// diagonal set. Inset inside each cell, so it never extends the bbox.
const buildDiagSquares = () => {
  const diagGroupEl = svgEl("g", { id: "diag-squares", display: getShow3dDiagonals() ? "inline" : "none" });
  diagGroupEls.push(diagGroupEl);
  forEachCell((rank, level, file) => {
    const diagId = diagForCell(rank, level, file);
    const diagCorners = cellFootprintInset(rank, level, file, DIAG_SQUARE_MARGIN);
    diagGroupEl.appendChild(svgEl("polygon", {
      points: pointsAttr(diagCorners),
      fill: "none",
      stroke: DIAG_COLORS[diagId],
      "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
      ...clipAttrsForLevel(level),
    }));
  });
  return diagGroupEl;
};

// The cube's wireframe: floor perimeters, vertical edges, ceiling, and the
// focused level's vertical highlight overlays.
const buildFrame = (bbox) => {
  const floorGroup = svgEl("g", { id: "floors" });

  for (let level = 1; level <= LEVEL_MAX; level++) {
    const corners = floorPerimeter(level);
    const boundaryIndex = level - 1;
    // Only the visible D-C-B path (left edge + front edge) is drawn; the
    // hidden back/right edges (A-D, B-A) are omitted entirely. A <polyline>
    // (not <polygon>) is required here so it doesn't auto-close back from
    // frontRight to backLeft.
    const poly = svgEl("polyline", {
      points: pointsAttr([corners[3], corners[0], corners[1]]),
      fill: "none",
      stroke: perimeterStroke(boundaryIndex, getLevel()),
      "stroke-width": 5,
      "stroke-linejoin": "round",
    });
    floorPolys.push({ el: poly, boundaryIndex });
    floorGroup.appendChild(poly);
    extendBounds(bbox, corners);
  }

  for (const [bottom, top] of verticalEdges()) {
    addEdgeLine(floorGroup, bottom, top, bbox);
  }

  // The back-right corner (A) is otherwise fully hidden — see verticalEdges
  // above — but its Level-5 segment bounds the always-visible ceiling face,
  // so just that top-level span is drawn on its own.
  {
    const bottom = boundaryCorners(LEVEL_MAX - 1).backRight;
    const top = boundaryCorners(LEVEL_MAX).backRight;
    addEdgeLine(floorGroup, bottom, top, bbox);
  }

  {
    const corners = ceilingPerimeter();
    const boundaryIndex = LEVEL_MAX;
    const poly = svgEl("polygon", {
      points: pointsAttr(corners),
      fill: "none",
      stroke: perimeterStroke(boundaryIndex, getLevel()),
      "stroke-width": 3,
      "stroke-linejoin": "round",
    });
    floorPolys.push({ el: poly, boundaryIndex });
    floorGroup.appendChild(poly);
    extendBounds(bbox, corners);
  }

  // Highlight overlays for the focused level's vertical edge segments,
  // drawn last so they paint on top of the base vertical lines above.
  for (const corner of ["frontLeft", "frontRight", "backLeft"]) {
    const el = svgEl("line", { stroke: PERIMETER_HIGHLIGHT, "stroke-width": 3 });
    verticalHighlightEls.push({ el, corner });
    floorGroup.appendChild(el);
  }
  updateVerticalHighlights(getLevel());

  return floorGroup;
};

// Slice views: one slice of the cube seen straight on, as a flat cols x rows
// grid of PITCH-sized squares, column 1 at the left and row 1 at the bottom.
// They use the cube's scale and viewBox, so piece icons are the same size on
// screen and no widget moves. Each entry maps a grid square (col, row) to
// its cell; `rowsAreLevels` says whether the rows are levels (front, side)
// or ranks (top), which decides how the frame shows the focus level.
const SLICE_VIEWS = {
  // Rank 1, seen from in front of it (white's side).
  "front-white": {
    id: "front-view", prefix: "front", cols: FILE_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    cellAt: (col, row) => ({ rank: 1, level: row, file: col }),
  },
  // File 1, seen from outside it (white's left): rank 8 at the left and
  // rank 1 at the right, as on the cube's visible file-1 face.
  "side-white": {
    id: "side-view", prefix: "side", cols: RANK_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    cellAt: (col, row) => ({ rank: RANK_MAX + 1 - col, level: row, file: 1 }),
  },
  // Level 5, seen from above: rank 1 (white) at the bottom, file 1 at the left.
  "top-view": {
    id: "top-view", prefix: "top", cols: FILE_MAX, rows: RANK_MAX, rowsAreLevels: false,
    cellAt: (col, row) => ({ rank: row, level: LEVEL_MAX, file: col }),
  },
};

// Each built slice view: its config, grid center and piece group, so
// renderPieceIcons can draw into it. Populated by buildSliceView.
let sliceViews = [];

// The center of grid square (col, row) in a grid of `cols` x `rows`
// centered on `center`.
const sliceSquareCenter = ({ cols, rows }, center, col, row) => ({
  x: center.x + (col - (cols + 1) / 2) * PITCH,
  y: center.y - (row - (rows + 1) / 2) * PITCH,
});

// Calls fn(col, row, cell) once for every square in a slice view's grid.
const forEachSliceSquare = (config, fn) => {
  for (let row = 1; row <= config.rows; row++) {
    for (let col = 1; col <= config.cols; col++) {
      fn(col, row, config.cellAt(col, row));
    }
  }
};

// Built centered on the cube's bbox (pass it before the widgets are merged
// in), which it fits inside, so it doesn't extend the bbox. Its checkers
// and frame lines join checkerPolys / floorPolys, so refreshFocus
// highlights the focus level here as in the cube; its diag squares join
// diagGroupEls, so the diag toggle shows them as in the cube.
const buildSliceView = (config, bbox) => {
  const center = { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
  const squareCenter = (col, row) => sliceSquareCenter(config, center, col, row);
  const viewEl = svgEl("g", { id: config.id, display: "none" });

  const checkerGroup = svgEl("g", { id: `${config.prefix}-checkers` });
  forEachSliceSquare(config, (col, row, { rank, level, file }) => {
    const c = squareCenter(col, row);
    const variant = isDarkCell(rank, level, file) ? "dark" : "light";
    const rect = svgEl("rect", {
      x: c.x - PITCH / 2, y: c.y - PITCH / 2, width: PITCH, height: PITCH,
      fill: checkerColor(level, variant, getLevel()),
    });
    checkerPolys.push({ el: rect, level, variant });
    checkerGroup.appendChild(rect);
  });
  viewEl.appendChild(checkerGroup);

  // Each cell's diag square, inset as in the cube (see buildDiagSquares).
  const diagGroup = svgEl("g", { id: `${config.prefix}-diag-squares`, display: getShow3dDiagonals() ? "inline" : "none" });
  const half = PITCH / 2 - DIAG_SQUARE_MARGIN;
  forEachSliceSquare(config, (col, row, { rank, level, file }) => {
    const c = squareCenter(col, row);
    diagGroup.appendChild(svgEl("rect", {
      x: c.x - half, y: c.y - half, width: half * 2, height: half * 2,
      fill: "none",
      stroke: DIAG_COLORS[diagForCell(rank, level, file)],
      "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
    }));
  });
  diagGroupEls.push(diagGroup);
  viewEl.appendChild(diagGroup);

  const frameGroup = svgEl("g", { id: `${config.prefix}-frame` });
  const left = squareCenter(1, 1).x - PITCH / 2;
  const right = squareCenter(config.cols, 1).x + PITCH / 2;
  // The y of the line below row `i + 1` (i = 0 is the bottom edge,
  // config.rows the top edge).
  const rowBoundaryY = (i) => squareCenter(1, i + 1).y + PITCH / 2;
  if (config.rowsAreLevels) {
    for (const x of [left, right]) {
      frameGroup.appendChild(svgEl("line", {
        x1: x, y1: rowBoundaryY(0), x2: x, y2: rowBoundaryY(config.rows),
        stroke: PERIMETER_COLOR, "stroke-width": 3,
      }));
    }
    // One line per level boundary (indexed as in boundaryCorners), drawn
    // after the side edges so the highlighted ones paint over them.
    for (let boundaryIndex = 0; boundaryIndex <= LEVEL_MAX; boundaryIndex++) {
      const y = rowBoundaryY(boundaryIndex);
      const line = svgEl("line", {
        x1: left, y1: y, x2: right, y2: y,
        stroke: perimeterStroke(boundaryIndex, getLevel()),
        "stroke-width": 3,
        "stroke-linecap": "square",
      });
      floorPolys.push({ el: line, boundaryIndex });
      frameGroup.appendChild(line);
    }
  } else {
    // Seen from above, only the top level's ceiling is in view: one outline,
    // highlighted when the top level is the focus.
    const outline = svgEl("rect", {
      x: left, y: rowBoundaryY(config.rows), width: right - left, height: rowBoundaryY(0) - rowBoundaryY(config.rows),
      fill: "none",
      stroke: perimeterStroke(LEVEL_MAX, getLevel()),
      "stroke-width": 3,
    });
    floorPolys.push({ el: outline, boundaryIndex: LEVEL_MAX });
    frameGroup.appendChild(outline);
  }
  viewEl.appendChild(frameGroup);

  const piecesEl = svgEl("g", { id: `${config.prefix}-pieces` });
  viewEl.appendChild(piecesEl);
  sliceViews.push({ config, center, piecesEl });
  return viewEl;
};

const NOT_IMPLEMENTED_COLOR = "#33cc33";

// Two large green lines, "THIS VIEW" / "NOT IMPLEMENTED", centered on the
// cube's bbox (pass it before the widgets are merged in). Shown in place of
// the hidden cube, so the viewBox — and every widget's position — is the
// same in every view.
const buildNotImplemented = (bbox) => {
  const g = svgEl("g", { id: "not-implemented", display: "none" });
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const fontSize = PITCH * 0.8;
  ["THIS VIEW", "NOT IMPLEMENTED"].forEach((line, i) => {
    const text = svgEl("text", {
      x: cx, y: cy + fontSize * 0.6 * (i === 0 ? -1 : 1),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": fontSize,
      "font-weight": "bold",
      "font-family": TEXT_STYLE["font-family"],
      fill: NOT_IMPLEMENTED_COLOR,
    });
    text.textContent = line;
    g.appendChild(text);
  });
  return g;
};

// The cell picker just right of the cube, level with its bottom — so bbox
// must already cover the whole cube — then the diagonal toggle at the
// right, halfway down, with the view selector just to its left.
const buildControls = (svg, bbox) => {
  // Halfway down the page: the viewBox is centered vertically on the page,
  // and no widget extends the bbox vertically past the cube.
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const gap = PITCH * 0.2;

  const cellPicker = buildCellPicker(bbox.maxX + gap, bbox.maxY, {
    initial: { level: getLevel(), rank: getRank(), file: getFile() },
    checkerColors: CHECKER_COLORS.focus,
    edgeColor: PERIMETER_COLOR,
    isDarkCell,
  });
  svg.appendChild(cellPicker.el);
  mergeBounds(bbox, cellPicker);
  cellPickerEl = cellPicker;

  // Right-aligned with the cell picker, the scene's rightmost point.
  const diagToggle = buildDiagToggle(cellPicker.maxX, centerY, {
    initial: getShow3dDiagonals(),
  });
  svg.appendChild(diagToggle.el);
  mergeBounds(bbox, diagToggle);
  diagToggleEl = diagToggle;

  // The view selector sits a gap left of the diag toggle, centered on the
  // same height.
  const viewOption = buildViewOption(diagToggle.minX - gap, centerY, {
    initial: getView(),
  });
  svg.appendChild(viewOption.el);
  mergeBounds(bbox, viewOption);
};

// Populated by buildScene; refreshCellDisplay updates it.
let cellDisplayEl = null;

// Populated by buildControls; refreshDisplay resyncs them to displayState.
let cellPickerEl = null;
let diagToggleEl = null;

// Returns the viewBox's top-right corner.
const fitViewBox = (svg, bbox) => {
  const pad = PITCH * 0.6;
  const vbX = bbox.minX - pad, vbY = bbox.minY - pad;
  const vbW = (bbox.maxX - bbox.minX) + pad * 2, vbH = (bbox.maxY - bbox.minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return { x: vbX + vbW, y: vbY };
};

// The cell display's margin from the top and right edges of the page.
const CELL_DISPLAY_MARGIN = PITCH;

// Moves the cell display so it sits CELL_DISPLAY_MARGIN in from the page's
// top-right corner. It's built that far in from the viewBox's corner, and
// the page's corner is always at or beyond the viewBox's (the viewBox is
// letterboxed with "meet"), so this only ever moves it up or right, away
// from the rest of the scene. Reruns on every resize.
const positionCellDisplay = (svg) => {
  const rect = svg.getBoundingClientRect();
  const pt = svg.createSVGPoint();
  pt.x = rect.right; pt.y = rect.top;
  const corner = pt.matrixTransform(svg.getScreenCTM().inverse());
  const dx = Math.max(0, corner.x - CELL_DISPLAY_MARGIN - cellDisplayEl.maxX);
  const dy = Math.min(0, corner.y + CELL_DISPLAY_MARGIN - cellDisplayEl.minY);
  cellDisplayEl.el.setAttribute("transform", `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
};

// Shrinks the cube about its bottom-left corner, just enough that its right
// edge clears the cell display's left edge. Everything else is laid out
// from the unscaled cube, so nothing else moves; the cube's piece icons and
// diag squares are inside cubeGroupEl, so they shrink with it.
const shrinkCubeToClear = (cubeBbox, clearX) => {
  const px = cubeBbox.minX, py = cubeBbox.maxY;
  const k = Math.min(1, (clearX - px) / (cubeBbox.maxX - px));
  cubeGroupEl.setAttribute("transform",
    `translate(${px.toFixed(2)}, ${py.toFixed(2)}) scale(${k.toFixed(4)}) translate(${(-px).toFixed(2)}, ${(-py).toFixed(2)})`);
};

export const buildScene = () => {
  const svg = document.getElementById("scene");
  checkerPolys = [];
  floorPolys = [];
  verticalHighlightEls = [];
  diagGroupEls = [];
  sliceViews = [];
  sliceViewEls = {};

  const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  // Append order is paint order: checkers under diag squares under the frame.
  svg.appendChild(buildClipDefs());
  cubeGroupEl = svgEl("g", { id: "cube" });
  cubeGroupEl.appendChild(buildCheckers(bbox));
  cubeGroupEl.appendChild(buildDiagSquares());
  cubeGroupEl.appendChild(buildFrame(bbox));
  svg.appendChild(cubeGroupEl);

  for (const [view, config] of Object.entries(SLICE_VIEWS)) {
    sliceViewEls[view] = buildSliceView(config, bbox);
    svg.appendChild(sliceViewEls[view]);
  }

  notImplementedEl = buildNotImplemented(bbox);
  svg.appendChild(notImplementedEl);

  const cubeBbox = { ...bbox };
  buildControls(svg, bbox);
  const vbCorner = fitViewBox(svg, bbox);

  cellDisplayEl = buildCellDisplay(vbCorner.x - CELL_DISPLAY_MARGIN, vbCorner.y + CELL_DISPLAY_MARGIN);
  svg.appendChild(cellDisplayEl.el);
  shrinkCubeToClear(cubeBbox, cellDisplayEl.minX - PITCH * 0.3);

  positionCellDisplay(svg);
  window.addEventListener("resize", () => positionCellDisplay(svg));

  svg.addEventListener(DISPLAY_CHANGE, onDisplayChange);
  refreshDisplay();
};
