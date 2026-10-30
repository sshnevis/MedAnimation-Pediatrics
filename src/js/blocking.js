// Named marks from library/room/<room>.json → blocking.
// Keep all entry / sit / camera / prop positions driven from one place.

export function marksFromRoom(roomDef) {
  const B = roomDef.blocking || {};
  const xz = (key, fallback) => {
    const v = B[key];
    return Array.isArray(v) ? { x: v[0], z: v[1] } : { x: fallback[0], z: fallback[1] };
  };
  return {
    doctorSit: xz('doctorSit', [-30, -30]),
    doctorFace: xz('doctorFace', [12, 13]),
    motherStart: xz('motherStart', [6, -62]),
    childStart: xz('childStart', [2, -60]),
    motherSit: xz('motherSit', [21, 10]),
    childSit: xz('childSit', [2, 16]),
    familyFace: xz('familyFace', [-30, -30]),
    tray: xz('tray', [-6, 2]),
    water: xz('water', [-28, -16]),
    warn: xz('warn', [-16, -18]),
    heart: xz('heart', [2, 16]),
  };
}

/**
 * Vertical Reels SHOTS derived from the same marks (v3 room: doctor seated
 * behind the desk on the LEFT, family seated on guest chairs on the rug).
 *
 * Grammar: medium/wide only — no close head shots. dolly 0 = fully static hold
 * (except wide-door's tiny opening push-in). Subjects sit at ~⅓–½ of frame height.
 *
 * Clear sightlines (do NOT shoot through the other party):
 *   doctor  → camera on the FRONT-LEFT / RIGHT flank, family stays clear
 *   child   → camera on +Z in front of child (heart stacks above)
 *   wide    → far on +Z
 */
export function buildShots(M, roomDef) {
  const D = M.doctorSit;
  const Mo = M.motherSit;
  const Ch = M.childSit;
  const midX = (Mo.x + Ch.x) / 2;
  const midZ = (Mo.z + Ch.z) / 2;
  return {
    // Opening — only slow push-in in the film
    'wide-door': {
      pos: [8, 40, 158],
      target: [6, 12, -12],
      dolly: 0.03,
    },
    // Family from behind the doctor's shoulder (camera stays near doctor on +Z,
    // not level with the chairs — D.z+36 sat on top of the sit marks and crushed the pose)
    'over-doctor': {
      pos: [D.x - 8, 26, D.z + 20],
      target: [midX, 11, midZ],
      dolly: 0,
    },
    // Doctor medium — held across L04 (bias a little toward the tray
    // so the water/warning pops stay in frame)
    'medium-doctor': {
      pos: [D.x - 20, 24, D.z + 48],
      target: [D.x + 6, 12, D.z + 8],
      dolly: 0,
    },
    // L03 — the doctor names the foods: camera turns to the BACK WALL where
    // the four food posters hang (x≈24–51), with the rising tray in front.
    // Framed so the full poster row + wall stethoscope are inside the 9:16 FOV.
    'food-wall': {
      pos: [46, 34, 40],
      target: [38, 18, -54],
      dolly: 0.02,
    },
    // Doctor from the right flank
    'medium-doctor-2': {
      pos: [D.x + 18, 22, D.z + 46],
      target: [D.x, 13, D.z],
      dolly: 0,
    },
    // Pulled-back medium on the child from the FRONT (faces doctor → −Z/−X;
    // a +Z camera would only see backs). Heart stacks above the head.
    'child': {
      pos: [Ch.x - 16, 20, Ch.z - 36],
      target: [Ch.x, 12, Ch.z],
      dolly: 0,
    },
    'wide-final': {
      pos: [8, 34, 148],
      target: [(D.x + midX) / 2, 11, (D.z + midZ) / 2],
      dolly: 0,
    },
  };
  // A room may define its own cameras in roomDef.shots ({ name: {pos,target,dolly} });
  // custom entries override the derived defaults, so a new room only declares
  // the shots its episode plan actually uses.
  if (roomDef && roomDef.shots) Object.assign(shots, roomDef.shots);
  return shots;
}
