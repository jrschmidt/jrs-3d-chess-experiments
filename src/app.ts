// @ts-nocheck
import { initGameState } from './gameState/gameState.ts';
import { buildScene, renderPieceIcons } from './display/drawCube/drawCube.ts';

buildScene();
initGameState();
renderPieceIcons();
