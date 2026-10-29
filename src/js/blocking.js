// Named marks from assets/room/visit-room.json → blocking.
// Keep all entry / sit / camera / prop positions driven from one place.

export function marksFromRoom(roomDef) {
  const B = roomDef.blocking || {};
  const xz = (key, fallback) => {
    const v = B[key];
    return Array.isArray(v) ? { x: v[0], z: v[1] } : { x: fallback[0], z: fallback[1] };
  };
  return {
    doctorStand: xz('doctorStand', [-14, -8]),
    doctorFace: xz('doctorFace', [6, 12]),
    motherStart: xz('motherStart', [8, -52]),
    childStart: xz('childStart', [5, -50]),
    motherSit: xz('motherSit', [4, 12]),
    childStand: xz('childStand', [12, 14]),
    familyFace: xz('familyFace', [-14, -8]),
    tray: xz('tray', [-4, 2]),
    water: xz('water', [-8, -2]),
    warn: xz('warn', [-2, 2]),
    heart: xz('heart', [12, 14]),
  };
}

/**
 * Vertical Reels SHOTS derived from the same marks.
 *
 * Clear sightlines (do NOT shoot through the other party):
 *   doctor  → camera on the RIGHT (+X), near doctor's Z  (exam-bed flank)
 *   family  → camera on the FRONT (+Z), slightly left
 *   child   → camera straight in front of child on +Z
 *   wide    → far on +Z
 */
export function buildShots(M) {
  const D = M.doctorStand;
  const Mo = M.motherSit;
  const Ch = M.childStand;
  const midX = (Mo.x + Ch.x) / 2;
  const midZ = (Mo.z + Ch.z) / 2;
  return {
    // Opening — pulled way back so the whole room + walk path reads
    'wide-door': {
      pos: [8, 36, 145],
      target: [6, 12, -18],
      dolly: 0.03,
    },
    // Family: both mother + child readable with spacing between them
    'over-doctor': {
      pos: [midX - 4, 18, midZ + 62],
      target: [midX, 12, midZ],
      dolly: 0.03,
    },
    // Doctor from the RIGHT flank, farther out
    'medium-doctor': {
      pos: [D.x + 58, 18, D.z + 10],
      target: [D.x, 14, D.z],
      dolly: 0.04,
    },
    // Still a "close" but not glued to the face
    'close-doctor': {
      pos: [D.x + 40, 20, D.z + 6],
      target: [D.x, 18, D.z],
      dolly: 0.03,
    },
    'medium-doctor-2': {
      pos: [D.x + 60, 18, D.z + 14],
      target: [D.x, 14, D.z],
      dolly: 0.03,
    },
    'child': {
      pos: [Ch.x, 14, Ch.z + 55],
      target: [Ch.x, 12, Ch.z],
      dolly: 0.04,
    },
    'over-doctor-2': {
      pos: [midX - 2, 18, midZ + 64],
      target: [midX, 12, midZ],
      dolly: 0.03,
    },
    'wide-final': {
      pos: [6, 30, 120],
      target: [(D.x + midX) / 2, 12, (D.z + midZ) / 2],
      dolly: 0.03,
    },
  };
}
