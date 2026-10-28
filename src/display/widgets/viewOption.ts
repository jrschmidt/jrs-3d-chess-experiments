// @ts-nocheck
import { PITCH } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { TEXT_STYLE, makePanelRect, makeHitRect, emitDisplayChange } from './widgetChrome.ts';

// Selector for the camera view: four options stacked vertically, anchored
// so its right edge sits at anchorRightX and its vertical midpoint at
// anchorCenterY (the caller passes a point just left of the diag toggle,
// halfway down the page, so the widget sits beside it).
//
// The widget keeps its own selected option and fires a "view"
// display-change event (see emitDisplayChange) whenever a different option
// is clicked. Option ids are ViewNames (see drawOrder.ts); Front and Side
// use the white-side variant for now.
const OPTIONS = [
  { id: "cube-view", label: "Cube View" },
  { id: "front-white", label: "Front View" },
  { id: "top-view", label: "Top View" },
  { id: "side-white", label: "Side View" },
];

export const buildViewOption = (anchorRightX, anchorCenterY, { initial }) => {
  let value = initial;

  const W = PITCH * 1.4;
  const rowH = PITCH * 0.35;
  const H = rowH * OPTIONS.length;
  const x0 = anchorRightX - W;
  const x1 = anchorRightX;
  const y0 = anchorCenterY - H / 2;
  const y1 = anchorCenterY + H / 2;
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
      emitDisplayChange(g, "view", id);
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
