// @ts-nocheck
import { svgEl } from '../render/svg.ts';
import { PITCH } from '../render/constants.ts';

// Event every widget fires when the user changes a displayState field; it
// bubbles up to the listener on #scene (see scene.ts), which calls the
// matching displayState setter and redraws.
export const DISPLAY_CHANGE = "display-change";

export const emitDisplayChange = (el, field, value) =>
  el.dispatchEvent(new CustomEvent(DISPLAY_CHANGE, { bubbles: true, detail: { field, value } }));

// --- Widget chrome helpers (shared by all widgets) ---
export const TEXT_STYLE = { "font-family": "system-ui, sans-serif", fill: "#cdd3de" };

// A view's title ("Cube View", "Front View", ...), centered on x with its
// baseline a little above topY (the top of the view's drawing).
export const buildViewTitle = (text, x, topY, id) => {
  const el = svgEl("text", {
    id, x, y: topY - PITCH * 0.2,
    "text-anchor": "middle",
    "font-size": PITCH * 0.4,
    ...TEXT_STYLE,
  });
  el.textContent = text;
  return el;
};

// The height of a view's subtitle line (text plus gap): a view with a
// subtitle passes topY - VIEW_SUBTITLE_LINE to buildViewTitle, lifting the
// title above it.
export const VIEW_SUBTITLE_LINE = PITCH * 0.4;

// A view's subtitle ("Rank 1", ...), a little smaller than the title and
// where the title would be without one: centered on x with its baseline a
// little above topY.
export const buildViewSubtitle = (text, x, topY, id) => {
  const el = svgEl("text", {
    id, x, y: topY - PITCH * 0.2,
    "text-anchor": "middle",
    "font-size": PITCH * 0.32,
    ...TEXT_STYLE,
  });
  el.textContent = text;
  return el;
};

// The outline every widget panel (and the separator line) is drawn with.
export const PANEL_STROKE = "rgba(255,255,255,0.25)";
export const PANEL_STROKE_WIDTH = 1;

export const makePanelRect = (x0, y0, w, h) =>
  svgEl("rect", {
    x: x0, y: y0, width: w, height: h, rx: 6, ry: 6,
    fill: "rgba(255,255,255,0.05)",
    stroke: PANEL_STROKE,
    "stroke-width": PANEL_STROKE_WIDTH,
  });

// A vertical line at x from y0 to y1, styled like the panel outlines.
export const buildSeparatorLine = (x, y0, y1, id) =>
  svgEl("line", {
    id, x1: x, y1: y0, x2: x, y2: y1,
    stroke: PANEL_STROKE,
    "stroke-width": PANEL_STROKE_WIDTH,
    "pointer-events": "none",
  });

export const makeHitRect = (x0, y0, w, h, onClick) => {
  const hit = svgEl("rect", {
    x: x0, y: y0, width: w, height: h,
    fill: "rgba(255,255,255,0.001)",
    style: "cursor: pointer",
  });
  hit.addEventListener("click", onClick);
  return hit;
};
