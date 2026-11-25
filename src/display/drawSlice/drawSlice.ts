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
// In the Iso view modes, a view with an `isoColStep` draws its columns along
// that screen direction instead of straight right: the rows' lines tilt
// TILT_DEGREES, as on the matching face of the cube, while the columns'
// lines stay vertical. Views without one (top) draw the same in every mode.
const TILT_RAD = TILT_DEGREES * Math.PI / 180;
const SLICE_VIEWS = {
  // The focus rank, seen from in front of it (white's side).
  "front-white": {
    id: "front-view", prefix: "front", cols: FILE_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    title: "Front View", planeName: "Rank", planeField: "rank", planeLabel: "RANK", planeMax: RANK_MAX,
    plane: (state) => state.rank ?? 1,
    cellAt: (col, row, rank) => ({ rank, level: row, file: col }),
    // Up and to the right (tilted counterclockwise), like the cube's file axis.
    isoColStep: { x: Math.cos(TILT_RAD), y: -Math.sin(TILT_RAD) },
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
// bbox. Only the geometry is built here; refresh colors the squares, draws
// the pieces and highlights the focus level for the plane shown. Returns a
// ViewController (see viewController.ts).
const buildSliceView = (config, bbox, state) => {
  const center = { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
  const el = svgEl("g", { id: config.id, display: "none" });
  // The plane on screen, and the view mode the grid is laid out for, as of
  // the last refresh.
  let plane = config.plane(state);
  let viewMode = state.viewMode;

  // The grid's steps for the current view mode (see layout), and the screen
  // point at grid position (col, row), centered on `center`. Square (col,
  // row) is centered on whole numbers; its corners are at the halves.
  let steps = gridSteps(config, viewMode);
  const gridPoint = (col, row) => {
    const c = col - (config.cols + 1) / 2, r = row - (config.rows + 1) / 2;
    return {
      x: center.x + c * steps.col.x + r * steps.row.x,
      y: center.y + c * steps.col.y + r * steps.row.y,
    };
  };
  const squareCorners = (col, row, k = 1) => [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([dc, dr]) => gridPoint(col + dc * k / 2, row + dr * k / 2));

  // Each square's checker and diag square (inset as in the cube). Only the
  // checkers take clicks; the diag squares, frame and pieces drawn over
  // them pass clicks through.
  const checkerGroup = svgEl("g", { id: `${config.prefix}-checkers` });
  const diagGroup = svgEl("g", {
    id: `${config.prefix}-diag-squares`, display: state.show3dDiagonals ? "inline" : "none",
    "pointer-events": "none",
  });
  const squares = [];
  forEachSliceSquare(config, (col, row) => {
    const checkerEl = svgEl("polygon", { style: "cursor: pointer" });
    // Clicking a square selects its cell in the plane on screen: one
    // display-change per field, handled like the cell indicator cube's.
    checkerEl.addEventListener("click", () => {
      const { level, rank, file } = config.cellAt(col, row, plane);
      emitDisplayChange(checkerEl, "level", level);
      emitDisplayChange(checkerEl, "rank", rank);
      emitDisplayChange(checkerEl, "file", file);
    });
    checkerGroup.appendChild(checkerEl);
    const diagEl = svgEl("polygon", {
      fill: "none",
      "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
    });
    diagGroup.appendChild(diagEl);
    squares.push({ col, row, checkerEl, diagEl });
  });
  el.appendChild(checkerGroup);
  el.appendChild(diagGroup);

  // The frame. With rows as levels: the two side edges, then one line per
  // level boundary (i = 0 is the bottom edge, LEVEL_MAX the top), drawn
  // after the side edges so the highlighted ones paint over them; refresh
  // restrokes those to highlight the focus level. Seen from above, the
  // plane shown is always the focus level: one outline, always highlighted.
  const frameGroup = svgEl("g", { id: `${config.prefix}-frame`, "pointer-events": "none" });
  const left = 0.5, right = config.cols + 0.5, bottom = 0.5, top = config.rows + 0.5;
  const sideEdges = [];
  const frameLines = [];
  let outline = null;
  if (config.rowsAreLevels) {
    for (const col of [left, right]) {
      const line = svgEl("line", { stroke: PERIMETER_COLOR, "stroke-width": 3 });
      sideEdges.push({ el: line, col });
      frameGroup.appendChild(line);
    }
    for (let boundaryIndex = 0; boundaryIndex <= LEVEL_MAX; boundaryIndex++) {
      const line = svgEl("line", {
        stroke: perimeterStroke(boundaryIndex, state.level),
        "stroke-width": 3,
        "stroke-linecap": "square",
      });
      frameLines.push({ el: line, boundaryIndex });
      frameGroup.appendChild(line);
    }
  } else {
    outline = svgEl("polygon", {
      fill: "none",
      stroke: PERIMETER_HIGHLIGHT,
      "stroke-width": 3,
    });
    frameGroup.appendChild(outline);
  }
  el.appendChild(frameGroup);

  const piecesEl = svgEl("g", { id: `${config.prefix}-pieces`, "pointer-events": "none" });
  el.appendChild(piecesEl);

  // The title, with the plane shown under it; placed by layout.
  const subtitleText = () => `${config.planeName} ${plane}`;
  let titleEl = svgEl("text", {});
  let subtitleEl = svgEl("text", {});
  el.appendChild(titleEl);
  el.appendChild(subtitleEl);

  // The plane picker, a gap right of the grid as drawn in Basic mode (the
  // Iso grid is no wider), centered on it.
  const planePicker = buildPlanePicker(center.x + config.cols * PITCH / 2 + PITCH * 0.3, center.y, {
    id: `${config.prefix}-plane-picker`,
    field: config.planeField, label: config.planeLabel, max: config.planeMax,
    initial: plane,
  });
  el.appendChild(planePicker.el);

  // Places the grid, frame and title for `mode`.
  const layout = (mode) => {
    viewMode = mode;
    steps = gridSteps(config, mode);
    for (const { col, row, checkerEl, diagEl } of squares) {
      checkerEl.setAttribute("points", pointsAttr(squareCorners(col, row)));
      diagEl.setAttribute("points", pointsAttr(squareCorners(col, row, DIAG_INSET)));
    }
    const setLine = (line, a, b) => {
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
    };
    for (const { el: line, col } of sideEdges) setLine(line, gridPoint(col, bottom), gridPoint(col, top));
    for (const { el: line, boundaryIndex } of frameLines) {
      setLine(line, gridPoint(left, boundaryIndex + 0.5), gridPoint(right, boundaryIndex + 0.5));
    }
    const corners = [gridPoint(left, bottom), gridPoint(right, bottom), gridPoint(right, top), gridPoint(left, top)];
    if (outline) outline.setAttribute("points", pointsAttr(corners));
    // Above the grid's highest corner.
    const gridTop = Math.min(...corners.map((p) => p.y));
    const newTitle = buildViewTitle(config.title, center.x, gridTop - VIEW_SUBTITLE_LINE, `${config.prefix}-title`);
    const newSubtitle = buildViewSubtitle(subtitleText(), center.x, gridTop, `${config.prefix}-subtitle`);
    titleEl.replaceWith(newTitle);
    subtitleEl.replaceWith(newSubtitle);
    titleEl = newTitle;
    subtitleEl = newSubtitle;
  };
  layout(viewMode);

  // Recolors every square and redraws the pieces for the plane `state`
  // picks, highlights the focus level's boundary lines, and relays the grid
  // out when the view mode has changed.
  const refresh = (state) => {
    plane = config.plane(state);
    if (state.viewMode !== viewMode) layout(state.viewMode);
    subtitleEl.textContent = subtitleText();
    planePicker.setValue(plane);
    for (const { el: line, boundaryIndex } of frameLines) {
      line.setAttribute("stroke", perimeterStroke(boundaryIndex, state.level));
    }
    diagGroup.setAttribute("display", state.show3dDiagonals ? "inline" : "none");
    piecesEl.replaceChildren();
    for (const { col, row, checkerEl, diagEl } of squares) {
      const cell = config.cellAt(col, row, plane);
      const { rank, level, file } = cell;
      const variant = isDarkCell(rank, level, file) ? "dark" : "light";
      checkerEl.setAttribute("fill", checkerColor(level, variant, state.level));
      diagEl.setAttribute("stroke", DIAG_COLORS[diagForCell(rank, level, file)]);
      const piece = pieceAt(cell);
      if (piece) renderPieceIcon(piece.type, piece.color, gridPoint(col, row), piecesEl);
    }
  };

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
