// Cell colors shared by the cube and slice views: the checkerboard, the
// frame lines, and the four 3-D diagonal sets. Every function here takes
// (rank, level, file), the argument order drawCube.ts uses throughout.

// A "floor" is a thin outline tracing the full rank x file perimeter of each
// level — a subtle visual aid for telling the five levels of the cube apart.
// (A filled full-footprint plane was tried first, but adjacent levels' planes
// overlapped almost completely on screen since the rank/file extent is much
// wider than one level's vertical spacing.)
export const PERIMETER_COLOR = "#505050";
export const PERIMETER_HIGHLIGHT = "#999999";

export type CheckerVariant = 'light' | 'dark';

// Flat checkerboard colors, chosen by whether the square's level is the
// focus level. Only the visible portion of each level's floor (see
// chevronPoints in isoProjection.ts) is ever drawn in the cube; the hidden
// portion renders nothing.
export const CHECKER_COLORS: Readonly<Record<'focus' | 'unfocused', Record<CheckerVariant, string>>> = {
  focus: { light: "#a0a0a0", dark: "#1f1f1f" },
  unfocused: { light: "#808080", dark: "#333333" },
};

// The "focus level" (displayState's getLevel) is the level the viewer is
// currently paying attention to; its checkerboard is shown brightest, with
// every other level faint.
export const checkerColor = (level: number, variant: CheckerVariant, focus: number | null): string =>
  CHECKER_COLORS[level === focus ? "focus" : "unfocused"][variant];

// Checkerboard parity: a cell is "dark" when rank + level + file is odd.
export const isDarkCell = (rank: number, level: number, file: number): boolean =>
  (rank + level + file) % 2 === 1;

export type DiagId = 'diag_a' | 'diag_b' | 'diag_c' | 'diag_d';

// Diagonal color lookup table — the only place a diagonal label (diag_a
// .. diag_d) is tied to an actual color. Change a value here to recolor
// every cell in that diagonal set; nothing else needs to change.
//
// The four values are matched for perceived brightness (OKLab lightness
// L ~ 0.53-0.55, perceived-luminance ~74-92 on a 0-255 scale) rather than
// for equal hex saturation — human vision reads green as much brighter
// than blue at the same saturation, so matching hex patterns (as the
// original #3333cc/#cc33cc/#cc6633/#33cc33 did) left green looking like
// it "popped" out of the set. To adjust brightness later, shift all four
// L values by the same amount rather than editing one hex in isolation,
// or the imbalance comes back.
const DIAG_BLUE = "#1953ff";
const DIAG_PURPLE = "#b300b3";
const DIAG_ORANGE = "#b34100";
const DIAG_GREEN = "#178217";

export const DIAG_COLORS: Readonly<Record<DiagId, string>> = {
  diag_a: DIAG_BLUE,
  diag_b: DIAG_PURPLE,
  diag_c: DIAG_ORANGE,
  diag_d: DIAG_GREEN,
};

// Diagonal membership: every cell (l, r, f) = (level, rank, file) belongs to
// exactly one of four mutually exclusive sets of 3D-diagonally-adjacent
// cells, determined by comparing the parity of rank and file against level:
//
//   is_odd(R) == is_odd(L)  &&  is_odd(F) == is_odd(L)  ->  diag_a
//   is_odd(R) == is_odd(L)  &&  is_odd(F) != is_odd(L)  ->  diag_b
//   is_odd(R) != is_odd(L)  &&  is_odd(F) == is_odd(L)  ->  diag_c
//   is_odd(R) != is_odd(L)  &&  is_odd(F) != is_odd(L)  ->  diag_d
const isOdd = (n: number): boolean => (n % 2) === 1;

export const diagForCell = (rank: number, level: number, file: number): DiagId => {
  const rMatchesL = isOdd(rank) === isOdd(level);
  const fMatchesL = isOdd(file) === isOdd(level);
  if (rMatchesL && fMatchesL) return "diag_a";
  if (rMatchesL && !fMatchesL) return "diag_b";
  if (!rMatchesL && fMatchesL) return "diag_c";
  return "diag_d";
};
