// @ts-nocheck
import { PITCH } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { TEXT_STYLE, makePanelRect, makeHitRect, emitDisplayChange } from './widgetChrome.ts';

// Small widget for choosing one focus coordinate (level, rank or file): a
// numeral, an up/down arrow pair, and a label (e.g. "LEVEL"), anchored so
// its horizontal midpoint sits on (anchorX, anchorY) at its bottom edge.
// levelFocusWidget.ts, rankFocusWidget.ts and fileFocusWidget.ts each wrap
// it with their own group id, label and displayState field.
//
// The widget keeps its own current value, clamped to min..max, and fires a
// `field` display-change event (see emitDisplayChange) whenever an arrow
// changes it. setValue updates the shown value from outside (e.g. when a
// view change resets displayState) without firing an event.
export const buildFocusWidget = (anchorX, anchorY, { id, label: labelText, field, initial, min, max }) => {
  let value = initial;

  const W = PITCH * 1.0;
  const H = PITCH * 1.3;
  const x0 = anchorX - W / 2;
  const x1 = anchorX + W / 2;
  const y0 = anchorY - H;
  const y1 = anchorY;
  const cx = (x0 + x1) / 2;

  const g = svgEl("g", { id });

  g.appendChild(makePanelRect(x0, y0, W, H));

  const labelH = H * 0.22;
  const label = svgEl("text", {
    x: cx, y: y0 + labelH * 0.65,
    "text-anchor": "middle",
    "font-size": PITCH * 0.16,
    ...TEXT_STYLE,
    "letter-spacing": "1.5",
    opacity: 0.7,
  });
  label.textContent = labelText;
  g.appendChild(label);

  const contentY0 = y0 + labelH;
  const contentY1 = y1;
  const numeralColX1 = x0 + W * 0.6;
  const buttonColX0 = numeralColX1;

  const numeralEl = svgEl("text", {
    x: (x0 + numeralColX1) / 2,
    y: (contentY0 + contentY1) / 2,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": PITCH * 0.55,
    ...TEXT_STYLE,
  });
  numeralEl.textContent = String(value);
  g.appendChild(numeralEl);

  const step = (delta) => {
    const next = value + delta;
    if (next < min || next > max) return;
    value = next;
    numeralEl.textContent = String(value);
    emitDisplayChange(g, field, value);
  };

  const buttonH = (contentY1 - contentY0) / 2;
  const margin = 6;
  const bcx = (buttonColX0 + x1) / 2;
  const halfW = (x1 - buttonColX0) / 2 - margin;

  const makeButton = (yTop, yBottom, pointing, onClick) => {
    g.appendChild(makeHitRect(buttonColX0, yTop, x1 - buttonColX0, yBottom - yTop, onClick));

    const triTop = yTop + margin;
    const triBottom = yBottom - margin;
    const points = pointing === "up"
      ? `${bcx},${triTop} ${bcx - halfW},${triBottom} ${bcx + halfW},${triBottom}`
      : `${bcx - halfW},${triTop} ${bcx + halfW},${triTop} ${bcx},${triBottom}`;
    g.appendChild(svgEl("polygon", {
      points,
      fill: "#cdd3de",
      "pointer-events": "none",
    }));
  };

  makeButton(contentY0, contentY0 + buttonH, "up", () => step(1));
  makeButton(contentY0 + buttonH, contentY1, "down", () => step(-1));

  const setValue = (v) => {
    value = v;
    numeralEl.textContent = String(value);
  };

  return { el: g, setValue, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};
