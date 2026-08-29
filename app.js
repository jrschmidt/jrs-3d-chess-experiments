// A single 5x5x8 cube, rendered in isometric view. (rank, level, slice) are
// coordinates of a cell within that one cube — see plan doc for full definition.
//   rank  1..RANK_MAX   1 = front,  RANK_MAX = back
//   level 1..LEVEL_MAX  1 = bottom, LEVEL_MAX = top
//   slice 1..SLICE_MAX  1 = left (as seen from front), SLICE_MAX = right

const RANK_MAX = 8;
const LEVEL_MAX = 5;
const SLICE_MAX = 5;

// A "floor" is a thin outline tracing the full rank x slice perimeter of each
// level — a subtle visual aid for telling the five levels of the cube apart.
// (A filled full-footprint plane was tried first, but adjacent levels' planes
// overlapped almost completely on screen since the rank/slice extent is much
// wider than one level's vertical spacing.)
const PERIMETER_COLORS = {
  1: "rgba(215,212,140,0.5)",
  2: "rgba(170,215,140,0.5)",
  3: "rgba(140,215,159,0.5)",
  4: "rgba(140,215,205,0.5)",
  5: "rgba(140,177,215,0.5)",
};

// Checkerboard base colors (alpha applied separately, see alphaForLevel).
const CHECKER_BASE = { dark: "51,51,51", light: "204,204,204" };

// The "focus level" is the level the viewer is currently paying attention
// to; its checkerboard is shown brightest, with level 1 (the floor) always
// at least dimly visible for orientation, and other levels faint.
let focusLevel = 1;

const alphaForLevel = (level, focus) => {
  if (focus === 1) return level === 1 ? 1.0 : 0.1;
  if (level === 1) return 0.2;
  if (level === focus) return 0.5;
  return 0.1;
};

const checkerColor = (level, variant, focus) =>
  `rgba(${CHECKER_BASE[variant]},${alphaForLevel(level, focus)})`;

const PITCH = 70;         // world-unit distance between adjacent cell coordinates
const CELL_FRACTION = 1;    // fraction of PITCH each cell's floor occupies (1 = cells abut, no gap)
const HALF = CELL_FRACTION / 2;

const TILT_DEGREES = 20; // isometric tilt angle; try other values freely
const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const COS_TILT = Math.cos(TILT_RAD);
const SIN_TILT = Math.sin(TILT_RAD);

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (slice - rank) * cos(tilt), -(rank + slice) * sin(tilt) - level. This puts
// the rank=max/slice=max corner (back-right) at the top of the view and the
// rank=max/slice=1 corner (back-left) at the left — i.e. the viewer faces the
// right-front face of the cube, with the left-rear face away from them.
const V_SLICE = { x: COS_TILT * PITCH, y: -SIN_TILT * PITCH };
const V_RANK = { x: -COS_TILT * PITCH, y: -SIN_TILT * PITCH };
const V_LEVEL = { x: 0, y: -PITCH };

const add = (...vecs) => {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
};
const scale = (v, s) => {
  return { x: v.x * s, y: v.y * s };
};

const projectCenter = (rank, level, slice) => {
  return {
    x: (slice - rank) * COS_TILT * PITCH,
    y: -(rank + slice) * SIN_TILT * PITCH - level * PITCH,
  };
};

const pointsAttr = (corners) => {
  return corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
};

const floorPerimeter = (level) => {
  const drop = scale(V_LEVEL, -HALF);
  const rMin = scale(V_RANK, -HALF);
  const rMax = scale(V_RANK, HALF);
  const sMin = scale(V_SLICE, -HALF);
  const sMax = scale(V_SLICE, HALF);

  const frontLeft = add(projectCenter(1, level, 1), rMin, sMin, drop);
  const frontRight = add(projectCenter(1, level, SLICE_MAX), rMin, sMax, drop);
  const backRight = add(projectCenter(RANK_MAX, level, SLICE_MAX), rMax, sMax, drop);
  const backLeft = add(projectCenter(RANK_MAX, level, 1), rMax, sMin, drop);
  return [frontLeft, frontRight, backRight, backLeft];
};

// The footprint of a single cell's floor, in the same corner order as
// floorPerimeter (front-left, front-right, back-right, back-left).
const cellFootprint = (rank, level, slice) => {
  const drop = scale(V_LEVEL, -HALF);
  const rMin = scale(V_RANK, -HALF);
  const rMax = scale(V_RANK, HALF);
  const sMin = scale(V_SLICE, -HALF);
  const sMax = scale(V_SLICE, HALF);
  const center = projectCenter(rank, level, slice);

  return [
    add(center, rMin, sMin, drop),
    add(center, rMin, sMax, drop),
    add(center, rMax, sMax, drop),
    add(center, rMax, sMin, drop),
  ];
};

// Checkerboard parity: a cell is "dark" when rank + level + slice is odd.
const isDarkCell = (rank, level, slice) => (rank + level + slice) % 2 === 1;

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// Populated by buildScene; used by refreshFocus to recolor checkers in
// place (no geometry change) when the focus level changes.
let checkerPolys = [];
let numeralEl = null;

const refreshFocus = () => {
  for (const { el, level, variant } of checkerPolys) {
    el.setAttribute("fill", checkerColor(level, variant, focusLevel));
  }
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
  const floorGroup = svgEl("g", { id: "floors" });
  checkerPolys = [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let level = 1; level <= LEVEL_MAX; level++) {
    for (let rank = 1; rank <= RANK_MAX; rank++) {
      for (let slice = 1; slice <= SLICE_MAX; slice++) {
        const corners = cellFootprint(rank, level, slice);
        const variant = isDarkCell(rank, level, slice) ? "dark" : "light";
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
      }
    }
  }

  for (let level = 1; level <= LEVEL_MAX; level++) {
    const corners = floorPerimeter(level);
    floorGroup.appendChild(svgEl("polygon", {
      points: pointsAttr(corners),
      fill: "none",
      stroke: PERIMETER_COLORS[level],
      "stroke-width": 5,
      "stroke-linejoin": "round",
    }));
    for (const p of corners) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }

  svg.appendChild(checkerGroup);
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
