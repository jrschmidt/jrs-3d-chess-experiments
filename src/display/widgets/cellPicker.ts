// @ts-nocheck
import { PITCH, LEVEL_MAX, RANK_MAX, FILE_MAX, TILT_DEGREES } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { TEXT_STYLE, makeHitRect, emitDisplayChange } from './widgetChrome.ts';

// Picker for the focus cell: a small opaque isometric cube (the main cube's
// projection, scaled down, with checkered faces and no pieces), with a row
// of clickable numerals along three of its edges:
//   - FILE  1..5 along the upper-left edge, lower left to upper right
//   - RANK  8..1 along the lower-left edge, left to right
//   - LEVEL 5..1 along the right edge, top to bottom
// Anchored so its left edge sits at anchorX and its bottom at anchorBottomY
// (the caller passes a point just right of the main cube, at its bottom).
//
// The picker keeps its own level, rank and file and fires a "level",
// "rank" or "file" display-change event (see emitDisplayChange) when a
// different numeral is clicked; the current value of each is highlighted.
// setValue updates them from outside (e.g. when a view change resets
// displayState) without firing an event. The caller supplies the checker
// colors ({ light, dark }), the edge color and the checker parity rule
// (isDarkCell(rank, level, file)), so the picker matches the main cube.

const P = PITCH * 0.33;            // pitch of one cell in the picker
const NUM_FONT = P * 0.7;
const NUM_BOX = P * 0.9;           // numeral highlight / hit-target size
const NUM_GAP = P * 0.65;          // edge to numeral center
const LABEL_FONT = P * 0.55;
const LABEL_SPACING = 1.5;
const LABEL_GAP = P * 1.45;        // edge to label center
const EDGE_WIDTH = 1.5;

const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const C = Math.cos(TILT_RAD);
const S = Math.sin(TILT_RAD);

// Screen point (before anchoring) of continuous cube coordinates, where
// r, l, f run from 0 to RANK_MAX, LEVEL_MAX, FILE_MAX along the cube's
// edges — the same projection as the main cube's projectCenter.
const project = (r, l, f) => ({ x: (f - r) * C * P, y: -(r + f) * S * P - l * P });

const offset = (pt, dx, dy) => ({ x: pt.x + dx, y: pt.y + dy });

// The four corners of a rotated label's box, for the picker's bounds.
const labelCorners = ({ x, y, text, angle }) => {
  const halfW = (text.length * (LABEL_FONT * 0.65 + LABEL_SPACING)) / 2;
  const halfH = LABEL_FONT * 0.6;    // a glyph box is taller than the font size
  const a = angle * Math.PI / 180;
  const u = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -u.y, y: u.x };
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) =>
    ({ x: x + u.x * halfW * i + n.x * halfH * j, y: y + u.y * halfW * i + n.y * halfH * j }));
};

const range = (from, to) => {
  const step = from <= to ? 1 : -1;
  const out = [];
  for (let v = from; v !== to + step; v += step) out.push(v);
  return out;
};

// Each selector's numerals, in drawn order, with each numeral's center:
// placed out from the midpoint of its cell's span along the edge (so the
// rank and file numerals each follow the edge's slope).
const SELECTORS = [
  {
    field: "level", values: range(LEVEL_MAX, 1),
    center: (v) => offset(project(0, v - 0.5, FILE_MAX), NUM_GAP, 0),
  },
  {
    field: "rank", values: range(RANK_MAX, 1),
    center: (v) => offset(project(v - 0.5, 0, 0), 0, NUM_GAP),
  },
  {
    field: "file", values: range(1, FILE_MAX),
    center: (v) => offset(project(RANK_MAX, LEVEL_MAX, v - 0.5), 0, -NUM_GAP),
  },
];

// Each label sits out from its edge's midpoint, along the edge's outward
// normal, rotated to match the edge (LEVEL: 90 degrees clockwise).
const LABELS = [
  { text: "LEVEL", angle: 90, ...offset(project(0, LEVEL_MAX / 2, FILE_MAX), LABEL_GAP + P * 0.15, 0) },
  { text: "RANK", angle: TILT_DEGREES,
    ...offset(project(RANK_MAX / 2, 0, 0), -S * LABEL_GAP, C * LABEL_GAP) },
  { text: "FILE", angle: -TILT_DEGREES,
    ...offset(project(RANK_MAX, LEVEL_MAX, FILE_MAX / 2), -S * LABEL_GAP, -C * LABEL_GAP) },
];

// One quad per visible cell face: its four corners as (r, l, f), and the
// cell (rank, level, file) it belongs to.
const faceSquares = () => {
  const squares = [];
  // Top (level LEVEL_MAX).
  for (let r = 0; r < RANK_MAX; r++) {
    for (let f = 0; f < FILE_MAX; f++) {
      squares.push({ corners: [[r, LEVEL_MAX, f], [r + 1, LEVEL_MAX, f], [r + 1, LEVEL_MAX, f + 1], [r, LEVEL_MAX, f + 1]],
        cell: [r + 1, LEVEL_MAX, f + 1] });
    }
  }
  // Left face (file 1).
  for (let r = 0; r < RANK_MAX; r++) {
    for (let l = 0; l < LEVEL_MAX; l++) {
      squares.push({ corners: [[r, l, 0], [r + 1, l, 0], [r + 1, l + 1, 0], [r, l + 1, 0]], cell: [r + 1, l + 1, 1] });
    }
  }
  // Front face (rank 1).
  for (let f = 0; f < FILE_MAX; f++) {
    for (let l = 0; l < LEVEL_MAX; l++) {
      squares.push({ corners: [[0, l, f], [0, l, f + 1], [0, l + 1, f + 1], [0, l + 1, f]], cell: [1, l + 1, f + 1] });
    }
  }
  return squares;
};

const pointsAttr = (pts) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

export const buildCellPicker = (anchorX, anchorBottomY, { initial, checkerColors, edgeColor, isDarkCell }) => {
  const values = { ...initial };

  // Bounds before anchoring: the cube, every numeral box and every label.
  const cubeCorners = [
    project(RANK_MAX, LEVEL_MAX, 0), project(RANK_MAX, LEVEL_MAX, FILE_MAX), project(0, LEVEL_MAX, FILE_MAX),
    project(0, 0, FILE_MAX), project(0, 0, 0), project(RANK_MAX, 0, 0),
  ];
  const boundPts = [...cubeCorners];
  for (const { values: vs, center } of SELECTORS) {
    for (const v of vs) {
      const c = center(v);
      boundPts.push(offset(c, -NUM_BOX / 2, -NUM_BOX / 2), offset(c, NUM_BOX / 2, NUM_BOX / 2));
    }
  }
  for (const label of LABELS) boundPts.push(...labelCorners(label));
  const local = {
    minX: Math.min(...boundPts.map((p) => p.x)), maxX: Math.max(...boundPts.map((p) => p.x)),
    minY: Math.min(...boundPts.map((p) => p.y)), maxY: Math.max(...boundPts.map((p) => p.y)),
  };
  const dx = anchorX - local.minX;
  const dy = anchorBottomY - local.maxY;

  const g = svgEl("g", { id: "cell-picker" });
  // Everything is drawn in unanchored coordinates inside this group.
  const inner = svgEl("g", { transform: `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})` });
  g.appendChild(inner);

  const faces = svgEl("g", { id: "cell-picker-faces" });
  for (const { corners, cell } of faceSquares()) {
    faces.appendChild(svgEl("polygon", {
      points: pointsAttr(corners.map(([r, l, f]) => project(r, l, f))),
      fill: checkerColors[isDarkCell(...cell) ? "dark" : "light"],
    }));
  }
  inner.appendChild(faces);

  // The outline, plus the three edges meeting at the near top corner.
  const nearTop = project(0, LEVEL_MAX, 0);
  const edgeAttrs = { fill: "none", stroke: edgeColor, "stroke-width": EDGE_WIDTH, "stroke-linejoin": "round" };
  inner.appendChild(svgEl("polygon", { points: pointsAttr(cubeCorners), ...edgeAttrs }));
  for (const end of [project(RANK_MAX, LEVEL_MAX, 0), project(0, LEVEL_MAX, FILE_MAX), project(0, 0, 0)]) {
    inner.appendChild(svgEl("polyline", { points: pointsAttr([nearTop, end]), ...edgeAttrs }));
  }

  for (const { text, angle, x, y } of LABELS) {
    const el = svgEl("text", {
      x, y,
      transform: `rotate(${angle} ${x.toFixed(2)} ${y.toFixed(2)})`,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": LABEL_FONT,
      ...TEXT_STYLE,
      "letter-spacing": LABEL_SPACING,
      opacity: 0.7,
    });
    el.textContent = text;
    inner.appendChild(el);
  }

  const numerals = [];
  for (const { field, values: vs, center } of SELECTORS) {
    const group = svgEl("g", { id: `cell-picker-${field}` });
    for (const v of vs) {
      const c = center(v);
      const x0 = c.x - NUM_BOX / 2, y0 = c.y - NUM_BOX / 2;
      const highlight = svgEl("rect", {
        x: x0, y: y0, width: NUM_BOX, height: NUM_BOX, rx: 4, ry: 4,
        fill: "rgba(255,255,255,0.15)",
      });
      group.appendChild(highlight);
      const text = svgEl("text", {
        x: c.x, y: c.y,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": NUM_FONT,
        ...TEXT_STYLE,
      });
      text.textContent = String(v);
      group.appendChild(text);
      group.appendChild(makeHitRect(x0, y0, NUM_BOX, NUM_BOX, () => {
        if (values[field] === v) return;
        values[field] = v;
        restyle();
        emitDisplayChange(g, field, v);
      }));
      numerals.push({ field, value: v, highlight, text });
    }
    inner.appendChild(group);
  }

  const restyle = () => {
    for (const { field, value, highlight, text } of numerals) {
      const selected = values[field] === value;
      highlight.setAttribute("display", selected ? "inline" : "none");
      text.setAttribute("opacity", selected ? 1 : 0.6);
    }
  };
  restyle();

  const setValue = ({ level, rank, file }) => {
    Object.assign(values, { level, rank, file });
    restyle();
  };

  return {
    el: g, setValue,
    minX: local.minX + dx, minY: local.minY + dy, maxX: local.maxX + dx, maxY: local.maxY + dy,
  };
};
