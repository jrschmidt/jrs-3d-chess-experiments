// @ts-nocheck
import { PITCH } from '../display/render/constants.ts';
import { svgEl } from '../display/render/svg.ts';
import { TEXT_STYLE, makePanelRect, makeHitRect } from './widgetChrome.ts';

// Selector for the camera view: four options stacked vertically, anchored
// so its right edge sits at anchorRightX and its bottom at anchorBottomY
// (the caller passes a point just left of the cube's bottom back-left
// corner, so the widget sits beside the cube).
//
// The widget keeps its own selected option and calls onChange(id, label)
// whenever a different option is clicked; the caller owns whatever that
// change requires.
const OPTIONS = [
  { id: "cube", label: "Cube View" },
  { id: "front", label: "Front View" },
  { id: "top", label: "Top View" },
  { id: "side", label: "Side View" },
];

export const buildViewOption = (anchorRightX, anchorBottomY, { initial, onChange }) => {
  let value = initial;

  const W = PITCH * 1.4;
  const rowH = PITCH * 0.35;
  const H = rowH * OPTIONS.length;
  const x0 = anchorRightX - W;
  const x1 = anchorRightX;
  const y0 = anchorBottomY - H;
  const y1 = anchorBottomY;
  const textX = x0 + PITCH * 0.15;

  const g = svgEl("g", { id: "view-option" });

  g.appendChild(makePanelRect(x0, y0, W, H));

  const rows = OPTIONS.map(({ id, label }, i) => {
    const rowY0 = y0 + rowH * i;

    const highlight = svgEl("rect", {
      x: x0 + 2, y: rowY0 + 2, width: W - 4, height: rowH - 4, rx: 4, ry: 4,
      fill: "rgba(255,255,255,0.15)",
    });
    g.appendChild(highlight);

    const text = svgEl("text", {
      x: textX, y: rowY0 + rowH / 2,
      "dominant-baseline": "central",
      "font-size": PITCH * 0.2,
      ...TEXT_STYLE,
    });
    text.textContent = label;
    g.appendChild(text);

    g.appendChild(makeHitRect(x0, rowY0, W, rowH, () => {
      if (id === value) return;
      value = id;
      restyle();
      onChange(id, label);
    }));

    return { id, highlight, text };
  });

  const restyle = () => {
    for (const { id, highlight, text } of rows) {
      const selected = id === value;
      highlight.setAttribute("display", selected ? "inline" : "none");
      text.setAttribute("opacity", selected ? 1 : 0.6);
    }
  };
  restyle();

  return { el: g, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};
