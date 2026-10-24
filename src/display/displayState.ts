import type { ViewName } from './drawOrder.ts';

// Display (render/UI) state: which camera view is shown, from whose
// perspective, which level/rank/file is focused, and whether the 3D
// diagonal overlay is on. Gameplay state lives in gameState/, not here.

export type Perspective = 'all' | 'white' | 'black';
export type LevelValue = null | 1 | 2 | 3 | 4 | 5;
export type RankValue = null | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type FileValue = null | 1 | 2 | 3 | 4 | 5;

export interface DisplayState {
  view: ViewName;
  perspective: Perspective;
  level: LevelValue;
  rank: RankValue;
  file: FileValue;
  show3dDiagonals: boolean;
}

// Initial display state for each view, added one view at a time. Every
// entry is a complete DisplayState; views without one yet are just absent.
// 'cube-view' is required, since it's the state displayState starts in.
const initDisplayStates: Readonly<
  { 'cube-view': DisplayState } & Partial<Record<ViewName, DisplayState>>
> = {

  'cube-view': {
    view: 'cube-view',
    perspective: 'all',
    level: 1,
    rank: 4,
    file: 1,
    show3dDiagonals: false,
  },

  'front-white': {
    view: 'front-white',
    perspective: 'white',
    level: 3,
    rank: 1,
    file: 3,
    show3dDiagonals: false,
  },

  'side-white': {
    view: 'side-white',
    perspective: 'white',
    level: 3,
    rank: 4,
    file: 1,
    show3dDiagonals: false,
  },

  'top-view': {
    view: 'top-view',
    perspective: 'all',
    level: 5,
    rank: 4,
    file: 3,
    show3dDiagonals: false,
  },

};

// Private: read and written only through the accessors below.
const displayState = {} as DisplayState;

// Sets every attribute at once. Copies the values in (rather than sharing
// the object), so later changes to `state` don't leak into displayState,
// and setters never modify the object that was passed in.
export const setDisplayState = (state: DisplayState): void => {
  Object.assign(displayState, state);
};

// A copy of the whole state, so callers can't modify displayState itself.
export const getDisplayState = (): DisplayState => ({ ...displayState });

// Can be called again later to reset to the initial (cube-view) values.
export const setInitDisplayState = (): void => {
  setDisplayState(initDisplayStates['cube-view']);
};

// Switches to `view`. If that view has an initial display state, every
// field is reset to it; otherwise only the view changes.
export const changeView = (view: ViewName): void => {
  const init = initDisplayStates[view];
  if (init) setDisplayState(init); else setView(view);
};

export const getView =(): ViewName => displayState.view;
export const setView = (view: ViewName): void => { displayState.view = view; };

export const getPerspective = (): Perspective => displayState.perspective;
export const setPerspective = (perspective: Perspective): void => { displayState.perspective = perspective; };

export const getLevel = (): LevelValue => displayState.level;
export const setLevel = (level: LevelValue): void => { displayState.level = level; };

export const getRank = (): RankValue => displayState.rank;
export const setRank = (rank: RankValue): void => { displayState.rank = rank; };

export const getFile = (): FileValue => displayState.file;
export const setFile = (file: FileValue): void => { displayState.file = file; };

export const getShow3dDiagonals = (): boolean => displayState.show3dDiagonals;
export const setShow3dDiagonals = (show: boolean): void => { displayState.show3dDiagonals = show; };

setInitDisplayState();
