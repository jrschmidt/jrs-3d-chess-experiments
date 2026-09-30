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
        fill="#cccccc"
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
        fill="#333333"
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
        fill="#cccccc"
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
        fill="#333333"
      />
    </symbol>
    <use href="#x-icon-q-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_E_W = `
  <g>
    <symbol id="x-icon-e-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-e-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-e-w-overlay" viewBox="0 0 100 100">
      <path
        d="M 40 45 L 43 35 L 38 30 L 20 32 L 22 37 A 10 10 0 0 1 20 20
          L 37 17 A 15 10 0 0 1 72 28 L 70 33 L 62 30 L 57 35
          L 60 45 L 100 45 L 90 55 L 78 55 L 75 60 L 90 60 L 80 70 L 70 70
          L 60 80 L 90 80 A 50 50 0 0 1 10 80 L 40 80 L 30 70
          L 20 70 L 10 60 L 25 60 L 22 55 L 10 55 L 0 45 Z"
        fill="#cccccc"
      />
      <circle cx="47" cy="19" r="5" fill="#6f6f60"/>
    </symbol>
    <use href="#x-icon-e-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;


////////////////////////////////////////////////////////////////////////
// ORIGINAL //

// d="M 40 75 A 14 14 0 1 1 38 62 A 20 20 0 1 1 28 56 L 16 68
//   A 18 18 0 0 1 16 40 L 26 35 A 30 20 0 0 1 80 35 L 95 55
//   L 82 52 A 12 12 0 0 1 90 65 A 15 15 0 1 1 75 55
//   A 18 18 0 1 1 80 70 A 12 12 0 0 1 67 65 A 15 15 0 1 1 65 75
//   L 90 75 A 30 30 0 0 1 75 85 A 8 8 0 1 1 82 87
//   A 12 12 0 0 1 65 90 L 70 95 A 50 50 0 0 1 30 95
//   L 35 90 A 8 8 0 0 1 18 87 A 8 8 0 1 1 25 85
//   A 30 30 0 0 1 10 75 Z"
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// NO ARCS //

// d="M 40 75 L 38 62 L 28 56 L 16 68
//   L 16 40 L 26 35 L 80 35 L 95 55
//   L 82 52 L 90 65 L 75 55
//   L 80 70 L 67 65 L 65 75
//   L 90 75 L 75 85 L 82 87
//   L 65 90 L 70 95 L 30 95
//   L 35 90 L 18 87 L 25 85
//   L 10 75 Z"

////////////////////////////////////////////////////////////////////////


const ICON_E_B = `
<g>
  <symbol id="x-icon-e-b" viewBox="-20 -20 40 40">
    <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
  </symbol>
  <use href="#x-icon-e-b" x="-20" y="-20" width="40" height="40" />
  <symbol id="x-icon-e-b-overlay" viewBox="0 0 100 100">
    <path
      d="M 40 65 L 38 52 L 28 46 L 16 58
        A 18 18 0 0 1 16 30 L 26 25 A 30 20 0 0 1 80 20 L 95 40
        L 82 37 L 90 50 L 75 40
        L 80 55 L 67 50 L 65 65
        L 90 55 L 75 65 L 82 67
        L 65 70 
        L 70 95 L 30 95
        L 35 70 L 18 67 L 25 65
        L 10 55 Z"
      fill="#333333"
    />
  </symbol>
  <use href="#x-icon-e-b-overlay" x="-19" y="-19" width="38" height="38" />
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
        fill="#cccccc"
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
        fill="#333333"
      />
    </symbol>
    <use href="#x-icon-r-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_B_B = `
  <g>
    <symbol id="x-icon-b-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-b-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-b-b-overlay" viewBox="0 0 100 100">
      <path
        d="M 45 15 A 8 8 0 1 1 55 15 L 80 40 A 22.4 22.4 0 0 1 70 70
          L 70 80 L 90 80 A 50 50 0 0 1 10 80 L 30 80 L 30 70
          A 22.4 22.4 0 0 1 20 40 L 35 25 L 45 40 L 50 35 L 40 20 Z"
        fill="#333333"
      />
    </symbol>
    <use href="#x-icon-b-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_B_W = `
  <g>
    <symbol id="x-icon-b-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-b-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-b-w-overlay" viewBox="0 0 100 100">
      <path
        d="M 45 15 A 8 8 0 1 1 55 15 L 80 40 A 22.4 22.4 0 0 1 70 70
          L 70 80 L 90 80 A 50 50 0 0 1 10 80 L 30 80 L 30 70
          A 22.4 22.4 0 0 1 20 40 L 35 25 L 45 40 L 50 35 L 40 20 Z"
        fill="#cccccc"
      />
    </symbol>
    <use href="#x-icon-b-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_T_W = `
  <g>
    <symbol id="x-icon-t-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-t-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-t-w-overlay" viewBox="0 0 100 100">
      <path
        d="M 50 0 L 60 15 L 60 60 L 82 60 A 33 33 0 0 0 76 30 L 83 20
          A 45 45 0 0 1 85 80 L 65 80 L 65 97 A 50 50 0 0 1 35 97
          L 35 80 L 15 80 A 45 45 0 0 1 10 30 L 17 20 L 24 30
          A 33 33 0 0 0 18 60 L 40 60 L40 15 Z"
        fill="#cccccc"
      />
    </symbol>
    <use href="#x-icon-t-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_T_B = `
  <g>
    <symbol id="x-icon-t-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-t-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-t-b-overlay" viewBox="0 0 100 100">
      <path
        d="M 50 0 L 60 15 L 60 60 L 82 60 A 33 33 0 0 0 76 30 L 83 20
          A 45 45 0 0 1 85 80 L 65 80 L 65 97 A 50 50 0 0 1 35 97
          L 35 80 L 15 80 A 45 45 0 0 1 10 30 L 17 20 L 24 30
          A 33 33 0 0 0 18 60 L 40 60 L40 15 Z"
        fill="#333333"
      />
    </symbol>
    <use href="#x-icon-t-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_P_W = `
  <g>
    <symbol id="x-icon-p-w" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-p-w" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-p-w-overlay" viewBox="0 0 100 100">
      <path
        d="M 45 50 A 25 25 0 1 1 55 50 L 60 50 A 10 10 0 0 1 70 60
          L 60 60 L 60 80 L 90 80 A 50 50 0 0 1 10 80 
          L 40 80 L 40 60 L 30 60 A 10 10 0 0 1 40 50 Z"
        fill="#cccccc"
      />
    </symbol>
    <use href="#x-icon-p-w-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

const ICON_P_B = `
  <g>
    <symbol id="x-icon-p-b" viewBox="-20 -20 40 40">
      <circle cx="0" cy="0" r="19" fill="#6f6f60" stroke="#000000" stroke-width="2" />
    </symbol>
    <use href="#x-icon-p-b" x="-20" y="-20" width="40" height="40" />
    <symbol id="x-icon-p-b-overlay" viewBox="0 0 100 100">
      <path
        d="M 45 50 A 25 25 0 1 1 55 50 L 60 50 A 10 10 0 0 1 70 60
          L 60 60 L 60 80 L 90 80 A 50 50 0 0 1 10 80 
          L 40 80 L 40 60 L 30 60 A 10 10 0 0 1 40 50 Z"
        fill="#333333"
      />
    </symbol>
    <use href="#x-icon-p-b-overlay" x="-19" y="-19" width="38" height="38" />
  </g>
`;

export const PIECE_ICONS = {
  kw: ICON_K_W,
  kb: ICON_K_B,
  qw: ICON_Q_W,
  qb: ICON_Q_B,
  ew: ICON_E_W,
  eb: ICON_E_B,
  rw: ICON_R_W,
  rb: ICON_R_B,
  bb: ICON_B_B,
  bw: ICON_B_W,
  tw: ICON_T_W,
  tb: ICON_T_B,
  pw: ICON_P_W,
  pb: ICON_P_B,
} as const;
