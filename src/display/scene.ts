// @ts-nocheck
import { pieceAt, PIECE_NAMES } from '../gameState/gameState.ts';
import { PITCH } from './render/constants.ts';
import { svgEl } from './render/svg.ts';
import { mergeBounds } from './render/bounds.ts';
import {
  PERIMETER_COLOR, CHECKER_COLORS, isDarkCell, DIAG_COLORS, diagForCell,
} from './render/cellColors.ts';
import { buildCubeView } from './drawCube/drawCube.ts';
import { buildSliceViews } from './drawSlice/drawSlice.ts';
import { buildCellIndicatorCube } from './widgets/cellIndicatorCube.ts';
import { buildDiagToggle } from './widgets/diagToggle.ts';
import { buildViewOption } from './widgets/viewOption.ts';
import { buildViewModePicker } from './widgets/viewModePicker.ts';
import { buildCellDisplay } from './widgets/cellDisplay.ts';
import {
  DISPLAY_CHANGE, TEXT_STYLE, buildViewTitle, buildSeparatorLine,
} from './widgets/widgetChrome.ts';
import {
  getDisplayState,
  changeView, setPerspective, setLevel, setRank, setFile, setShow3dDiagonals, setViewMode,
} from './displayState.ts';

// The scene controller: builds the whole #scene SVG (the views, the
// controls, the cell display), lays it out, and keeps it in sync with
// displayState. Each view is built by its own module (drawCube/drawCube.ts,
// drawSlice/drawSlice.ts) and handed back as a ViewController (see
// viewController.ts); this module only shows, hides and refreshes them.

// Populated by buildScene: one ViewController per implemented view, keyed
// by view name. refreshDisplay shows the current view's, or the "THIS VIEW
// / NOT IMPLEMENTED" placeholder for a view that isn't drawn yet
// (front-black, side-black).
let views = {};
// The cube view's controller, also kept on its own for drawPieces.
let cubeView = null;
let notImplementedEl = null;
// The cube's title, outside the cube's group (see buildScene), so shown and
// hidden separately.
let cubeTitleEl = null;

// Populated by buildControls; refreshDisplay resyncs them to displayState
// (refreshCellDisplay updates the cell display).
let cellDisplayEl = null;
let cellIndicatorCubeEl = null;
let diagToggleEl = null;
let viewModePickerEl = null;

// Draws the cube's pieces, once the game state is set up (see app.ts). The
// slice views draw their own pieces on every refresh.
export const renderPieceIcons = () => {
  cubeView.drawPieces();
  refreshDisplay();
};

// Brings everything that depends on displayState up to date. Cheap enough
// to run in full after any change, rather than tracking which field moved.
const refreshDisplay = () => {
  const state = getDisplayState();
  for (const [view, controller] of Object.entries(views)) {
    controller.el.setAttribute("display", view === state.view ? "inline" : "none");
    controller.refresh(state);
  }
  notImplementedEl.setAttribute("display", state.view in views ? "none" : "inline");
  cubeTitleEl.setAttribute("display", state.view === "cube-view" ? "inline" : "none");
  // A view change can reset fields other widgets own, so resync them.
  cellIndicatorCubeEl.setValue({ level: state.level, rank: state.rank, file: state.file });
  diagToggleEl.setValue(state.show3dDiagonals);
  viewModePickerEl.setValue(state.viewMode);
  refreshCellDisplay(state);
};

// Shows the focus cell (level, rank, file) in the cell display: its focus
// checker color, its diagonal color when diagonals are on, and its piece.
const refreshCellDisplay = ({ level, rank, file, show3dDiagonals }) => {
  const isCell = level !== null && rank !== null && file !== null;
  const piece = isCell ? pieceAt({ level, rank, file }) : undefined;
  cellDisplayEl.update({
    level, rank, file,
    fill: isCell ? CHECKER_COLORS.focus[isDarkCell(rank, level, file) ? "dark" : "light"] : null,
    diagColor: isCell && show3dDiagonals ? DIAG_COLORS[diagForCell(rank, level, file)] : null,
    piece: piece ? { type: piece.type, color: piece.color, name: PIECE_NAMES[piece.type] } : null,
  });
};

// Every widget reports its changes as a display-change event {field, value}
// (see emitDisplayChange in widgets/widgetChrome.ts); this maps each field
// to the displayState setter that records it. A view change also resets
// the other fields, except the selected cell, when that view has an
// initial state (see changeView).
const SETTERS = {
  view: changeView,
  perspective: setPerspective,
  level: setLevel,
  rank: setRank,
  file: setFile,
  show3dDiagonals: setShow3dDiagonals,
  viewMode: setViewMode,
};

const onDisplayChange = (e) => {
  const { field, value } = e.detail;
  SETTERS[field](value);
  refreshDisplay();
};

const NOT_IMPLEMENTED_COLOR = "#33cc33";

// Two large green lines, "THIS VIEW" / "NOT IMPLEMENTED", centered on the
// cube's bbox (pass it before the widgets are merged in). Shown in place of
// the hidden cube, so the viewBox — and every widget's position — is the
// same in every view.
const buildNotImplemented = (bbox) => {
  const g = svgEl("g", { id: "not-implemented", display: "none" });
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const fontSize = PITCH * 0.8;
  ["THIS VIEW", "NOT IMPLEMENTED"].forEach((line, i) => {
    const text = svgEl("text", {
      x: cx, y: cy + fontSize * 0.6 * (i === 0 ? -1 : 1),
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": fontSize,
      "font-weight": "bold",
      "font-family": TEXT_STYLE["font-family"],
      fill: NOT_IMPLEMENTED_COLOR,
    });
    text.textContent = line;
    g.appendChild(text);
  });
  return g;
};

// The gap on each side of the separator line between the view and the
// widget column.
const SEPARATOR_GAP = PITCH * 0.3;

// Moves widgets right by dx (their root groups have no transform of their
// own), keeping their bounds in step.
const shiftX = (widgets, dx) => {
  for (const w of widgets) {
    w.el.setAttribute("transform", `translate(${dx.toFixed(2)}, 0)`);
    w.minX += dx;
    w.maxX += dx;
  }
};

// The widget column, right of the cube's bbox (which every view fits in) and
// starting at colLeft: the cell display at the top; halfway down, a row of
// the view selector, the view mode picker and the diagonal toggle, left to
// right; and the cell indicator cube at the bottom, level with the cube's
// bottom. The three rows are centered on the column's center line. bbox must cover just the cube; the widgets are
// merged into it.
const buildControls = (svg, bbox, colLeft, state) => {
  // Halfway down the page: the viewBox is centered vertically on the page,
  // and no widget extends the bbox vertically past the cube.
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const gap = PITCH * 0.2;

  // Built at the column's left, then centered below.
  const cellDisplay = buildCellDisplay(colLeft, bbox.minY + PITCH * 0.4);
  const diagToggle = buildDiagToggle(colLeft, centerY, { initial: state.show3dDiagonals });
  const viewModePicker = buildViewModePicker(diagToggle.minX - gap, centerY, { initial: state.viewMode });
  const viewOption = buildViewOption(viewModePicker.minX - gap, centerY, { initial: state.view });
  const cellIndicatorCube = buildCellIndicatorCube(colLeft, bbox.maxY, {
    initial: { level: state.level, rank: state.rank, file: state.file },
    checkerColors: CHECKER_COLORS.focus,
    edgeColor: PERIMETER_COLOR,
    isDarkCell,
  });

  const rows = [[cellDisplay], [viewOption, viewModePicker, diagToggle], [cellIndicatorCube]];
  const span = (row) => ({
    minX: Math.min(...row.map((w) => w.minX)), maxX: Math.max(...row.map((w) => w.maxX)),
  });
  const width = Math.max(...rows.map((row) => span(row).maxX - span(row).minX));
  const cx = colLeft + width / 2;
  for (const row of rows) {
    const { minX, maxX } = span(row);
    shiftX(row, cx - (minX + maxX) / 2);
    for (const w of row) {
      svg.appendChild(w.el);
      mergeBounds(bbox, w);
    }
  }

  cellDisplayEl = cellDisplay;
  diagToggleEl = diagToggle;
  viewModePickerEl = viewModePicker;
  cellIndicatorCubeEl = cellIndicatorCube;
};

// Returns the viewBox rect.
const fitViewBox = (svg, bbox) => {
  const pad = PITCH * 0.6;
  const vbX = bbox.minX - pad, vbY = bbox.minY - pad;
  const vbW = (bbox.maxX - bbox.minX) + pad * 2, vbH = (bbox.maxY - bbox.minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return { x: vbX, y: vbY, width: vbW, height: vbH };
};

export const buildScene = () => {
  const svg = document.getElementById("scene");
  const state = getDisplayState();

  // Append order is paint order.
  cubeView = buildCubeView(state);
  svg.appendChild(cubeView.el);
  const cubeBbox = { ...cubeView.bbox };

  const sliceViews = buildSliceViews(cubeBbox, state);
  for (const controller of Object.values(sliceViews)) {
    svg.appendChild(controller.el);
  }
  views = { "cube-view": cubeView, ...sliceViews };

  notImplementedEl = buildNotImplemented(cubeBbox);
  svg.appendChild(notImplementedEl);

  // Outside the cube's group, in the viewBox's top padding (see fitViewBox).
  const { minX, maxX, minY } = cubeBbox;
  cubeTitleEl = buildViewTitle("Cube View", (minX + maxX) / 2, minY, "cube-title");
  svg.appendChild(cubeTitleEl);

  // The separator line between the views and the widget column, the
  // viewBox's full height.
  const sepX = cubeBbox.maxX + SEPARATOR_GAP;
  const bbox = { ...cubeBbox };
  buildControls(svg, bbox, sepX + SEPARATOR_GAP, state);
  const vb = fitViewBox(svg, bbox);
  svg.appendChild(buildSeparatorLine(sepX, vb.y, vb.y + vb.height, "widget-separator"));

  svg.addEventListener(DISPLAY_CHANGE, onDisplayChange);
  refreshDisplay();
};
