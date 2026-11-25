// @ts-nocheck
import { PITCH } from '../render/constants.ts';
import { svgEl } from '../render/svg.ts';
import { TEXT_STYLE, makePanelRect, makeHitRect, emitDisplayChange } from './widgetChrome.ts';

// Picker for how the views are drawn (displayState's viewMode): a "View
// Mode" caption above a stack of options, anchored so its right edge sits
// at anchorRightX and its vertical midpoint at anchorCenterY (the caller
// puts it between the view selector and the diag toggle).
//
// The picker keeps its own selected option and fires a "viewMode"
// display-change event (see emitDisplayChange) whenever a different option
// is clicked. setValue updates the shown option from outside (e.g. when a
// view change resets displayState) without firing an event. Option ids are
// ViewModes (see displayState.ts).
// Iso-H is the name, in the isopop branch, for the changes and experiments
// introduced there (on main the mode is Iso-X, without them).
const OPTIONS = [
  { id: "basic", label: "Basic" },
  { id: "iso", label: "Iso" },
  { id: "isoH", label: "Iso-H" },
];
const CAPTION = "View Mode";

export const buildViewModePicker = (anchorRightX, anchorCenterY, { initial }) => {
  let value = initial;

  const W = PITCH * 1.1;
  const captionFontSize = PITCH * 0.16;
  const captionH = captionFontSize * 1.3 + PITCH * 0.08;
  const rowH = PITCH * 0.35;
  const panelH = rowH * OPTIONS.length;
  const H = captionH + panelH;
  const x0 = anchorRightX - W;
  const x1 = anchorRightX;
  const y0 = anchorCenterY - H / 2;
  const y1 = anchorCenterY + H / 2;
  const panelY0 = y0 + captionH;
  const textX = x0 + PITCH * 0.15;

  const g = svgEl("g", { id: "view-mode-picker" });

  const caption = svgEl("text", {
    x: (x0 + x1) / 2, y: y0 + captionFontSize,
    "text-anchor": "middle",
    "font-size": captionFontSize,
    ...TEXT_STYLE,
    opacity: 0.7,
  });
  caption.textContent = CAPTION;
  g.appendChild(caption);

  g.appendChild(makePanelRect(x0, panelY0, W, panelH));

  const rows = OPTIONS.map(({ id, label }, i) => {
    const rowY0 = panelY0 + rowH * i;

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

    const hit = makeHitRect(x0, rowY0, W, rowH, () => {
      if (id === value) return;
      value = id;
      restyle();
      emitDisplayChange(g, "viewMode", id);
    });
    hit.setAttribute("data-value", id);
    g.appendChild(hit);

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

  const setValue = (v) => {
    value = v;
    restyle();
  };

  return { el: g, setValue, minX: x0, minY: y0, maxX: x1, maxY: y1 };
};
