// @ts-nocheck
import { PITCH } from '../render/constants.ts';
import { svgEl, parseSvgFragment } from '../render/svg.ts';
import { PIECE_ICONS } from '../render/pieceIcons.ts';
import { TEXT_STYLE, makePanelRect } from './widgetChrome.ts';

// Read-only display of the focus cell (the cell at displayState's level,
// rank and file), anchored so its top-right corner sits at (anchorRightX,
// anchorTopY). From top to bottom: the coordinates ("5, 2, 4"); the piece's
// color ("WHITE"/"BLACK"); an enlarged copy of the cell — its checker
// color, its diagonal color as an inset outline when diagonals are on, and
// the piece icon or "EMPTY" — with the piece letter to its left and the
// LEVEL/RANK/FILE values to its right; and the piece's name.
//
// It fires no events. update() redraws it from values the caller computes
// (the widget doesn't read displayState or the board itself):
//   { level, rank, file, fill, diagColor, piece }
// where diagColor is null when diagonals are off, and piece is null or
// { type, color, name }.

const W = PITCH * 4;          // overall width; height follows from the content
const PAD = PITCH * 0.12;
const SQUARE = PITCH * 1.6;   // the enlarged cell
const LETTER_COL = PITCH * 0.95;
const COL_GAP = PITCH * 0.1;
const COORDS_FONT = PITCH * 0.55;
const COLOR_FONT = PITCH * 0.14;
const TEXT_FONT = PITCH * 0.2;
const NAME_FONT = PITCH * 0.22;
const LETTER_FONT = SQUARE * 0.8;     // cap height ~60% of the square
const DIAG_INSET = 4;
const DIAG_STROKE = 2;
const PIECE_TEXT_COLORS = { white: "#ffffff", black: "#000000" };
const NO_CELL_FILL = "#555555";       // shown when a coordinate is null

export const buildCellDisplay = (anchorRightX, anchorTopY) => {
  const x1 = anchorRightX;
  const x0 = x1 - W;
  const y0 = anchorTopY;

  const coordsBaseline = y0 + PAD + COORDS_FONT * 0.85;
  const colorBaseline = coordsBaseline + COORDS_FONT * 0.25 + COLOR_FONT * 1.1;
  const sqX0 = x0 + PAD + LETTER_COL + COL_GAP;
  const sqY0 = colorBaseline + 2;
  const sqCx = sqX0 + SQUARE / 2;
  const sqCy = sqY0 + SQUARE / 2;
  const textX0 = sqX0 + SQUARE + COL_GAP;
  const nameBaseline = sqY0 + SQUARE + NAME_FONT * 1.1;
  const y1 = nameBaseline + NAME_FONT * 0.3 + PAD;
  const cx = (x0 + x1) / 2;

  const g = svgEl("g", { id: "cell-display" });
  g.appendChild(makePanelRect(x0, y0, W, y1 - y0));

  const text = (id, attrs) => {
    const el = svgEl("text", { id, ...TEXT_STYLE, ...attrs });
    g.appendChild(el);
    return el;
  };

  const coordsEl = text("cell-display-coords", {
    x: cx, y: coordsBaseline, "text-anchor": "middle", "font-size": COORDS_FONT,
  });
  const colorEl = text("cell-display-color", {
    x: sqCx, y: colorBaseline, "text-anchor": "middle", "font-size": COLOR_FONT,
    "letter-spacing": "1",
  });

  const squareEl = svgEl("rect", { x: sqX0, y: sqY0, width: SQUARE, height: SQUARE });
  g.appendChild(squareEl);
  const diagEl = svgEl("rect", {
    id: "cell-display-diag",
    x: sqX0 + DIAG_INSET, y: sqY0 + DIAG_INSET,
    width: SQUARE - DIAG_INSET * 2, height: SQUARE - DIAG_INSET * 2,
    fill: "none", "stroke-width": DIAG_STROKE,
  });
  g.appendChild(diagEl);
  // Icons are drawn for a PITCH-sized cell, so scale them up to the square.
  const iconEl = svgEl("g", {
    id: "cell-display-icon",
    transform: `translate(${sqCx.toFixed(2)}, ${sqCy.toFixed(2)}) scale(${(SQUARE / PITCH).toFixed(3)})`,
  });
  g.appendChild(iconEl);
  const emptyEl = text("cell-display-empty", {
    x: sqCx, y: sqCy, "text-anchor": "middle", "dominant-baseline": "central",
    "font-size": PITCH * 0.24, "letter-spacing": "2", opacity: 0.35,
  });
  emptyEl.textContent = "EMPTY";

  const letterEl = text("cell-display-letter", {
    x: x0 + PAD + LETTER_COL / 2, y: sqCy, "text-anchor": "middle",
    "dominant-baseline": "central", "font-size": LETTER_FONT, "font-weight": "bold",
  });

  // LEVEL / RANK / FILE, labels left-aligned and numbers in a right-aligned
  // column, spread evenly down the square's height.
  const valueEls = ["LEVEL", "RANK", "FILE"].map((label, i) => {
    const y = sqY0 + SQUARE * (i + 0.5) / 3;
    const labelEl = text(`cell-display-${label.toLowerCase()}-label`, {
      x: textX0, y, "dominant-baseline": "central", "font-size": TEXT_FONT, opacity: 0.7,
    });
    labelEl.textContent = label;
    return text(`cell-display-${label.toLowerCase()}`, {
      x: x1 - PAD, y, "text-anchor": "end", "dominant-baseline": "central", "font-size": TEXT_FONT,
    });
  });

  const nameEl = text("cell-display-name", {
    x: sqCx, y: nameBaseline, "text-anchor": "middle", "font-size": NAME_FONT,
  });

  const update = ({ level, rank, file, fill, diagColor, piece }) => {
    const coords = [level, rank, file].map((v) => (v === null ? "–" : String(v)));
    coordsEl.textContent = coords.join(", ");
    coords.forEach((v, i) => { valueEls[i].textContent = v; });

    squareEl.setAttribute("fill", fill ?? NO_CELL_FILL);
    diagEl.setAttribute("display", diagColor ? "inline" : "none");
    if (diagColor) diagEl.setAttribute("stroke", diagColor);

    iconEl.replaceChildren();
    emptyEl.setAttribute("display", piece ? "none" : "inline");
    for (const el of [colorEl, letterEl, nameEl]) el.setAttribute("display", piece ? "inline" : "none");
    if (!piece) return;

    const textColor = PIECE_TEXT_COLORS[piece.color];
    colorEl.textContent = piece.color.toUpperCase();
    colorEl.setAttribute("fill", textColor);
    letterEl.textContent = piece.type;
    letterEl.setAttribute("fill", textColor);
    nameEl.textContent = piece.name;
    iconEl.appendChild(parseSvgFragment(PIECE_ICONS[`${piece.type.toLowerCase()}${piece.color[0]}`]));
  };

  return { el: g, update, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};
