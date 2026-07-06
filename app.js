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

const SHOW_CUBES = false; // set true to re-enable cube-face rendering

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (slice - depth) * cos30, (slice + depth) * sin30 - level, where depth = RANK_MAX + 1 - rank.
const V_SLICE = { x: COS30 * PITCH, y: SIN30 * PITCH };
const V_RANK = { x: COS30 * PITCH, y: -SIN30 * PITCH };
const V_LEVEL = { x: 0, y: -PITCH };

const add = (...vecs) => {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
};
const scale = (v, s) => {
  return { x: v.x * s, y: v.y * s };
};
const neg = (v) => {
  return scale(v, -1);
};

const projectCenter = (rank, level, slice) => {
  const depth = RANK_MAX + 1 - rank;
  return {
    x: (slice - depth) * COS30 * PITCH,
    y: (slice + depth) * SIN30 * PITCH - level * PITCH,
  };
};

const pointsAttr = (corners) => {
  return corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
};

const cubeFaces = (center) => {
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
};

// A "floor" is a thin outline tracing the full rank x slice perimeter of each
// level — a subtle visual aid for telling the five levels apart in the
// exploded view. (A filled full-footprint plane was tried first, but adjacent
// levels' planes overlapped almost completely on screen since the rank/slice
// extent is much wider than one level's vertical spacing.)
const FLOOR_COLORS = {
  1: "rgba(215,212,140,0.5)",
  2: "rgba(170,215,140,0.5)",
  3: "rgba(140,215,159,0.5)",
  4: "rgba(140,215,205,0.5)",
  5: "rgba(140,177,215,0.5)",
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

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

const buildScene = () => {
  const svg = document.getElementById("scene");
  const floorGroup = svgEl("g", { id: "floors" });
  const gridGroup = svgEl("g", { id: "grid" });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let level = 1; level <= LEVEL_MAX; level++) {
    const corners = floorPerimeter(level);
    floorGroup.appendChild(svgEl("polygon", {
      points: pointsAttr(corners),
      fill: "none",
      stroke: FLOOR_COLORS[level],
      "stroke-width": 2,
      "stroke-linejoin": "round",
    }));
    for (const p of corners) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }

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

  for (const cell of cells) {
    const { center } = cell;
    const faces = cubeFaces(center);

    if (SHOW_CUBES) {
      gridGroup.appendChild(svgEl("polygon", {
        points: pointsAttr(faces.top),
        fill: "rgba(210,225,255,0.10)",
        stroke: "rgba(210,225,255,0.30)",
        "stroke-width": 1,
      }));
      gridGroup.appendChild(svgEl("polygon", {
        points: pointsAttr(faces.front),
        fill: "rgba(210,225,255,0.07)",
        stroke: "rgba(210,225,255,0.30)",
        "stroke-width": 1,
      }));
      gridGroup.appendChild(svgEl("polygon", {
        points: pointsAttr(faces.right),
        fill: "rgba(210,225,255,0.05)",
        stroke: "rgba(210,225,255,0.30)",
        "stroke-width": 1,
      }));
    }

    for (const face of [faces.top, faces.front, faces.right]) {
      for (const p of face) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
  }

  svg.appendChild(floorGroup);
  svg.appendChild(gridGroup);

  const pad = PITCH * 0.6;
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
};

buildScene();
