// @ts-nocheck
import { PIECE_ICONS } from '../render/pieceIcons.ts';
import { piecesInDrawOrder } from '../drawOrder.ts';
import { LEVEL_MAX, RANK_MAX, FILE_MAX, PITCH } from '../render/constants.ts';
import { SVG_NS, svgEl } from '../render/svg.ts';
import { buildFocusWidget } from '../../widgets/focusWidget.ts';
import { buildDiagToggle } from '../../widgets/diagToggle.ts';
import { buildViewOption } from '../../widgets/viewOption.ts';


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

// The "focus level" is the level the viewer is currently paying attention
// to; its checkerboard is shown brightest, with every other level faint.
let focusLevel = 1;

// Whether the diagonal-square overlay is shown at all; off by default.
let diagVisible = false;

// The camera view chosen in the view-option widget. Only "cube" is
// implemented; the others just report themselves as not implemented.
let currentView = "cube";

// Updates the caption's red view label, and the "not implemented" note
// shown beneath it for any view other than the cube view.
const showViewStatus = (id, label) => {
  document.getElementById("view-label").textContent = label;
  const note = document.getElementById("view-note");
  note.textContent = `${label} not implemented`;
  note.hidden = id === "cube";
};

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

const TILT_DEGREES = 20; // isometric tilt angle; try other values freely
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

// Parses a snippet of SVG markup (e.g. X_ICON_0) into a detached element
// that can be appended into the scene.
const parseSvgFragment = (markup) => {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}">${markup}</svg>`,
    "image/svg+xml"
  );
  return doc.documentElement.firstElementChild;
};

// Draws the icon for a (type, color) piece (e.g. "K"/"black" -> PIECE_ICONS
// key "kb") centered on `location`'s cell floor footprint.
const renderPieceIcon = (type, color, location) => {
  const iconKey = `${type.toLowerCase()}${color[0]}`;
  const { level, rank, file } = location;
  const sceneEl = document.getElementById("scene");
  const center = add(projectCenter(rank, level, file), scale(V_LEVEL, -HALF));
  const g = svgEl("g", { transform: `translate(${center.x.toFixed(2)}, ${center.y.toFixed(2)})` });
  g.appendChild(parseSvgFragment(PIECE_ICONS[iconKey]));
  sceneEl.appendChild(g);
  return g;
};

// Draws every piece on the board, back to front for the given view (see
// drawOrder.ts) so nearer icons paint over farther ones.
export const renderPieceIcons = (view = 'cube-view') => {
  for (const piece of piecesInDrawOrder(view)) {
    renderPieceIcon(piece.type, piece.color, piece.location);
  }
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
let diagGroupEl = null;

const refreshFocus = () => {
  for (const { el, level, variant } of checkerPolys) {
    el.setAttribute("fill", checkerColor(level, variant, focusLevel));
  }
  for (const { el, boundaryIndex } of floorPolys) {
    el.setAttribute("stroke", perimeterStroke(boundaryIndex, focusLevel));
  }
  updateVerticalHighlights(focusLevel);
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
      fill: checkerColor(level, variant, focusLevel),
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
  diagGroupEl = svgEl("g", { id: "diag-squares", display: diagVisible ? "inline" : "none" });
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
      stroke: perimeterStroke(boundaryIndex, focusLevel),
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
      stroke: perimeterStroke(boundaryIndex, focusLevel),
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
  updateVerticalHighlights(focusLevel);

  return floorGroup;
};

// The focus-level widget and diagonal toggle, anchored at the cube's
// bottom-right corner — so bbox must already cover the whole cube — plus
// the view selector at the cube's left.
const buildControls = (svg, bbox) => {
  const widget = buildFocusWidget(bbox.maxX, bbox.maxY, {
    initial: focusLevel,
    min: 1,
    max: LEVEL_MAX,
    onChange: (level) => { focusLevel = level; refreshFocus(); },
  });
  svg.appendChild(widget.el);
  mergeBounds(bbox, widget);

  const diagToggleGap = PITCH * 0.2;
  const diagToggle = buildDiagToggle(widget.maxX + diagToggleGap, (widget.minY + widget.maxY) / 2, {
    initial: diagVisible,
    onToggle: (on) => {
      diagVisible = on;
      diagGroupEl.setAttribute("display", diagVisible ? "inline" : "none");
    },
  });
  svg.appendChild(diagToggle.el);
  mergeBounds(bbox, diagToggle);

  // The view selector sits left of the cube, its bottom level with the
  // bottom of the back-left vertical edge (the cube's leftmost point). It's
  // built just left of the cube so the viewBox reserves room for it, then
  // centerViewOption slides it to its final spot once the viewBox is set.
  const backLeft = perimeterCorners(1, -1).backLeft;
  const viewOption = buildViewOption(backLeft.x - PITCH * 0.4, backLeft.y, {
    initial: currentView,
    onChange: (id, label) => {
      currentView = id;
      showViewStatus(id, label);
    },
  });
  svg.appendChild(viewOption.el);
  mergeBounds(bbox, viewOption);
  viewOptionEl = viewOption;
};

// Populated by buildControls; used by centerViewOption.
let viewOptionEl = null;

// Shifts the view selector so it's centered horizontally midway between
// the left edge of the display and the cube's leftmost point. The display's
// left edge in scene units depends on the window's aspect ratio (the
// viewBox is letterboxed with "meet"), so this reruns on every resize.
const centerViewOption = (svg) => {
  const pt = svg.createSVGPoint();
  pt.x = svg.getBoundingClientRect().left; pt.y = 0;
  const displayLeftX = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
  const cubeLeftX = perimeterCorners(1, -1).backLeft.x;
  const targetCenterX = (displayLeftX + cubeLeftX) / 2;
  const builtCenterX = (viewOptionEl.minX + viewOptionEl.maxX) / 2;
  viewOptionEl.el.setAttribute("transform", `translate(${(targetCenterX - builtCenterX).toFixed(2)}, 0)`);
};

const fitViewBox = (svg, bbox) => {
  const pad = PITCH * 0.6;
  const vbX = bbox.minX - pad, vbY = bbox.minY - pad;
  const vbW = (bbox.maxX - bbox.minX) + pad * 2, vbH = (bbox.maxY - bbox.minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
};

export const buildScene = () => {
  const svg = document.getElementById("scene");
  checkerPolys = [];
  floorPolys = [];
  verticalHighlightEls = [];

  const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  // Append order is paint order: checkers under diag squares under the frame.
  svg.appendChild(buildClipDefs());
  svg.appendChild(buildCheckers(bbox));
  svg.appendChild(buildDiagSquares());
  svg.appendChild(buildFrame(bbox));

  buildControls(svg, bbox);
  fitViewBox(svg, bbox);

  centerViewOption(svg);
  window.addEventListener("resize", () => centerViewOption(svg));
};
