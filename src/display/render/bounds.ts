import type { Point } from './isoProjection.ts';

// A screen-space bounding box, grown as a view or widget is built so its
// caller can lay things out around it and fit the viewBox.
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// A box containing nothing yet; the first extendBounds sets it.
export const emptyBounds = (): Bounds =>
  ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

// Grows `b` to contain every point.
export const extendBounds = (b: Bounds, points: Point[]): void => {
  for (const p of points) {
    b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x);
    b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y);
  }
};

// Grows `b` to contain `other`.
export const mergeBounds = (b: Bounds, other: Bounds): void => {
  b.minX = Math.min(b.minX, other.minX); b.maxX = Math.max(b.maxX, other.maxX);
  b.minY = Math.min(b.minY, other.minY); b.maxY = Math.max(b.maxY, other.maxY);
};
