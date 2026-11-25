// @ts-nocheck
import { pieceAt, LEVEL_MAX, RANK_MAX, FILE_MAX } from '../../gameState/gameState.ts';
import { PITCH } from '../render/constants.ts';
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
const SLICE_VIEWS = {
  // The focus rank, seen from in front of it (white's side).
  "front-white": {
    id: "front-view", prefix: "front", cols: FILE_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    title: "Front View", planeName: "Rank", planeField: "rank", planeLabel: "RANK", planeMax: RANK_MAX,
    plane: (state) => state.rank ?? 1,
    cellAt: (col, row, rank) => ({ rank, level: row, file: col }),
  },
  // The focus file, seen from outside it (white's left): rank 8 at the left
  // and rank 1 at the right, as on the cube's visible file-1 face.
  "side-white": {
    id: "side-view", prefix: "side", cols: RANK_MAX, rows: LEVEL_MAX, rowsAreLevels: true,
    title: "Side View", planeName: "File", planeField: "file", planeLabel: "FILE", planeMax: FILE_MAX,
    plane: (state) => state.file ?? 1,
    cellAt: (col, row, file) => ({ rank: RANK_MAX + 1 - col, level: row, file }),
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

// The center of grid square (col, row) in a grid of `cols` x `rows`
// centered on `center`.
const sliceSquareCenter = ({ cols, rows }, center, col, row) => ({
  x: center.x + (col - (cols + 1) / 2) * PITCH,
  y: center.y - (row - (rows + 1) / 2) * PITCH,
});

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
  const squareCenter = (col, row) => sliceSquareCenter(config, center, col, row);
  const el = svgEl("g", { id: config.id, display: "none" });
  // The plane on screen, as of the last refresh.
  let plane = config.plane(state);

  // Each square's checker and diag square (inset as in the cube). Only the
  // checkers take clicks; the diag squares, frame and pieces drawn over
  // them pass clicks through.
  const checkerGroup = svgEl("g", { id: `${config.prefix}-checkers` });
  const diagGroup = svgEl("g", {
    id: `${config.prefix}-diag-squares`, display: state.show3dDiagonals ? "inline" : "none",
    "pointer-events": "none",
  });
  const half = PITCH / 2 - DIAG_SQUARE_MARGIN;
  const squares = [];
  forEachSliceSquare(config, (col, row) => {
    const c = squareCenter(col, row);
    const checkerEl = svgEl("rect", {
      x: c.x - PITCH / 2, y: c.y - PITCH / 2, width: PITCH, height: PITCH,
      style: "cursor: pointer",
    });
    // Clicking a square selects its cell in the plane on screen: one
    // display-change per field, handled like the cell indicator cube's.
    checkerEl.addEventListener("click", () => {
      const { level, rank, file } = config.cellAt(col, row, plane);
      emitDisplayChange(checkerEl, "level", level);
      emitDisplayChange(checkerEl, "rank", rank);
      emitDisplayChange(checkerEl, "file", file);
    });
    checkerGroup.appendChild(checkerEl);
    const diagEl = svgEl("rect", {
      x: c.x - half, y: c.y - half, width: half * 2, height: half * 2,
      fill: "none",
      "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
    });
    diagGroup.appendChild(diagEl);
    squares.push({ col, row, checkerEl, diagEl });
  });
  el.appendChild(checkerGroup);
  el.appendChild(diagGroup);

  // Level boundary lines, restroked by refresh to highlight the focus level.
  const frameLines = [];
  const frameGroup = svgEl("g", { id: `${config.prefix}-frame`, "pointer-events": "none" });
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
        stroke: perimeterStroke(boundaryIndex, state.level),
        "stroke-width": 3,
        "stroke-linecap": "square",
      });
      frameLines.push({ el: line, boundaryIndex });
      frameGroup.appendChild(line);
    }
  } else {
    // Seen from above, the plane shown is always the focus level: one
    // outline, always highlighted.
    frameGroup.appendChild(svgEl("rect", {
      x: left, y: rowBoundaryY(config.rows), width: right - left, height: rowBoundaryY(0) - rowBoundaryY(config.rows),
      fill: "none",
      stroke: PERIMETER_HIGHLIGHT,
      "stroke-width": 3,
    }));
  }
  el.appendChild(frameGroup);

  const piecesEl = svgEl("g", { id: `${config.prefix}-pieces`, "pointer-events": "none" });
  el.appendChild(piecesEl);

  // The title, with the plane shown under it.
  const gridTop = rowBoundaryY(config.rows);
  el.appendChild(buildViewTitle(config.title, center.x, gridTop - VIEW_SUBTITLE_LINE, `${config.prefix}-title`));
  const subtitleText = () => `${config.planeName} ${plane}`;
  const subtitleEl = buildViewSubtitle(subtitleText(), center.x, gridTop, `${config.prefix}-subtitle`);
  el.appendChild(subtitleEl);

  // The plane picker, a gap right of the grid, centered on it.
  const planePicker = buildPlanePicker(right + PITCH * 0.3, center.y, {
    id: `${config.prefix}-plane-picker`,
    field: config.planeField, label: config.planeLabel, max: config.planeMax,
    initial: plane,
  });
  el.appendChild(planePicker.el);

  // Recolors every square and redraws the pieces for the plane `state`
  // picks, and highlights the focus level's boundary lines.
  const refresh = (state) => {
    plane = config.plane(state);
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
      if (piece) renderPieceIcon(piece.type, piece.color, squareCenter(col, row), piecesEl);
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
