// @ts-nocheck

export const SVG_NS = "http://www.w3.org/2000/svg";

export const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
