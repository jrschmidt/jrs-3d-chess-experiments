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

const initDisplayState: Readonly<DisplayState> = {
  view: 'cube-view',
  perspective: 'all',
  level: 1,
  rank: 4,
  file: 1,
  show3dDiagonals: false,
};

// Private: read and written only through the accessors below.
const displayState = {} as DisplayState;

// Copies initDisplayState's values in (rather than sharing the object), so
// setters never modify initDisplayState and this can be called again to reset.
export const setInitDisplayState = (): void => {
  Object.assign(displayState, initDisplayState);
};

export const getView = (): ViewName => displayState.view;
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
