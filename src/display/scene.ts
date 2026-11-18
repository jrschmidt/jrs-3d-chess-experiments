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
import { buildCellPickerCube } from './widgets/cellPickerCube.ts';
import { buildDiagToggle } from './widgets/diagToggle.ts';
import { buildViewOption } from './widgets/viewOption.ts';
import { buildCellDisplay } from './widgets/cellDisplay.ts';
import { DISPLAY_CHANGE, TEXT_STYLE, buildViewTitle } from './widgets/widgetChrome.ts';
import {
  getDisplayState,
  changeView, setPerspective, setLevel, setRank, setFile, setShow3dDiagonals,
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
// The cube view's controller, also kept on its own for drawPieces and
// shrinkCubeToClear.
let cubeView = null;
let notImplementedEl = null;
// The cube's title, outside the cube's group (see buildScene), so shown and
// hidden separately.
let cubeTitleEl = null;

// Populated by buildScene; refreshCellDisplay updates it.
let cellDisplayEl = null;

// Populated by buildControls; refreshDisplay resyncs them to displayState.
let cellPickerCubeEl = null;
let diagToggleEl = null;

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
  cellPickerCubeEl.setValue({ level: state.level, rank: state.rank, file: state.file });
  diagToggleEl.setValue(state.show3dDiagonals);
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

// The cell picker cube just right of the cube, level with its bottom — so bbox
// must already cover the whole cube — then the diagonal toggle at the
// right, halfway down, with the view selector just to its left.
const buildControls = (svg, bbox, state) => {
  // Halfway down the page: the viewBox is centered vertically on the page,
  // and no widget extends the bbox vertically past the cube.
  const centerY = (bbox.minY + bbox.maxY) / 2;
  const gap = PITCH * 0.2;

  const cellPickerCube = buildCellPickerCube(bbox.maxX + gap, bbox.maxY, {
    initial: { level: state.level, rank: state.rank, file: state.file },
    checkerColors: CHECKER_COLORS.focus,
    edgeColor: PERIMETER_COLOR,
    isDarkCell,
  });
  svg.appendChild(cellPickerCube.el);
  mergeBounds(bbox, cellPickerCube);
  cellPickerCubeEl = cellPickerCube;

  // Right-aligned with the cell picker cube, the scene's rightmost point.
  const diagToggle = buildDiagToggle(cellPickerCube.maxX, centerY, {
    initial: state.show3dDiagonals,
  });
  svg.appendChild(diagToggle.el);
  mergeBounds(bbox, diagToggle);
  diagToggleEl = diagToggle;

  // The view selector sits a gap left of the diag toggle, centered on the
  // same height.
  const viewOption = buildViewOption(diagToggle.minX - gap, centerY, {
    initial: state.view,
  });
  svg.appendChild(viewOption.el);
  mergeBounds(bbox, viewOption);
};

// Returns the viewBox's top-right corner.
const fitViewBox = (svg, bbox) => {
  const pad = PITCH * 0.6;
  const vbX = bbox.minX - pad, vbY = bbox.minY - pad;
  const vbW = (bbox.maxX - bbox.minX) + pad * 2, vbH = (bbox.maxY - bbox.minY) + pad * 2;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return { x: vbX + vbW, y: vbY };
};

// The cell display's margin from the top and right edges of the page.
const CELL_DISPLAY_MARGIN = PITCH;

// Moves the cell display so it sits CELL_DISPLAY_MARGIN in from the page's
// top-right corner. It's built that far in from the viewBox's corner, and
// the page's corner is always at or beyond the viewBox's (the viewBox is
// letterboxed with "meet"), so this only ever moves it up or right, away
// from the rest of the scene. Reruns on every resize.
const positionCellDisplay = (svg) => {
  const rect = svg.getBoundingClientRect();
  const pt = svg.createSVGPoint();
  pt.x = rect.right; pt.y = rect.top;
  const corner = pt.matrixTransform(svg.getScreenCTM().inverse());
  const dx = Math.max(0, corner.x - CELL_DISPLAY_MARGIN - cellDisplayEl.maxX);
  const dy = Math.min(0, corner.y + CELL_DISPLAY_MARGIN - cellDisplayEl.minY);
  cellDisplayEl.el.setAttribute("transform", `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
};

// Shrinks the cube about its bottom-left corner, just enough that its right
// edge clears the cell display's left edge. Everything else is laid out
// from the unscaled cube, so nothing else moves; the cube's piece icons and
// diag squares are inside its group, so they shrink with it.
const shrinkCubeToClear = (cubeBbox, clearX) => {
  const px = cubeBbox.minX, py = cubeBbox.maxY;
  const k = Math.min(1, (clearX - px) / (cubeBbox.maxX - px));
  cubeView.el.setAttribute("transform",
    `translate(${px.toFixed(2)}, ${py.toFixed(2)}) scale(${k.toFixed(4)}) translate(${(-px).toFixed(2)}, ${(-py).toFixed(2)})`);
  return k;
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

  const bbox = { ...cubeBbox };
  buildControls(svg, bbox, state);
  const vbCorner = fitViewBox(svg, bbox);

  cellDisplayEl = buildCellDisplay(vbCorner.x - CELL_DISPLAY_MARGIN, vbCorner.y + CELL_DISPLAY_MARGIN);
  svg.appendChild(cellDisplayEl.el);
  const k = shrinkCubeToClear(cubeBbox, cellDisplayEl.minX - PITCH * 0.3);

  // Outside the cube's group, so it doesn't shrink with the cube, but placed
  // over the shrunken cube (scaled about its bottom-left corner). It sits
  // in the viewBox's top padding (see fitViewBox).
  const { minX, maxX, minY, maxY } = cubeBbox;
  cubeTitleEl = buildViewTitle("Cube View", minX + k * ((minX + maxX) / 2 - minX), maxY - k * (maxY - minY), "cube-title");
  svg.appendChild(cubeTitleEl);

  positionCellDisplay(svg);
  window.addEventListener("resize", () => positionCellDisplay(svg));

  svg.addEventListener(DISPLAY_CHANGE, onDisplayChange);
  refreshDisplay();
};
