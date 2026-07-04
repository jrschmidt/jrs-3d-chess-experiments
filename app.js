// 5x5x5 exploded isometric cube grid prototype.
// Coordinate system: (rank, level, slice) — see plan doc for full definition.
//   rank  1..RANK_MAX   1 = front,  RANK_MAX = back
//   level 1..LEVEL_MAX  1 = bottom, LEVEL_MAX = top
//   slice 1..SLICE_MAX  1 = left (as seen from front), SLICE_MAX = right

const RANK_MAX = 5;
const LEVEL_MAX = 5;
const SLICE_MAX = 5;

const PITCH = 70;        // world-unit distance between adjacent cube centers (includes gap)
const CUBE_FRACTION = 0.42; // fraction of PITCH each cube face actually occupies (rest is the "explode" gap)
const HALF = CUBE_FRACTION / 2;

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (slice - depth) * cos30, (slice + depth) * sin30 - level, where depth = RANK_MAX + 1 - rank.
const V_SLICE = { x: COS30 * PITCH, y: SIN30 * PITCH };
const V_RANK = { x: COS30 * PITCH, y: -SIN30 * PITCH };
const V_LEVEL = { x: 0, y: -PITCH };

const pieces = {
  key(rank, level, slice) { return `${rank},${level},${slice}`; },
};
const pieceData = new Map([
  [pieces.key(3, 3, 3), { shape: "triangle" }],
]);

function add(...vecs) {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
}
function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}
function neg(v) {
  return scale(v, -1);
}

function projectCenter(rank, level, slice) {
  const depth = RANK_MAX + 1 - rank;
  return {
    x: (slice - depth) * COS30 * PITCH,
    y: (slice + depth) * SIN30 * PITCH - level * PITCH,
  };
}

function pointsAttr(corners) {
  return corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
}

function cubeFaces(center) {
  const vs = scale(V_SLICE, HALF);
  const vr = scale(V_RANK, HALF);
  const vl = scale(V_LEVEL, HALF);

  const top = [
    add(center, vl, vs, vr),
    add(center, vl, vs, neg(vr)),
    add(center, vl, neg(vs), neg(vr)),
    add(center, vl, neg(vs), vr),
  ];
  // front face: the rank-minimum (near/front) side
  const front = [
    add(center, neg(vr), vs, vl),
    add(center, neg(vr), vs, neg(vl)),
    add(center, neg(vr), neg(vs), neg(vl)),
    add(center, neg(vr), neg(vs), vl),
  ];
  // right face: the slice-maximum (right, as seen from front) side
  const right = [
    add(center, vs, vr, vl),
    add(center, vs, vr, neg(vl)),
    add(center, vs, neg(vr), neg(vl)),
    add(center, vs, neg(vr), vl),
  ];
  return { top, front, right };
}

const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function triangleIconPoints(center, r) {
  return [
    { x: center.x, y: center.y - r },
    { x: center.x + r * COS30, y: center.y + r * 0.5 },
    { x: center.x - r * COS30, y: center.y + r * 0.5 },
  ];
}

function buildScene() {
  const svg = document.getElementById("scene");
  const gridGroup = svgEl("g", { id: "grid" });
  const iconGroup = svgEl("g", { id: "icons" });

  const cells = [];
  for (let rank = 1; rank <= RANK_MAX; rank++) {
    for (let level = 1; level <= LEVEL_MAX; level++) {
      for (let slice = 1; slice <= SLICE_MAX; slice++) {
        cells.push({ rank, level, slice, center: projectCenter(rank, level, slice) });
      }
    }
  }
  // simple back-to-front paint order: farther/higher cubes first, nearer ones last
  cells.sort((a, b) => a.center.y - b.center.y);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const cell of cells) {
    const { rank, level, slice, center } = cell;
    const isPiece = pieceData.has(pieces.key(rank, level, slice));
    const faces = cubeFaces(center);

    const strokeColor = isPiece ? "rgba(255,180,140,0.55)" : "rgba(210,225,255,0.30)";
    gridGroup.appendChild(svgEl("polygon", {
      points: pointsAttr(faces.top),
      fill: isPiece ? "rgba(255,150,100,0.12)" : "rgba(210,225,255,0.10)",
      stroke: strokeColor,
      "stroke-width": 1,
    }));
    gridGroup.appendChild(svgEl("polygon", {
      points: pointsAttr(faces.front),
      fill: isPiece ? "rgba(255,150,100,0.09)" : "rgba(210,225,255,0.07)",
      stroke: strokeColor,
      "stroke-width": 1,
    }));
    gridGroup.appendChild(svgEl("polygon", {
      points: pointsAttr(faces.right),
      fill: isPiece ? "rgba(255,150,100,0.06)" : "rgba(210,225,255,0.05)",
      stroke: strokeColor,
      "stroke-width": 1,
    }));

    for (const face of [faces.top, faces.front, faces.right]) {
      for (const p of face) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }

    const piece = pieceData.get(pieces.key(rank, level, slice));
    if (piece) {
      const topCenter = add(center, scale(V_LEVEL, HALF));
      if (piece.shape === "triangle") {
        const tri = triangleIconPoints(topCenter, PITCH * 0.22);
        iconGroup.appendChild(svgEl("polygon", {
          points: pointsAttr(tri),
          fill: "#ff7a4d",
          stroke: "#ffe3d5",
          "stroke-width": 1.5,
          "stroke-linejoin": "round",
        }));
      }
    }
  }

  svg.appendChild(gridGroup);
  svg.appendChild(iconGroup);

  const pad = PITCH * 0.6;
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

buildScene();
