// I am keeping these comments for the time being, including commented out code
// for X_ICON_8 and X_ICON_9, as we further develop the icons and their SVG code.

// Same box-fitting approach as X_ICON_7, but a white circle (with a black
// outline) instead of the black square — radius is the midpoint between
// the circle inscribed in a 31-side square (r=15.5) and the one
// circumscribed around it (r=15.5*sqrt(2)~=21.92), i.e. ~18.71. Centered at
// the origin (unlike X_ICON_7's square, which is centered at (-0.5,-0.5))
// so it lands exactly on the cell footprint's center, per placeIcon's
// single-translate convention. viewBox/use box is grown to fit the circle
// plus its 2px outline so nothing gets clipped (same issue X_ICON_7 hit
// with its square).
// const X_ICON_8 = `
//   <g>
//     <symbol id="x-icon-8" viewBox="-19.71 -19.71 39.42 39.42">
//       <circle cx="0" cy="0" r="18.71" fill="#ffffff" stroke="#000000" stroke-width="2" />
//     </symbol>
//     <use href="#x-icon-8" x="-19.71" y="-19.71" width="39.42" height="39.42" />
//   </g>
// `;

// X_ICON_8's circle, plus an arbitrary polygon overlay drawn on top via a
// second, nested <symbol>/<use> pair — same viewBox-mapping trick used
// throughout X_ICON_3-X_ICON_8, but with viewBox="0 0 100 100" so a polygon
// can be authored directly in 0-100 coordinates. That 100x100 box is mapped
// onto the square exactly circumscribing the circle (side = diameter =
// 2*18.71 = 37.42, centered at the origin), so e.g. (50,0)/(0,50) land on
// the circle's top/left points and (30,80)/(80,30) fall inside it.
// const X_ICON_9 = `
//   <g>
//     <symbol id="x-icon-9" viewBox="-19.71 -19.71 39.42 39.42">
//       <circle cx="0" cy="0" r="18.71" fill="#ffffff" stroke="#000000" stroke-width="2" />
//     </symbol>
//     <use href="#x-icon-9" x="-19.71" y="-19.71" width="39.42" height="39.42" />
//     <symbol id="x-icon-9-overlay" viewBox="0 0 100 100">
//       <polygon points="50,0 0,50 30,80 80,30" fill="#0000ff" />
//     </symbol>
//     <use href="#x-icon-9-overlay" x="-18.71" y="-18.71" width="37.42" height="37.42" />
//   </g>
// `;

const ICON_K_W = `
  <g>
    <symbol id="x-icon-k-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-k-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-k-w-overlay" viewBox="0 0 100 100">
      <polygon
        points="35,5 65,5 65,35 95,35 95,65 65,65 65,80 90,80 80,90 60,100
          40,100 20,90 10,80 35,80 35,65 5,65 5,35 35,35"
        fill="#ffffff"
      />
    </symbol>
    <use href="#x-icon-k-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_K_B = `
  <g>
    <symbol id="x-icon-k-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-k-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-k-b-overlay" viewBox="0 0 100 100">
      <polygon
        points="35,5 65,5 65,35 95,35 95,65 65,65 65,80 90,80 80,90 60,100
          40,100 20,90 10,80 35,80 35,65 5,65 5,35 35,35"
        fill="#000000"
      />
    </symbol>
    <use href="#x-icon-k-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_Q_W = `
  <g>
    <symbol id="x-icon-q-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-q-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-q-w-overlay" viewBox="0 0 100 100">
      <polygon
        points="50,30 73,8 67,37 97,33 75,55 75,70 90,80 80,90 60,100
          40,100 20,90 10,80 25,70 25,55 3,33 33,37 27,8"
        fill="#ffffff"
      />
    </symbol>
    <use href="#x-icon-q-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_Q_B = `
  <g>
    <symbol id="x-icon-q-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-q-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-q-b-overlay" viewBox="0 0 100 100">
      <polygon
        points="50,30 73,8 67,37 97,33 75,55 75,70 90,80 80,90 60,100
          40,100 20,90 10,80 25,70 25,55 3,33 33,37 27,8"
        fill="#000000"
      />
    </symbol>
    <use href="#x-icon-q-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_R_W = `
  <g>
    <symbol id="x-icon-r-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-r-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-r-w-overlay" viewBox="0 0 100 100">
      <polygon
        points="20,10 35,10 35,20 42,20 42,10 58,10 58,20 65,20 65,10 80,10
          80,25 70,55 70,80 90,80 80,90 60,100
          40,100 20,90 10,80 30,80 30,55 20,35"
        fill="#ffffff"
      />
    </symbol>
    <use href="#x-icon-r-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_R_B = `
  <g>
    <symbol id="x-icon-r-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-r-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-r-b-overlay" viewBox="0 0 100 100">
      <polygon
        points="20,10 35,10 35,20 42,20 42,10 58,10 58,20 65,20 65,10 80,10
          80,25 70,55 70,80 90,80 80,90 60,100
          40,100 20,90 10,80 30,80 30,55 20,35"
        fill="#000000"
      />
    </symbol>
    <use href="#x-icon-r-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

export const PIECE_ICONS = {
  kw: ICON_K_W,
  kb: ICON_K_B,
  qw: ICON_Q_W,
  qb: ICON_Q_B,
  rw: ICON_R_W,
  rb: ICON_R_B,
} as const;
