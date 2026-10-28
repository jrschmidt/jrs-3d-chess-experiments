// @ts-nocheck

export const SVG_NS = "http://www.w3.org/2000/svg";

export const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// Parses a snippet of SVG markup (e.g. a PIECE_ICONS entry) into a detached
// element that can be appended into the scene.
export const parseSvgFragment = (markup) => {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}">${markup}</svg>`,
    "image/svg+xml"
  );
  return doc.documentElement.firstElementChild;
};
