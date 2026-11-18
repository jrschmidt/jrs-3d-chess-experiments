// @ts-nocheck
import { initGameState } from './gameState/gameState.ts';
import { buildScene, renderPieceIcons } from './display/scene.ts';

buildScene();
initGameState();
renderPieceIcons();
