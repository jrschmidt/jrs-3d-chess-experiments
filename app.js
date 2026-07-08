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

// Per-level checkerboard colors. Only level 1 is populated for now; later
// levels can be added here without touching the rendering logic.
const CHECKER_COLORS = {
  1: { dark: "rgb(51,51,51)", light: "rgb(204,204,204)" },
  2: { dark: "rgba(51,51,51,0.1)", light: "rgba(204,204,204,0.1)" },
  3: { dark: "rgba(51,51,51,0.1)", light: "rgba(204,204,204,0.1)" },
  4: { dark: "rgba(51,51,51,0.1)", light: "rgba(204,204,204,0.1)" },
  5: { dark: "rgba(51,51,51,0.1)", light: "rgba(204,204,204,0.1)" },
};

const PITCH = 70;         // world-unit distance between adjacent cell coordinates
const CELL_FRACTION = 1;    // fraction of PITCH each cell's floor occupies (1 = cells abut, no gap)
const HALF = CELL_FRACTION / 2;

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

// Per-unit-step screen-space basis vectors, derived from the isometric projection
// (slice - rank) * cos30, -(rank + slice) * sin30 - level. This puts the
// rank=max/slice=max corner (back-right) at the top of the view and the
// rank=max/slice=1 corner (back-left) at the left — i.e. the viewer faces the
// right-front face of the cube, with the left-rear face away from them.
const V_SLICE = { x: COS30 * PITCH, y: -SIN30 * PITCH };
const V_RANK = { x: -COS30 * PITCH, y: -SIN30 * PITCH };
const V_LEVEL = { x: 0, y: -PITCH };

const add = (...vecs) => {
  return vecs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
};
const scale = (v, s) => {
  return { x: v.x * s, y: v.y * s };
};

const projectCenter = (rank, level, slice) => {
  return {
    x: (slice - rank) * COS30 * PITCH,
    y: -(rank + slice) * SIN30 * PITCH - level * PITCH,
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

const buildScene = () => {
  const svg = document.getElementById("scene");
  const checkerGroup = svgEl("g", { id: "checkers" });
  const floorGroup = svgEl("g", { id: "floors" });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const level of Object.keys(CHECKER_COLORS).map(Number)) {
    const colors = CHECKER_COLORS[level];
    for (let rank = 1; rank <= RANK_MAX; rank++) {
      for (let slice = 1; slice <= SLICE_MAX; slice++) {
        const corners = cellFootprint(rank, level, slice);
        checkerGroup.appendChild(svgEl("polygon", {
          points: pointsAttr(corners),
          fill: isDarkCell(rank, level, slice) ? colors.dark : colors.light,
          stroke: "none",
        }));
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

  const pad = PITCH * 0.6;
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
};

buildScene();
