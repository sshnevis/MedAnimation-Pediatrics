import * as THREE from 'three';

// Idle talk/idle pose updates — every value is a pure function of timeline time t,
// so frame-by-frame rendering is deterministic.
export function applyPose(rig, t) {
  const { parts, group, phase } = rig.char;
  const a = rig.anim;
  const pose = a.pose || rig.char.def.defaultPose;
  if (rig.char.def.poses?.[pose]) {
    applyConfiguredPose(rig, t, true);
    return;
  }

  // Reset every limb axis before selecting a pose, including expired waves.
  for (const name of ['legL', 'legR', 'kneeL', 'kneeR', 'armL', 'armR', 'elbowL', 'elbowR']) {
    parts[name].rotation.set(0, 0, 0);
  }

  for (const name of ['handL', 'handR']) parts[name]?.scale.set(1, 1, 1);

  // walking swing
  let bob = 0;
  if (a.walking) {
    const ph = (t - a.walkStart) * 9;
    parts.legL.rotation.x = Math.sin(ph) * 0.55;
    parts.legR.rotation.x = -Math.sin(ph) * 0.55;
    parts.legL.rotation.z = 0;
    parts.legR.rotation.z = 0;
    parts.kneeL.rotation.x = 0;
    parts.kneeR.rotation.x = 0;
    parts.armL.rotation.x = -Math.sin(ph) * 0.45;
    parts.armR.rotation.x = Math.sin(ph) * 0.45;
    parts.elbowL.rotation.x = 0;
    parts.elbowR.rotation.x = 0;
    bob = Math.abs(Math.sin(ph)) * 0.35;
  } else if (a.sit) {
    // seated: thighs level with the seat, knees bent ~83° so the shins hang
    // straight down, slight outward leg spread, forearms bent forward so the
    // hands rest on the lap instead of idle-swaying at the sides
    parts.legL.rotation.x = -1.45;
    parts.legR.rotation.x = -1.45;
    parts.legL.rotation.z = -0.07;
    parts.legR.rotation.z = 0.07;
    // +1.45 undoes the hip rotation on the shin → shins vertical, feet down
    parts.kneeL.rotation.x = 1.45;
    parts.kneeR.rotation.x = 1.45;
    parts.kneeL.rotation.z = 0;
    parts.kneeR.rotation.z = 0;
    parts.armL.rotation.x = -0.45 + Math.sin(t * 2.6 + phase) * 0.05;
    parts.armR.rotation.x = -0.45 + Math.sin(t * 2.6 + phase + 1) * 0.05;
    parts.elbowL.rotation.x = -0.35;
    parts.elbowR.rotation.x = -0.35;
  } else {
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.legL.rotation.z = 0;
    parts.legR.rotation.z = 0;
    parts.kneeL.rotation.x = 0;
    parts.kneeR.rotation.x = 0;
    const talk = a.talking ? 1 : 0;
    parts.armL.rotation.x = Math.sin(t * 3.1 + phase) * 0.13 * talk;
    parts.armR.rotation.x = Math.sin(t * 3.1 + phase + 2) * 0.13 * talk;
    parts.elbowL.rotation.x = 0;
    parts.elbowR.rotation.x = 0;
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
    }
  }

  if (a.carrying) {
    applyCradle(rig);
  }

  // talking mouth
  parts.mouth.scale.y = a.talking ? 0.3 + 0.7 * Math.abs(Math.sin(t * 16 + phase)) : 1;

  // blink
  const b = ((t + phase) % 3.4) < 0.09 ? 0.12 : 1;
  parts.eyeL.scale.y = b;
  parts.eyeR.scale.y = b;
}

function applyCradle(rig) {
  const p = rig.char.parts;
  // Support the head higher than the feet, with open palms below the baby
  // rather than the default deep hand blocks turned toward the camera.
  p.armL.rotation.set(-0.65, 0, 0.4);
  p.armR.rotation.set(-0.6, 0, -0.4);
  p.elbowL.rotation.set(-1.1, 0, 0);
  p.elbowR.rotation.set(-0.6, 0, 0);
  for (const name of ['handL', 'handR']) p[name]?.scale.set(0.75, 1, 0.4);
}

/**
 * Evaluate all adult poses before attaching dependents. `rigs` is the existing
 * id -> rig map (or an array). Does not mutate anim state, reparent, or integrate
 * time. Timeline code must set a complete state for the requested seek time.
 */
export function updatePoses(rigs, t) {
  const all = Object.values(rigs);
  const configured = (rig) => rig.char.def.poses?.[rig.anim.pose || rig.char.def.defaultPose];
  for (const rig of all) if (!configured(rig)) applyPose(rig, t);
  for (const rig of all) {
    if (configured(rig) && (rig.anim.pose || rig.char.def.defaultPose) === 'held' && rig.anim.carrier) {
      applyCradle(rig.anim.carrier);
    }
  }
  // The carrier's group matrix now includes its current sitting/walking offset.
  for (const rig of all) if (configured(rig)) applyConfiguredPose(rig, t, false);
}

/**
 * Pose state lives on rig.anim:
 * pose: 'held' | 'lying'; carrier: adult rig reference (held only);
 * heldOffset / heldRotation: [x,y,z] in carrier-local units / XYZ radians;
 * posePosition / poseRotation: [x,y,z] in the baby's parent space / XYZ radians;
 * alert: boolean; wiggle: 0..1; sleeping: boolean; breathAmplitude: number.
 * Omitted values use def.poses presets. Lying position is the support surface
 * below the back, not the chest center. Root yaw belongs in poseRotation.
 */
function applyConfiguredPose(rig, t, updateCarrier) {
  const { char, anim: a } = rig;
  const { group, parts: p, def, phase } = char;
  const pose = a.pose || def.defaultPose;
  const preset = def.poses[pose];
  const sleeping = a.sleeping ?? preset.sleeping ?? false;
  const alert = a.alert ?? false;
  const wiggle = pose === 'held' && alert ? (a.wiggle ?? 1) : 0;
  const wave = Math.sin(t * (preset.wiggleFrequency ?? 7) + phase);
  const motion = wave * (preset.wiggleAmplitude ?? 0.055) * wiggle;

  p.poseRoot.position.set(0, pose === 'lying' ? (preset.supportHeight ?? 0) : 0, 0);
  p.poseRoot.rotation.fromArray(pose === 'lying' ? (preset.rotation || [-Math.PI / 2, 0, 0]) : [0, 0, 0]);
  if (pose === 'held') p.poseRoot.rotation.z = motion;
  p.headGroup.rotation.set(motion * 0.3, 0, 0);
  p.armL.rotation.set(-0.2 - motion * 2, 0, -0.5);
  p.armR.rotation.set(-0.2 + motion * 2, 0, 0.5);
  p.legL.rotation.set(-0.12 + motion, 0, -0.12);
  p.legR.rotation.set(-0.12 - motion, 0, 0.12);
  for (const name of ['kneeL', 'kneeR', 'elbowL', 'elbowR']) {
    if (p[name]) p[name].rotation.set(0, 0, 0);
  }
  // Scale depth only: after lying rotation, the torso rises/falls vertically.
  const breath = sleeping ? (a.breathAmplitude ?? preset.breathAmplitude ?? 0.025) : 0;
  p.torso.scale.set(1, 1, 1 + breath * (0.5 + 0.5 * Math.sin(t * (preset.breathFrequency ?? 2.1) + phase)));
  p.mouth.scale.set(1, alert && preset.cry ? 1.5 + 0.5 * Math.abs(wave) : (sleeping ? 0.45 : 1), 1);
  const blink = sleeping ? 0.1 : (((t + phase) % 3.4 + 3.4) % 3.4 < 0.09 ? 0.12 : 1);
  p.eyeL.scale.set(1, blink, 1);
  p.eyeR.scale.set(1, blink, 1);

  if (pose === 'held' && a.carrier) {
    const carrier = a.carrier;
    if (!carrier.char || carrier.char.def.poses?.[carrier.anim.pose || carrier.char.def.defaultPose]) {
      throw new Error('Held pose carrier must be a standard adult rig reference');
    }
    // Compatibility with main.js's per-rig applyPose loop: refresh the adult
    // here too, so the attachment never uses the preceding frame's matrix.
    if (updateCarrier) {
      applyPose(carrier, t);
      applyCradle(carrier);
    }
    const carrierGroup = carrier.char.group;
    carrierGroup.updateWorldMatrix(true, false);
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3().fromArray(a.heldOffset || preset.offset || [0, 18, 7]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(a.heldRotation || preset.rotation || [0, 0, 0]))),
      new THREE.Vector3().setScalar(char.scale / carrier.char.scale)
    );
    const transform = new THREE.Matrix4().multiplyMatrices(carrierGroup.matrixWorld, local);
    if (group.parent) {
      group.parent.updateWorldMatrix(true, false);
      transform.premultiply(new THREE.Matrix4().copy(group.parent.matrixWorld).invert());
    }
    transform.decompose(group.position, group.quaternion, group.scale);
  } else {
    group.position.fromArray(a.posePosition || [0, 0, 0]);
    group.rotation.fromArray(a.poseRotation || [0, 0, 0]);
    group.scale.setScalar(char.scale);
  }
  group.updateWorldMatrix(false, true);
}
