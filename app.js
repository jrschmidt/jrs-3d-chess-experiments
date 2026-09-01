// A single 5x5x8 cube, rendered in isometric view. (rank, level, file) are
// coordinates of a cell within that one cube — see plan doc for full definition.
//   level 1..LEVEL_MAX  1 = bottom, LEVEL_MAX = top
//   rank  1..RANK_MAX   1 = front,  RANK_MAX = back
//   file  1..FILE_MAX   1 = left (as seen from front), FILE_MAX = right
// Shorthand (l, r, f) = (level, rank, file) is used below wherever a cell's
// diagonal-set membership is computed.

const LEVEL_MAX = 5;
const RANK_MAX = 8;
const FILE_MAX = 5;

// A "floor" is a thin outline tracing the full rank x file perimeter of each
// level — a subtle visual aid for telling the five levels of the cube apart.
// (A filled full-footprint plane was tried first, but adjacent levels' planes
// overlapped almost completely on screen since the rank/file extent is much
// wider than one level's vertical spacing.)
const PERIMETER_COLOR = "#505050";
const PERIMETER_HIGHLIGHT = "#999999";

// Checkerboard base colors (alpha applied separately, see alphaForLevel).
const CHECKER_BASE = { dark: "51,51,51", light: "204,204,204" };

// The "focus level" is the level the viewer is currently paying attention
// to; its checkerboard is shown brightest, with every other level faint.
let focusLevel = 1;

const alphaForLevel = (level, focus) => (level === focus ? 0.8 : 0.1);
// const alphaForLevel = (level, focus) => (level === focus ? 0.5 : 0.1);

const checkerColor = (level, variant, focus) =>
  `rgba(${CHECKER_BASE[variant]},${alphaForLevel(level, focus)})`;

// Diagonal color lookup table — the only place a diagonal label (diag_a
// .. diag_d) is tied to an actual color. Change a value here to recolor
// every cell in that diagonal set; nothing else needs to change.
const DIAG_BLUE = "#3333cc";
const DIAG_PURPLE = "#cc33cc";
const DIAG_ORANGE = "#cc6633";
const DIAG_GREEN = "#33cc33";

const DIAG_COLORS = {
  diag_a: DIAG_BLUE,
  diag_b: DIAG_PURPLE,
  diag_c: DIAG_ORANGE,
  diag_d: DIAG_GREEN,
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// Diagonal squares fade with focus level exactly like the checkerboard does.
const diagStrokeColor = (diagId, level, focus) =>
  `rgba(${hexToRgb(DIAG_COLORS[diagId])},${alphaForLevel(level, focus)})`;

const PITCH = 70;         // world-unit distance between adjacent cell coordinates
const CELL_FRACTION = 1;    // fraction of PITCH each cell's floor occupies (1 = cells abut, no gap)
const HALF = CELL_FRACTION / 2;

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

// Vertical edges at all four outer corners, spanning the cube's full height
// (floor of level 1 to ceiling of LEVEL_MAX).
const verticalEdges = () => {
  const bottom = perimeterCorners(1, -1);
  const top = perimeterCorners(LEVEL_MAX, 1);
  return [
    [bottom.frontLeft, top.frontLeft],
    [bottom.frontRight, top.frontRight],
    [bottom.backLeft, top.backLeft],
    [bottom.backRight, top.backRight],
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

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
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
let diagSquares = [];
let floorPolys = [];
let verticalHighlightEls = [];
let numeralEl = null;

const refreshFocus = () => {
  for (const { el, level, variant } of checkerPolys) {
    el.setAttribute("fill", checkerColor(level, variant, focusLevel));
  }
  for (const { el, level, diagId } of diagSquares) {
    el.setAttribute("stroke", diagStrokeColor(diagId, level, focusLevel));
  }
  for (const { el, boundaryIndex } of floorPolys) {
    el.setAttribute("stroke", perimeterStroke(boundaryIndex, focusLevel));
  }
  updateVerticalHighlights(focusLevel);
  numeralEl.textContent = String(focusLevel);
};

// Small widget for choosing the focus level: a numeral, an up/down arrow
// pair, and a "LEVEL" label, anchored so its horizontal midpoint sits on
// (anchorX, anchorY) — the caller passes the cube's own bottom-right corner
// so the widget tracks the cube regardless of grid size or tilt angle.
const buildFocusWidget = (anchorX, anchorY) => {
  const W = PITCH * 1.0;
  const H = PITCH * 1.3;
  const x0 = anchorX - W / 2;
  const x1 = anchorX + W / 2;
  const y0 = anchorY - H;
  const y1 = anchorY;
  const cx = (x0 + x1) / 2;

  const g = svgEl("g", { id: "focus-widget" });

  g.appendChild(svgEl("rect", {
    x: x0, y: y0, width: W, height: H, rx: 6, ry: 6,
    fill: "rgba(255,255,255,0.05)",
    stroke: "rgba(255,255,255,0.25)",
    "stroke-width": 1,
  }));

  const labelH = H * 0.22;
  const label = svgEl("text", {
    x: cx, y: y0 + labelH * 0.65,
    "text-anchor": "middle",
    "font-size": PITCH * 0.16,
    "font-family": "system-ui, sans-serif",
    "letter-spacing": "1.5",
    fill: "#cdd3de",
    opacity: 0.7,
  });
  label.textContent = "LEVEL";
  g.appendChild(label);

  const contentY0 = y0 + labelH;
  const contentY1 = y1;
  const numeralColX1 = x0 + W * 0.6;
  const buttonColX0 = numeralColX1;

  numeralEl = svgEl("text", {
    x: (x0 + numeralColX1) / 2,
    y: (contentY0 + contentY1) / 2,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": PITCH * 0.55,
    "font-family": "system-ui, sans-serif",
    fill: "#cdd3de",
  });
  numeralEl.textContent = String(focusLevel);
  g.appendChild(numeralEl);

  const buttonH = (contentY1 - contentY0) / 2;
  const margin = 6;
  const bcx = (buttonColX0 + x1) / 2;
  const halfW = (x1 - buttonColX0) / 2 - margin;

  const makeButton = (yTop, yBottom, pointing, onClick) => {
    const hit = svgEl("rect", {
      x: buttonColX0, y: yTop, width: x1 - buttonColX0, height: yBottom - yTop,
      fill: "rgba(255,255,255,0.001)",
      style: "cursor: pointer",
    });
    hit.addEventListener("click", onClick);
    g.appendChild(hit);

    const triTop = yTop + margin;
    const triBottom = yBottom - margin;
    const points = pointing === "up"
      ? `${bcx},${triTop} ${bcx - halfW},${triBottom} ${bcx + halfW},${triBottom}`
      : `${bcx - halfW},${triTop} ${bcx + halfW},${triTop} ${bcx},${triBottom}`;
    g.appendChild(svgEl("polygon", {
      points,
      fill: "#cdd3de",
      "pointer-events": "none",
    }));
  };

  makeButton(contentY0, contentY0 + buttonH, "up", () => {
    if (focusLevel < LEVEL_MAX) { focusLevel++; refreshFocus(); }
  });
  makeButton(contentY0 + buttonH, contentY1, "down", () => {
    if (focusLevel > 1) { focusLevel--; refreshFocus(); }
  });

  return { el: g, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};

const buildScene = () => {
  const svg = document.getElementById("scene");
  const checkerGroup = svgEl("g", { id: "checkers" });
  const diagGroup = svgEl("g", { id: "diag-squares" });
  const floorGroup = svgEl("g", { id: "floors" });
  checkerPolys = [];
  diagSquares = [];
  floorPolys = [];
  verticalHighlightEls = [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let level = 1; level <= LEVEL_MAX; level++) {
    for (let rank = 1; rank <= RANK_MAX; rank++) {
      for (let file = 1; file <= FILE_MAX; file++) {
        const corners = cellFootprint(rank, level, file);
        const variant = isDarkCell(rank, level, file) ? "dark" : "light";
        const poly = svgEl("polygon", {
          points: pointsAttr(corners),
          fill: checkerColor(level, variant, focusLevel),
          stroke: "none",
        });
        checkerPolys.push({ el: poly, level, variant });
        checkerGroup.appendChild(poly);
        for (const p of corners) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }

        const diagId = diagForCell(rank, level, file);
        const diagCorners = cellFootprintInset(rank, level, file, DIAG_SQUARE_MARGIN);
        const diagSquare = svgEl("polygon", {
          points: pointsAttr(diagCorners),
          fill: "none",
          stroke: diagStrokeColor(diagId, level, focusLevel),
          "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
        });
        diagSquares.push({ el: diagSquare, level, diagId });
        diagGroup.appendChild(diagSquare);
      }
    }
  }

  for (let level = 1; level <= LEVEL_MAX; level++) {
    const corners = floorPerimeter(level);
    const boundaryIndex = level - 1;
    const poly = svgEl("polygon", {
      points: pointsAttr(corners),
      fill: "none",
      stroke: perimeterStroke(boundaryIndex, focusLevel),
      "stroke-width": 5,
      "stroke-linejoin": "round",
    });
    floorPolys.push({ el: poly, boundaryIndex });
    floorGroup.appendChild(poly);
    for (const p of corners) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }

  for (const [bottom, top] of verticalEdges()) {
    floorGroup.appendChild(svgEl("line", {
      x1: bottom.x, y1: bottom.y, x2: top.x, y2: top.y,
      stroke: PERIMETER_COLOR,
      "stroke-width": 3,
    }));
    minX = Math.min(minX, bottom.x, top.x); maxX = Math.max(maxX, bottom.x, top.x);
    minY = Math.min(minY, bottom.y, top.y); maxY = Math.max(maxY, bottom.y, top.y);
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
    for (const p of corners) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }

  // Highlight overlays for the focused level's vertical edge segments,
  // drawn last so they paint on top of the base vertical lines above.
  for (const corner of ["frontLeft", "frontRight", "backRight", "backLeft"]) {
    const el = svgEl("line", { stroke: PERIMETER_HIGHLIGHT, "stroke-width": 3 });
    verticalHighlightEls.push({ el, corner });
    floorGroup.appendChild(el);
  }
  updateVerticalHighlights(focusLevel);

  svg.appendChild(checkerGroup);
  svg.appendChild(diagGroup);
  svg.appendChild(floorGroup);

  const widget = buildFocusWidget(maxX, maxY);
  svg.appendChild(widget.el);
  minX = Math.min(minX, widget.minX); maxX = Math.max(maxX, widget.maxX);
  minY = Math.min(minY, widget.minY); maxY = Math.max(maxY, widget.maxY);

  const pad = PITCH * 0.6;
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
};

buildScene();
