// @ts-nocheck
import { pieceAt, LEVEL_MAX, RANK_MAX, FILE_MAX } from '../../gameState/gameState.ts';
import { PITCH, TILT_DEGREES } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { renderPieceIcon } from '../render/pieceIcons.ts';
import {
  PERIMETER_COLOR, PERIMETER_HIGHLIGHT, checkerColor, perimeterStroke,
  isDarkCell, DIAG_COLORS, diagForCell, DIAG_SQUARE_MARGIN, DIAG_SQUARE_STROKE_WIDTH,
} from '../render/cellColors.ts';
import { buildPlanePicker } from '../widgets/planePicker.ts';
import {
  buildViewTitle, buildViewSubtitle, VIEW_SUBTITLE_LINE, emitDisplayChange,
} from '../widgets/widgetChrome.ts';

// Slice views: one slice of the cube seen straight on, as a flat cols x rows
// grid of PITCH-sized squares, column 1 at the left and row 1 at the bottom.
// They use the cube's scale and viewBox, so piece icons are the same size on
// screen and no widget moves. Each shows the plane `plane(state)` picks from
// the display state (falling back to the plane its view starts on when that
// field is null), and maps a grid square (col, row) of that plane to its
// cell; `rowsAreLevels` says whether the rows are levels (front, side) or
// ranks (top), which decides how the frame shows the focus level. `title`
// is drawn above the grid, with "`planeName` {plane}" under it;
// `planeField` (with its caption and maximum) is the field the view's plane
// picker changes.
//
// In the Iso view modes (Iso and Iso-H), a view with an `isoColStep` draws
// its columns along that screen direction instead of straight right: the
// rows' lines tilt TILT_DEGREES, as on the matching face of the cube, while
// the columns' lines stay vertical. Views without one (top) draw the same in
// every mode.
//
// In Iso-H, a view with `isoHExplode` (front) draws every plane at once,
// each as its Iso slice, spread along `axis` from plane planeMax at the
// left to plane 1 at the right, not touching. The selected plane's slice is
// EXPLODE_SELECTED_SCALE times the size of the others, which shrink so the
// whole set fits left of the plane picker. Clicking a square in the
// selected slice selects its cell; in any other slice it selects only that
// slice's plane. While the cursor is over one of the small slices, that
// slice pops out: it grows to the selected slice's size around its own
// center (nudged inward at the ends of the row) and is drawn on top of its
// neighbors; nothing else moves. Otherwise Iso-H draws like Iso.
//
// Iso-H is the name, in the isopop branch, for the changes and experiments
// introduced there (on main the mode is Iso-X, without them). The hover pop-out is the first of them.
const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const EXPLODE_SELECTED_SCALE = 1.7;
const EXPLODE_GAP = PITCH * 0.15;
const SLICE_VIEWS = {
  // The focus rank, seen from in front of it (white's side).
  "front-white": {
    id: "front-view", prefix: "front", cols: FILE_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    title: "Front View", planeName: "Rank", planeField: "rank", planeLabel: "RANK", planeMax: RANK_MAX,
    plane: (state) => state.rank ?? 1,
    cellAt: (col, row, rank) => ({ rank, level: row, file: col }),
    // Up and to the right (tilted counterclockwise), like the cube's file axis.
    isoColStep: { x: Math.cos(TILT_RAD), y: -Math.sin(TILT_RAD) },
    // Ranks 8..1 down and to the right (tilted clockwise), like the cube's
    // rank axis reversed: rank 8 at the back, rank 1 at the front.
    isoHExplode: { axis: { x: Math.cos(TILT_RAD), y: Math.sin(TILT_RAD) } },
  },
  // The focus file, seen from outside it (white's left): rank 8 at the left
  // and rank 1 at the right, as on the cube's visible file-1 face.
  "side-white": {
    id: "side-view", prefix: "side", cols: RANK_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    title: "Side View", planeName: "File", planeField: "file", planeLabel: "FILE", planeMax: FILE_MAX,
    plane: (state) => state.file ?? 1,
    cellAt: (col, row, file) => ({ rank: RANK_MAX + 1 - col, level: row, file }),
    // Down and to the right (tilted clockwise): toward rank 1, like the cube's
    // rank axis reversed.
    isoColStep: { x: Math.cos(TILT_RAD), y: Math.sin(TILT_RAD) },
  },
  // The focus level, seen from above: rank 1 (white) at the bottom, file 1
  // at the left.
  "top-view": {
    id: "top-view", prefix: "top", cols: FILE_MAX, rows: RANK_MAX, rowsAreLevels: false,
    title: "Top View", planeName: "Level", planeField: "level", planeLabel: "LEVEL", planeMax: LEVEL_MAX,
    plane: (state) => state.level ?? LEVEL_MAX,
    cellAt: (col, row, level) => ({ rank: row, level, file: col }),
  },
};

// The screen step for one column and one row of a slice view's grid in
// view mode `viewMode` (see the Iso note above SLICE_VIEWS).
const gridSteps = (config, viewMode) => {
  const step = viewMode !== "basic" && config.isoColStep;
  return {
    col: step ? { x: step.x * PITCH, y: step.y * PITCH } : { x: PITCH, y: 0 },
    row: { x: 0, y: -PITCH },
  };
};

// The polygon points attribute for a list of points.
const pointsAttr = (pts) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

// How far a diag square's corners sit from its center, relative to its
// checker's (the same inset as in the cube).
const DIAG_INSET = 1 - 2 * DIAG_SQUARE_MARGIN / PITCH;

// Calls fn(col, row) once for every square in a slice view's grid.
const forEachSliceSquare = (config, fn) => {
  for (let row = 1; row <= config.rows; row++) {
    for (let col = 1; col <= config.cols; col++) {
      fn(col, row);
    }
  }
};

// Builds one slice view, centered on the cube's bbox (pass it before the
// widgets are merged in), which it fits inside, so it doesn't extend the
// bbox. layout places the slices for the view mode (one, or in Iso-H with
// `isoHExplode`, all of them); refresh colors the squares, draws the pieces
// and highlights the focus level. Returns a ViewController (see
// viewController.ts).
const buildSliceView = (config, bbox, state) => {
  const center = { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
  const el = svgEl("g", { id: config.id, display: "none" });
  // The plane on screen, and the layout key (see layoutKey) the slices are
  // laid out for, as of the last refresh.
  let plane = config.plane(state);
  let laidOutFor = null;
  // The plane of the slice under the cursor (exploded views only; view-local
  // UI state, not display state), and the state of the last refresh, which
  // a hover change redraws with.
  let hovered = null;
  let lastState = state;

  const exploded = (mode) => mode === "isoH" && Boolean(config.isoHExplode);
  // The slice that pops out: the hovered one, unless it's already large.
  const effectiveHover = (mode, selected) =>
    exploded(mode) && hovered !== selected ? hovered : null;
  // The slices only move when the view mode changes, or, exploded, when
  // the selected plane (the large slice) or the hovered slice does.
  const layoutKey = (mode, p) => exploded(mode) ? `${mode}|${p}|${effectiveHover(mode, p)}` : mode;

  // The grid's unscaled steps for the current view mode (see layout). A
  // placed slice is { plane, center, scale }; its plane is null when it
  // shows whatever plane is selected (the single-slice layouts). gridPoint
  // is the screen point at grid position (col, row) of a slice: square
  // (col, row) is centered on whole numbers, its corners on the halves.
  let steps = gridSteps(config, state.viewMode);
  const gridPoint = (slice, col, row) => {
    const c = (col - (config.cols + 1) / 2) * slice.scale, r = (row - (config.rows + 1) / 2) * slice.scale;
    return {
      x: slice.center.x + c * steps.col.x + r * steps.row.x,
      y: slice.center.y + c * steps.col.y + r * steps.row.y,
    };
  };
  const squareCorners = (slice, col, row, k = 1) => [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([dc, dr]) => gridPoint(slice, col + dc * k / 2, row + dr * k / 2));
  const left = 0.5, right = config.cols + 0.5, bottom = 0.5, top = config.rows + 0.5;
  const outerCorners = (slice) => [
    gridPoint(slice, left, bottom), gridPoint(slice, right, bottom),
    gridPoint(slice, right, top), gridPoint(slice, left, top),
  ];
  const planeOf = (slice) => slice.plane ?? plane;

  // Each square's checker and diag square (inset as in the cube), the
  // frames and the pieces, filled in by layout and refresh, in two layers:
  // the base layer holds every slice but a popped-out one, and the hover
  // layer, drawn over everything else, holds only that one. Only the
  // checkers take clicks; the diag squares, frames and pieces drawn over
  // them pass clicks through.
  const buildLayer = (parent, idPrefix) => {
    const layer = {
      checkers: svgEl("g", { id: `${idPrefix}-checkers` }),
      diag: svgEl("g", {
        id: `${idPrefix}-diag-squares`, display: state.show3dDiagonals ? "inline" : "none",
        "pointer-events": "none",
      }),
      frame: svgEl("g", { id: `${idPrefix}-frame`, "pointer-events": "none" }),
      pieces: svgEl("g", { id: `${idPrefix}-pieces`, "pointer-events": "none" }),
    };
    for (const g of [layer.checkers, layer.diag, layer.frame, layer.pieces]) parent.appendChild(g);
    return layer;
  };
  const baseLayer = buildLayer(el, config.prefix);
  const hoverGroup = svgEl("g", { id: `${config.prefix}-hover` });
  const hoverLayer = buildLayer(hoverGroup, `${config.prefix}-hover`);
  const layers = [baseLayer, hoverLayer];
  let squares = [];
  let frameLines = [];
  // Each exploded slice's checkers, to the plane of their slice (see the
  // hover tracking below).
  let checkerPlane = new WeakMap();

  // The title, with the plane shown under it; placed by layout.
  const subtitleText = () => `${config.planeName} ${plane}`;
  let titleEl = svgEl("text", {});
  let subtitleEl = svgEl("text", {});
  el.appendChild(titleEl);
  el.appendChild(subtitleEl);

  // The plane picker, a gap right of the grid as drawn in Basic mode (the
  // Iso grid is no wider), centered on it; layout moves it right of an
  // exploded set.
  const planePicker = buildPlanePicker(center.x + config.cols * PITCH / 2 + PITCH * 0.3, center.y, {
    id: `${config.prefix}-plane-picker`,
    field: config.planeField, label: config.planeLabel, max: config.planeMax,
    initial: plane,
  });
  el.appendChild(planePicker.el);
  el.appendChild(hoverGroup);
  const pickerGap = PITCH * 0.3;

  // The slices to draw for `mode` with plane `selected` selected and plane
  // `hover` popped out (or null): { slices, hoverSlice }. Exploded: planes
  // planeMax..1 left to right along the axis, sized and packed so they
  // exactly fill the width from the bbox's left edge to a gap left of the
  // plane picker (moved to the bbox's right edge), centered vertically.
  // `slices` is that packing, the hovered slice at its unhovered size;
  // hoverSlice is the hovered slice popped out: scaled up around its center,
  // shifted just enough to stay inside that width.
  const placedSlices = (mode, selected, hover) => {
    if (!exploded(mode)) return { slices: [{ plane: null, center, scale: 1 }], hoverSlice: null };
    const { axis } = config.isoHExplode;
    const planes = Array.from({ length: config.planeMax }, (_, i) => config.planeMax - i);
    const availMinX = bbox.minX;
    const availMaxX = bbox.maxX - (planePicker.maxX - planePicker.minX) - pickerGap;
    const unitW = config.cols * Math.abs(steps.col.x);
    const n = planes.length;
    const small = (availMaxX - availMinX - (n - 1) * EXPLODE_GAP) / (unitW * (n - 1 + EXPLODE_SELECTED_SCALE));
    let cursor = 0;
    const slices = planes.map((p) => {
      const scale = small * (p === selected ? EXPLODE_SELECTED_SCALE : 1);
      const w = unitW * scale;
      const x = cursor + w / 2;
      cursor += w + EXPLODE_GAP;
      return { plane: p, center: { x, y: x * axis.y / axis.x }, scale };
    });
    const pts = slices.flatMap(outerCorners);
    const minX = Math.min(...pts.map((q) => q.x));
    const minY = Math.min(...pts.map((q) => q.y)), maxY = Math.max(...pts.map((q) => q.y));
    const dx = availMinX - minX, dy = center.y - (minY + maxY) / 2;
    const placed = slices.map((sl) => ({ ...sl, center: { x: sl.center.x + dx, y: sl.center.y + dy } }));
    const base = placed.find((sl) => sl.plane === hover);
    if (!base) return { slices: placed, hoverSlice: null };
    const grown = { ...base, scale: base.scale * EXPLODE_SELECTED_SCALE };
    const xs = outerCorners(grown).map((q) => q.x);
    const shift = Math.max(0, availMinX - Math.min(...xs)) - Math.max(0, Math.max(...xs) - availMaxX);
    return { slices: placed, hoverSlice: { ...grown, center: { x: grown.center.x + shift, y: grown.center.y } } };
  };

  // Rebuilds the squares and frames for `mode` with plane `selected` (and
  // the hovered slice popped out), and places the title above them and the
  // plane picker right of them.
  const layout = (mode, selected) => {
    laidOutFor = layoutKey(mode, selected);
    steps = gridSteps(config, mode);
    const { slices, hoverSlice } = placedSlices(mode, selected, effectiveHover(mode, selected));
    for (const layer of layers) {
      layer.checkers.replaceChildren();
      layer.diag.replaceChildren();
      layer.frame.replaceChildren();
    }
    squares = [];
    frameLines = [];
    checkerPlane = new WeakMap();
    const drawn = [
      ...slices.filter((sl) => !hoverSlice || sl.plane !== hoverSlice.plane).map((sl) => [sl, baseLayer]),
      ...(hoverSlice ? [[hoverSlice, hoverLayer]] : []),
    ];
    for (const [slice, layer] of drawn) {
      const line = (a, b, attrs) => layer.frame.appendChild(svgEl("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...attrs,
      }));
      forEachSliceSquare(config, (col, row) => {
        const checkerEl = svgEl("polygon", {
          points: pointsAttr(squareCorners(slice, col, row)),
          style: "cursor: pointer",
        });
        // Clicking a square selects its cell: one display-change per field,
        // handled like the cell indicator cube's. In an exploded view, a
        // square in a slice other than the selected one selects only that
        // slice's plane instead. Fired from the view's root, which stays in
        // the scene while a change relays an exploded view out.
        checkerEl.addEventListener("click", () => {
          if (slice.plane !== null && slice.plane !== plane) {
            emitDisplayChange(el, config.planeField, slice.plane);
            return;
          }
          const { level, rank, file } = config.cellAt(col, row, planeOf(slice));
          emitDisplayChange(el, "level", level);
          emitDisplayChange(el, "rank", rank);
          emitDisplayChange(el, "file", file);
        });
        layer.checkers.appendChild(checkerEl);
        if (slice.plane !== null) checkerPlane.set(checkerEl, slice.plane);
        const diagEl = svgEl("polygon", {
          points: pointsAttr(squareCorners(slice, col, row, DIAG_INSET)),
          fill: "none",
          "stroke-width": Math.max(1, DIAG_SQUARE_STROKE_WIDTH * slice.scale),
        });
        layer.diag.appendChild(diagEl);
        squares.push({ slice, col, row, checkerEl, diagEl, piecesEl: layer.pieces });
      });

      // The frame. With rows as levels: the two side edges, then one line
      // per level boundary (i = 0 is the bottom edge, LEVEL_MAX the top),
      // drawn after the side edges so the highlighted ones paint over them;
      // refresh restrokes those to highlight the focus level. Seen from
      // above, the plane shown is always the focus level: one outline,
      // always highlighted.
      const strokeWidth = Math.max(1, 3 * slice.scale);
      if (config.rowsAreLevels) {
        for (const col of [left, right]) {
          line(gridPoint(slice, col, bottom), gridPoint(slice, col, top),
            { stroke: PERIMETER_COLOR, "stroke-width": strokeWidth });
        }
        for (let boundaryIndex = 0; boundaryIndex <= LEVEL_MAX; boundaryIndex++) {
          const lineEl = line(gridPoint(slice, left, boundaryIndex + 0.5), gridPoint(slice, right, boundaryIndex + 0.5),
            { "stroke-width": strokeWidth, "stroke-linecap": "square" });
          frameLines.push({ el: lineEl, boundaryIndex });
        }
      } else {
        layer.frame.appendChild(svgEl("polygon", {
          points: pointsAttr(outerCorners(slice)),
          fill: "none",
          stroke: PERIMETER_HIGHLIGHT,
          "stroke-width": strokeWidth,
        }));
      }
    }

    // The title above the highest corner of all the slices, centered on them
    // (as laid out without a pop-out, so a hover doesn't move it).
    const pts = slices.flatMap(outerCorners);
    const minX = Math.min(...pts.map((q) => q.x)), maxX = Math.max(...pts.map((q) => q.x));
    const gridTop = Math.min(...pts.map((q) => q.y));
    const titleX = (minX + maxX) / 2;
    const newTitle = buildViewTitle(config.title, titleX, gridTop - VIEW_SUBTITLE_LINE, `${config.prefix}-title`);
    const newSubtitle = buildViewSubtitle(subtitleText(), titleX, gridTop, `${config.prefix}-subtitle`);
    titleEl.replaceWith(newTitle);
    subtitleEl.replaceWith(newSubtitle);
    titleEl = newTitle;
    subtitleEl = newSubtitle;

    const pickerDx = exploded(mode) ? maxX + pickerGap - planePicker.minX : 0;
    planePicker.el.setAttribute("transform", `translate(${pickerDx.toFixed(2)}, 0)`);
  };

  // Relays the slices out when the layout key has changed, then recolors
  // every square, redraws the pieces and highlights the focus level's
  // boundary lines.
  const refresh = (state) => {
    lastState = state;
    plane = config.plane(state);
    if (layoutKey(state.viewMode, plane) !== laidOutFor) layout(state.viewMode, plane);
    subtitleEl.textContent = subtitleText();
    planePicker.setValue(plane);
    for (const { el: line, boundaryIndex } of frameLines) {
      line.setAttribute("stroke", perimeterStroke(boundaryIndex, state.level));
    }
    for (const layer of layers) {
      layer.diag.setAttribute("display", state.show3dDiagonals ? "inline" : "none");
      layer.pieces.replaceChildren();
    }
    for (const { slice, col, row, checkerEl, diagEl, piecesEl } of squares) {
      const cell = config.cellAt(col, row, planeOf(slice));
      const { rank, level, file } = cell;
      const variant = isDarkCell(rank, level, file) ? "dark" : "light";
      checkerEl.setAttribute("fill", checkerColor(level, variant, state.level));
      diagEl.setAttribute("stroke", DIAG_COLORS[diagForCell(rank, level, file)]);
      const piece = pieceAt(cell);
      if (piece) {
        const icon = renderPieceIcon(piece.type, piece.color, gridPoint(slice, col, row), piecesEl);
        if (slice.scale !== 1) {
          icon.setAttribute("transform", `${icon.getAttribute("transform")} scale(${slice.scale.toFixed(4)})`);
        }
      }
    }
  };
  refresh(state);

  // Hover tracking, on the view's root: a relayout replaces the square under
  // the cursor, so the squares' own enter/leave events aren't reliable. The
  // popped-out slice covers its unhovered footprint, so the cursor stays on
  // it. Moving onto anything but an exploded slice's checker, or out of the
  // view, ends the hover.
  const setHovered = (p) => {
    if (p === hovered) return;
    hovered = p;
    if (layoutKey(lastState.viewMode, plane) !== laidOutFor) refresh(lastState);
  };
  el.addEventListener("pointermove", (e) => setHovered(checkerPlane.get(e.target) ?? null));
  el.addEventListener("pointerleave", () => setHovered(null));

  return { el, refresh };
};

// Builds every slice view (see SLICE_VIEWS), centered on the cube's bbox,
// for the starting display state. Returns a ViewController per view name.
// Views not listed (front-black, side-black) aren't drawn; the scene shows
// its "not implemented" placeholder for them.
export const buildSliceViews = (bbox, state) =>
  Object.fromEntries(Object.entries(SLICE_VIEWS).map(
    ([view, config]) => [view, buildSliceView(config, bbox, state)],
  ));
