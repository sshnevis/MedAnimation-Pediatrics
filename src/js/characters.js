// Idle talk/idle pose updates — every value is a pure function of timeline time t,
// so frame-by-frame rendering is deterministic.
export function applyPose(rig, t) {
  const { parts, group, phase } = rig.char;
  const a = rig.anim;

  // walking swing
  let bob = 0;
  if (a.walking) {
    const ph = (t - a.walkStart) * 9;
    parts.legL.rotation.x = Math.sin(ph) * 0.55;
    parts.legR.rotation.x = -Math.sin(ph) * 0.55;
    parts.legL.rotation.z = 0;
    parts.legR.rotation.z = 0;
    parts.armL.rotation.x = -Math.sin(ph) * 0.45;
    parts.armR.rotation.x = Math.sin(ph) * 0.45;
    bob = Math.abs(Math.sin(ph)) * 0.35;
  } else if (a.sit) {
    // seated: thighs level with the seat, slight outward leg spread, hands
    // resting forward on the lap instead of idle-swaying at the sides
    parts.legL.rotation.x = -1.45;
    parts.legR.rotation.x = -1.45;
    parts.legL.rotation.z = -0.07;
    parts.legR.rotation.z = 0.07;
    parts.armL.rotation.x = -0.55 + Math.sin(t * 2.6 + phase) * 0.05;
    parts.armR.rotation.x = -0.55 + Math.sin(t * 2.6 + phase + 1) * 0.05;
  } else {
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.legL.rotation.z = 0;
    parts.legR.rotation.z = 0;
    const talk = a.talking ? 1 : 0;
    parts.armL.rotation.x = Math.sin(t * 3.1 + phase) * 0.13 * talk;
    if (!a.wave) parts.armR.rotation.x = Math.sin(t * 3.1 + phase + 2) * 0.13 * talk;
  }

  group.position.y = (a.sit ? rig.char.sitY : 0) + bob;

  // head bob / nod
  let nodX = Math.sin(t * 2.2 + phase) * 0.045 * (a.talking ? 1 : 0);
  if (a.nod) {
    const p = (t - a.nod.start) / (a.nod.end - a.nod.start);
    if (p >= 0 && p <= 1) nodX += Math.sin(p * Math.PI * 3) * 0.3 * Math.sin(p * Math.PI);
  }
  parts.headGroup.rotation.x = nodX;

  // wave (right arm)
  if (a.wave) {
    const wt = t - a.wave.start;
    if (wt >= 0 && wt <= a.wave.dur) {
      const env = Math.min(wt / 0.3, 1) * Math.min((a.wave.dur - wt) / 0.3, 1);
      // positive z raises the RIGHT arm up-outward; negative would fold it
      // inward across the head and the flap reads as moving backwards
      parts.armR.rotation.z = 2.25 * env;
      parts.armR.rotation.x = Math.sin(wt * 13) * 0.35 * env;
    } else if (wt > a.wave.dur) {
      parts.armR.rotation.z = 0;
      parts.armR.rotation.x = 0;
      a.wave = null;
    }
  }

  // talking mouth
  parts.mouth.scale.y = a.talking ? 0.3 + 0.7 * Math.abs(Math.sin(t * 16 + phase)) : 1;

  // blink
  const b = ((t + phase) % 3.4) < 0.09 ? 0.12 : 1;
  parts.eyeL.scale.y = b;
  parts.eyeR.scale.y = b;
}
