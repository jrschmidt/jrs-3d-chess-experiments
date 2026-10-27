// @ts-nocheck
import { buildFocusWidget } from './focusWidget.ts';

// Focus-rank widget (see focusWidget.ts), firing a "rank" display-change event.
export const buildRankFocusWidget = (anchorX, anchorY, { initial, min, max }) =>
  buildFocusWidget(anchorX, anchorY, { id: "rank-focus-widget", label: "RANK", field: "rank", initial, min, max });
