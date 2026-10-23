// @ts-nocheck
import { svgEl } from '../render/svg.ts';

// Event every widget fires when the user changes a displayState field; it
// bubbles up to the listener on #scene (see drawCube.ts), which calls the
// matching displayState setter and redraws.
export const DISPLAY_CHANGE = "display-change";

export const emitDisplayChange = (el, field, value) =>
  el.dispatchEvent(new CustomEvent(DISPLAY_CHANGE, { bubbles: true, detail: { field, value } }));

// --- Widget chrome helpers (shared by all widgets) ---
export const TEXT_STYLE = { "font-family": "system-ui, sans-serif", fill: "#cdd3de" };

export const makePanelRect = (x0, y0, w, h) =>
  svgEl("rect", {
    x: x0, y: y0, width: w, height: h, rx: 6, ry: 6,
    fill: "rgba(255,255,255,0.05)",
    stroke: "rgba(255,255,255,0.25)",
    "stroke-width": 1,
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
