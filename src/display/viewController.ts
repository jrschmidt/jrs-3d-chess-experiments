import type { DisplayState } from './displayState.ts';

// What each view's build function (buildCubeView in drawCube/drawCube.ts,
// buildSliceViews in drawSlice/drawSlice.ts) returns to the scene
// controller (scene.ts). The view keeps its own elements private; the scene
// only appends `el`, shows or hides it, and calls `refresh` after every
// display-state change.
export interface ViewController {
  // The view's <g>.
  el: SVGGElement;
  // Brings everything in the view up to date with `state`. Called for every
  // view, shown or hidden, so a hidden view is already right when shown.
  refresh(state: DisplayState): void;
}
