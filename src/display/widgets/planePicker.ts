// @ts-nocheck
import { PITCH } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { TEXT_STYLE, makeHitRect, emitDisplayChange } from './widgetChrome.ts';

// Picker for the plane a slice view shows (Front: rank, Top: level, Side:
// file), the one coordinate clicking a square there can't change. A column
// of clickable numerals max..1, top to bottom, with a small white up arrow
// above (one plane up) and a small white down arrow below (one plane down),
// and a caption (e.g. "RANK") to the right, rotated 90 degrees clockwise.
// Anchored so its left edge sits at anchorX and its vertical middle at
// centerY.
//
// The picker keeps its own value and fires a `field` display-change event
// (see emitDisplayChange) when a numeral or arrow changes it; the current
// numeral is highlighted. setValue updates it from outside without firing
// an event. Numeral hit rects carry data-value, arrow hit rects data-arrow
// ("up" / "down"), for the driver.

const NP = PITCH * 0.45;           // pitch of one numeral row
const NUM_FONT = NP * 0.62;
const NUM_BOX = NP * 0.85;         // numeral highlight / hit-target size
const ARROW_HALF_W = NP * 0.22;
const ARROW_H = NP * 0.3;
const LABEL_FONT = PITCH * 0.2;
const LABEL_SPACING = 1.5;
const LABEL_GAP = NP * 0.25;       // numeral column to caption

export const buildPlanePicker = (anchorX, centerY, { id, field, label: labelText, max, initial }) => {
  let value = initial;

  const rows = max + 2;            // up arrow, numerals, down arrow
  const x0 = anchorX;
  const y0 = centerY - (rows * NP) / 2;
  const cx = x0 + NP / 2;
  // The center of row i (0 = up arrow, 1..max = numerals max..1, max + 1 =
  // down arrow).
  const rowY = (i) => y0 + (i + 0.5) * NP;

  const g = svgEl("g", { id });

  const numerals = [];
  for (let v = max; v >= 1; v--) {
    const cy = rowY(max - v + 1);
    const highlight = svgEl("rect", {
      x: cx - NUM_BOX / 2, y: cy - NUM_BOX / 2, width: NUM_BOX, height: NUM_BOX, rx: 4, ry: 4,
      fill: "rgba(255,255,255,0.15)",
    });
    g.appendChild(highlight);
    const text = svgEl("text", {
      x: cx, y: cy,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": NUM_FONT,
      ...TEXT_STYLE,
    });
    text.textContent = String(v);
    g.appendChild(text);
    const hit = makeHitRect(cx - NUM_BOX / 2, cy - NUM_BOX / 2, NUM_BOX, NUM_BOX, () => select(v));
    hit.setAttribute("data-value", String(v));
    g.appendChild(hit);
    numerals.push({ value: v, highlight, text });
  }

  const arrows = [];
  const makeArrow = (dir) => {
    const cy = rowY(dir === "up" ? 0 : max + 1);
    const points = dir === "up"
      ? [[cx, cy - ARROW_H / 2], [cx - ARROW_HALF_W, cy + ARROW_H / 2], [cx + ARROW_HALF_W, cy + ARROW_H / 2]]
      : [[cx - ARROW_HALF_W, cy - ARROW_H / 2], [cx + ARROW_HALF_W, cy - ARROW_H / 2], [cx, cy + ARROW_H / 2]];
    const el = svgEl("polygon", {
      points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
      fill: "#ffffff",
      "pointer-events": "none",
    });
    const hit = makeHitRect(x0, cy - NP / 2, NP, NP, () => select(value + (dir === "up" ? 1 : -1)));
    hit.setAttribute("data-arrow", dir);
    g.appendChild(hit);
    g.appendChild(el);
    arrows.push({ dir, el });
  };
  makeArrow("up");
  makeArrow("down");

  const labelX = x0 + NP + LABEL_GAP + LABEL_FONT * 0.6;
  const label = svgEl("text", {
    x: labelX, y: centerY,
    transform: `rotate(90 ${labelX.toFixed(2)} ${centerY.toFixed(2)})`,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    "font-size": LABEL_FONT,
    ...TEXT_STYLE,
    "letter-spacing": LABEL_SPACING,
    opacity: 0.7,
  });
  label.textContent = labelText;
  g.appendChild(label);

  // The current numeral is highlighted; an arrow that can't move further
  // is dimmed.
  const restyle = () => {
    for (const { value: v, highlight, text } of numerals) {
      highlight.setAttribute("display", v === value ? "inline" : "none");
      text.setAttribute("opacity", v === value ? 1 : 0.6);
    }
    for (const { dir, el } of arrows) {
      const atEnd = dir === "up" ? value >= max : value <= 1;
      el.setAttribute("opacity", atEnd ? 0.3 : 1);
    }
  };

  const select = (v) => {
    if (v < 1 || v > max || v === value) return;
    value = v;
    restyle();
    emitDisplayChange(g, field, v);
  };

  const setValue = (v) => {
    value = v;
    restyle();
  };
  restyle();

  const labelHalfLen = (labelText.length * (LABEL_FONT * 0.65 + LABEL_SPACING)) / 2;
  return {
    el: g, setValue,
    minX: x0, maxX: labelX + LABEL_FONT * 0.6,
    minY: Math.min(y0, centerY - labelHalfLen), maxY: Math.max(y0 + rows * NP, centerY + labelHalfLen),
  };
};
