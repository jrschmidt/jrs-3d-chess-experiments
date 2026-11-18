// @ts-nocheck
import { piecesInDrawOrder } from '../drawOrder.ts';
import { LEVEL_MAX, RANK_MAX, FILE_MAX } from '../../gameState/gameState.ts';
import { svgEl } from '../render/svg.ts';
import { renderPieceIcon } from '../render/pieceIcons.ts';
import { emptyBounds, extendBounds } from '../render/bounds.ts';
import {
  HALF, V_LEVEL, add, scale, projectCenter, pointsAttr,
  floorPerimeter, ceilingPerimeter, boundaryCorners, chevronPoints, verticalEdges,
  cellFootprint, cellFootprintInset,
} from '../render/isoProjection.ts';
import {
  PERIMETER_COLOR, PERIMETER_HIGHLIGHT, checkerColor, perimeterStroke,
  isDarkCell, DIAG_COLORS, diagForCell, DIAG_SQUARE_MARGIN, DIAG_SQUARE_STROKE_WIDTH,
} from '../render/cellColors.ts';

// The cube view: all LEVEL_MAX levels drawn as an isometric cube, each
// level's checkerboard clipped to its visible (chevron-shaped) portion, with
// the focus level shown brightest and its frame lines highlighted. Built
// once by buildCubeView; the scene (scene.ts) calls its refresh after every
// display-state change.

// Calls fn(rank, level, file) once for every cell in the cube.
const forEachCell = (fn) => {
  for (let level = 1; level <= LEVEL_MAX; level++) {
    for (let rank = 1; rank <= RANK_MAX; rank++) {
      for (let file = 1; file <= FILE_MAX; file++) {
        fn(rank, level, file);
      }
    }
  }
};

// Attrs for a cell polygon at `level`: a clip-path masking it to its
// visible chevron portion, or none for the always-fully-visible top level.
const clipAttrsForLevel = (level) =>
  level < LEVEL_MAX ? { "clip-path": `url(#visible-clip-${level})` } : {};

// One clipPath per non-top level, masking a cell to just its visible
// (chevron-shaped) portion of that level's floor.
const buildClipDefs = () => {
  const defs = svgEl("defs", {});
  for (let level = 1; level < LEVEL_MAX; level++) {
    const clipPath = svgEl("clipPath", { id: `visible-clip-${level}` });
    clipPath.appendChild(svgEl("polygon", { points: pointsAttr(chevronPoints(level)) }));
    defs.appendChild(clipPath);
  }
  return defs;
};

// The checkerboard floor of every cell, recorded in checkerPolys so
// refresh can recolor it when the focus level changes.
const buildCheckers = (bbox, checkerPolys, focusLevel) => {
  const checkerGroup = svgEl("g", { id: "checkers" });
  forEachCell((rank, level, file) => {
    const corners = cellFootprint(rank, level, file);
    const variant = isDarkCell(rank, level, file) ? "dark" : "light";
    const poly = svgEl("polygon", {
      points: pointsAttr(corners),
      fill: checkerColor(level, variant, focusLevel),
      stroke: "none",
      ...clipAttrsForLevel(level),
    });
    checkerPolys.push({ el: poly, level, variant });
    checkerGroup.appendChild(poly);
    extendBounds(bbox, corners);
  });
  return checkerGroup;
};

// The diagonal-square overlay: one inset outline per cell, colored by its
// diagonal set. Inset inside each cell, so it never extends the bbox.
const buildDiagSquares = (show) => {
  const diagGroupEl = svgEl("g", { id: "diag-squares", display: show ? "inline" : "none" });
  forEachCell((rank, level, file) => {
    const diagId = diagForCell(rank, level, file);
    const diagCorners = cellFootprintInset(rank, level, file, DIAG_SQUARE_MARGIN);
    diagGroupEl.appendChild(svgEl("polygon", {
      points: pointsAttr(diagCorners),
      fill: "none",
      stroke: DIAG_COLORS[diagId],
      "stroke-width": DIAG_SQUARE_STROKE_WIDTH,
      ...clipAttrsForLevel(level),
    }));
  });
  return diagGroupEl;
};

const addEdgeLine = (group, bottom, top, bbox) => {
  group.appendChild(svgEl("line", {
    x1: bottom.x, y1: bottom.y, x2: top.x, y2: top.y,
    stroke: PERIMETER_COLOR,
    "stroke-width": 3,
  }));
  extendBounds(bbox, [bottom, top]);
};

// Repositions the vertical highlight overlays to span the focused level,
// from its floor boundary up to its ceiling boundary.
const updateVerticalHighlights = (verticalHighlightEls, focus) => {
  const lower = boundaryCorners(focus - 1);
  const upper = boundaryCorners(focus);
  for (const { el, corner } of verticalHighlightEls) {
    const a = lower[corner], b = upper[corner];
    el.setAttribute("x1", a.x); el.setAttribute("y1", a.y);
    el.setAttribute("x2", b.x); el.setAttribute("y2", b.y);
  }
};

// The cube's wireframe: floor perimeters, vertical edges, ceiling, and the
// focused level's vertical highlight overlays. Records the boundary lines
// in frameLines and the overlays in verticalHighlightEls, for refresh.
const buildFrame = (bbox, frameLines, verticalHighlightEls, focusLevel) => {
  const floorGroup = svgEl("g", { id: "floors" });

  for (let level = 1; level <= LEVEL_MAX; level++) {
    const corners = floorPerimeter(level);
    const boundaryIndex = level - 1;
    // Only the visible D-C-B path (left edge + front edge) is drawn; the
    // hidden back/right edges (A-D, B-A) are omitted entirely. A <polyline>
    // (not <polygon>) is required here so it doesn't auto-close back from
    // frontRight to backLeft.
    const poly = svgEl("polyline", {
      points: pointsAttr([corners[3], corners[0], corners[1]]),
      fill: "none",
      stroke: perimeterStroke(boundaryIndex, focusLevel),
      "stroke-width": 5,
      "stroke-linejoin": "round",
    });
    frameLines.push({ el: poly, boundaryIndex });
    floorGroup.appendChild(poly);
    extendBounds(bbox, corners);
  }

  for (const [bottom, top] of verticalEdges()) {
    addEdgeLine(floorGroup, bottom, top, bbox);
  }

  // The back-right corner (A) is otherwise fully hidden — see verticalEdges
  // in isoProjection.ts — but its Level-5 segment bounds the always-visible
  // ceiling face, so just that top-level span is drawn on its own.
  {
    const bottom = boundaryCorners(LEVEL_MAX - 1).backRight;
    const top = boundaryCorners(LEVEL_MAX).backRight;
    addEdgeLine(floorGroup, bottom, top, bbox);
  }

  {
    const corners = ceilingPerimeter();
    const boundaryIndex = LEVEL_MAX;
    const poly = svgEl("polygon", {
      points: pointsAttr(corners),
      fill: "none",
      stroke: perimeterStroke(boundaryIndex, focusLevel),
      "stroke-width": 3,
      "stroke-linejoin": "round",
    });
    frameLines.push({ el: poly, boundaryIndex });
    floorGroup.appendChild(poly);
    extendBounds(bbox, corners);
  }

  // Highlight overlays for the focused level's vertical edge segments,
  // drawn last so they paint on top of the base vertical lines above.
  for (const corner of ["frontLeft", "frontRight", "backLeft"]) {
    const el = svgEl("line", { stroke: PERIMETER_HIGHLIGHT, "stroke-width": 3 });
    verticalHighlightEls.push({ el, corner });
    floorGroup.appendChild(el);
  }
  updateVerticalHighlights(verticalHighlightEls, focusLevel);

  return floorGroup;
};

// Builds the cube view for the starting display state. Returns a
// ViewController (see viewController.ts) plus:
// - bbox: the cube's unscaled screen bounds, which the scene lays out around.
// - drawPieces(): draws every piece into the cube, back to front (see
//   drawOrder.ts) so nearer icons paint over farther ones. The cube's
//   pieces are drawn once, after the game state is set up; the slice views
//   redraw theirs on every refresh, since they change with the plane shown.
export const buildCubeView = (state) => {
  const checkerPolys = [];
  const frameLines = [];
  const verticalHighlightEls = [];
  const bbox = emptyBounds();

  // Append order is paint order: checkers under diag squares under the frame.
  const el = svgEl("g", { id: "cube" });
  el.appendChild(buildClipDefs());
  el.appendChild(buildCheckers(bbox, checkerPolys, state.level));
  const diagGroupEl = buildDiagSquares(state.show3dDiagonals);
  el.appendChild(diagGroupEl);
  el.appendChild(buildFrame(bbox, frameLines, verticalHighlightEls, state.level));

  // Recolors checkers and frame lines in place (no geometry change, except
  // the vertical highlights, which reposition) for the focus level, and
  // shows or hides the diag squares.
  const refresh = ({ level, show3dDiagonals }) => {
    for (const { el, level: cellLevel, variant } of checkerPolys) {
      el.setAttribute("fill", checkerColor(cellLevel, variant, level));
    }
    for (const { el, boundaryIndex } of frameLines) {
      el.setAttribute("stroke", perimeterStroke(boundaryIndex, level));
    }
    updateVerticalHighlights(verticalHighlightEls, level);
    diagGroupEl.setAttribute("display", show3dDiagonals ? "inline" : "none");
  };

  const drawPieces = () => {
    for (const { type, color, location } of piecesInDrawOrder('cube-view')) {
      const { level, rank, file } = location;
      const center = add(projectCenter(rank, level, file), scale(V_LEVEL, -HALF));
      renderPieceIcon(type, color, center, el);
    }
  };

  return { el, bbox, refresh, drawPieces };
};
