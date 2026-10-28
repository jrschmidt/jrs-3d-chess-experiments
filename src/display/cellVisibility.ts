import type { Location } from '../gameState/gameState.ts';
import type { DisplayState, CellVisibilityOption } from './displayState.ts';

// Sorts cells into visible, hidden and highlighted. Each rule (one per
// CellVisibilityOption) builds a classifier from a DisplayState snapshot;
// rebuild it whenever the display state changes.

export type CellDisplayMode = 'hidden' | 'visible' | 'highlighted';

// Classifies one cell for the DisplayState it was built from.
export type CellClassifier = (location: Location) => CellDisplayMode;

// A rule builds a classifier from a DisplayState snapshot.
export type CellVisibilityRule = (state: DisplayState) => CellClassifier;

// 'all-visible': every cell visible, nothing hidden or highlighted.
// Mainly a baseline/test case while real rules are developed.
const allVisibleRule: CellVisibilityRule = () => () => 'visible';

const CELL_VISIBILITY_RULES: Record<CellVisibilityOption, CellVisibilityRule> = {
  'all-visible': allVisibleRule,
};

// Factory: picks the rule named by state.cellVisibility.
export const cellClassifierFor = (state: DisplayState): CellClassifier =>
  CELL_VISIBILITY_RULES[state.cellVisibility](state);
