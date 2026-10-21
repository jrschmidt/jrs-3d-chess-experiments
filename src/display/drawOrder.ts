import { pieceAt, type ChessPiece } from '../gameState/gameState.ts';
import { LEVEL_MAX, RANK_MAX, FILE_MAX } from './render/constants.ts';

// Back-to-front draw orderings for piece icons, one per camera view. SVG has
// no z-index, so DOM append order decides what appears in front: whatever is
// drawn last is nearest the viewer.
//
// Each ordering is three nested loops, listed outer -> inner, each running
// over one axis in the given direction.

type Axis = 'level' | 'rank' | 'file';
type Dir = 'asc' | 'desc';
type Ordering = [[Axis, Dir], [Axis, Dir], [Axis, Dir]];

export type ViewName = 'cube-view' | 'front-white' | 'front-black' | 'side-white' | 'side-black' | 'top-view';

export const ORDERINGS: Record<ViewName, Ordering> = {
  'cube-view': [['rank', 'desc'], ['file', 'desc'], ['level', 'asc']],
  'front-white': [['rank', 'desc'], ['file', 'desc'], ['level', 'asc']],
  'front-black': [['rank', 'asc'], ['file', 'desc'], ['level', 'asc']],
  'side-white': [['file', 'desc'], ['rank', 'desc'], ['level', 'asc']],
  'side-black': [['file', 'asc'], ['rank', 'asc'], ['level', 'asc']],
  'top-view': [['level', 'asc'], ['rank', 'desc'], ['file', 'asc']],
};

const AXIS_MAX: Record<Axis, number> = { level: LEVEL_MAX, rank: RANK_MAX, file: FILE_MAX };

const axisRange = (axis: Axis, dir: Dir): number[] => {
  const values = Array.from({ length: AXIS_MAX[axis] }, (_, i) => i + 1);
  return dir === 'asc' ? values : values.reverse();
};

// Yields every piece on the board, in the given view's draw order.
export function* piecesInDrawOrder(view: ViewName): Generator<ChessPiece> {
  const [[outerAxis, outerDir], [midAxis, midDir], [innerAxis, innerDir]] = ORDERINGS[view];
  for (const outer of axisRange(outerAxis, outerDir)) {
    for (const mid of axisRange(midAxis, midDir)) {
      for (const inner of axisRange(innerAxis, innerDir)) {
        const loc = { [outerAxis]: outer, [midAxis]: mid, [innerAxis]: inner } as Record<Axis, number>;
        const piece = pieceAt(loc);
        if (piece) yield piece;
      }
    }
  }
}
