// @ts-nocheck
import { PITCH } from '../display/render/constants.ts';
import { svgEl } from '../display/render/svg.ts';
import { TEXT_STYLE, makePanelRect, makeHitRect } from './widgetChrome.ts';

// Binary on/off control for the diagonal-square overlay, anchored so its
// left edge sits at anchorLeftX and its vertical midpoint sits at
// anchorCenterY (the caller passes the focus widget's right edge and
// vertical center, so it sits alongside it). A 3-line title sits above the
// clickable button, which itself just reads "ON"/"OFF".
//
// The toggle keeps its own on/off value and calls onToggle(on) on each
// click; the caller owns showing or hiding the overlay.
const TITLE_LINES = ["SHOW THREE", "DIMENSIONAL", "DIAGONALS"];

export const buildDiagToggle = (anchorLeftX, anchorCenterY, { initial, onToggle }) => {
  let on = initial;

  const W = PITCH * 1.3;
  const titleFontSize = PITCH * 0.12;
  const titleLineHeight = titleFontSize * 1.3;
  const titleH = titleLineHeight * TITLE_LINES.length + PITCH * 0.08;
  const buttonH = PITCH * 0.45;
  const H = titleH + buttonH;
  const x0 = anchorLeftX;
  const x1 = anchorLeftX + W;
  const y0 = anchorCenterY - H / 2;
  const y1 = anchorCenterY + H / 2;
  const buttonY0 = y0 + titleH;
  const cx = (x0 + x1) / 2;
  const buttonCy = (buttonY0 + y1) / 2;

  const g = svgEl("g", { id: "diag-toggle" });

  const title = svgEl("text", {
    x: cx, y: y0 + titleLineHeight * 0.8,
    "text-anchor": "middle",
    "font-size": titleFontSize,
    ...TEXT_STYLE,
    "letter-spacing": "0.5",
    opacity: 0.7,
  });
  TITLE_LINES.forEach((line, i) => {
    const tspan = svgEl("tspan", { x: cx, dy: i === 0 ? 0 : titleLineHeight });
    tspan.textContent = line;
    title.appendChild(tspan);
  });
  g.appendChild(title);

  g.appendChild(makePanelRect(x0, buttonY0, W, buttonH));

  const stateLabel = svgEl("text", {
    x: cx, y: buttonCy,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": PITCH * 0.22,
    ...TEXT_STYLE,
  });
  stateLabel.textContent = on ? "ON" : "OFF";
  g.appendChild(stateLabel);

  g.appendChild(makeHitRect(x0, buttonY0, W, buttonH, () => {
    on = !on;
    stateLabel.textContent = on ? "ON" : "OFF";
    onToggle(on);
  }));

  return { el: g, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};
