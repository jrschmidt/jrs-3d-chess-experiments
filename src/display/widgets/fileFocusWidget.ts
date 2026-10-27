// @ts-nocheck
import { buildFocusWidget } from './focusWidget.ts';

// Focus-file widget (see focusWidget.ts), firing a "file" display-change event.
export const buildFileFocusWidget = (anchorX, anchorY, { initial, min, max }) =>
  buildFocusWidget(anchorX, anchorY, { id: "file-focus-widget", label: "FILE", field: "file", initial, min, max });
