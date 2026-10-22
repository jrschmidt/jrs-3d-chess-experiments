// @ts-nocheck
import { svgEl } from '../render/svg.ts';

// --- Widget chrome helpers (shared by buildFocusWidget/buildDiagToggle) ---
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
