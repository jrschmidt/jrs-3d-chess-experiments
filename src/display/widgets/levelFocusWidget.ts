// @ts-nocheck
import { buildFocusWidget } from './focusWidget.ts';

// Focus-level widget (see focusWidget.ts), firing a "level" display-change
// event. The caller anchors it at the cube's bottom-right corner, so it
// tracks the cube regardless of grid size or tilt angle.
export const buildLevelFocusWidget = (anchorX, anchorY, { initial, min, max }) =>
  buildFocusWidget(anchorX, anchorY, { id: "level-focus-widget", label: "LEVEL", field: "level", initial, min, max });
