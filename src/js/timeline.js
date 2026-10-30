// Storyboard + master GSAP timeline.
// Blocking marks + SHOTS come from assets/room/visit-room.json via blocking.js.

import { buildShots } from './blocking.js';

function lerp3(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function setShot(tl, cam, shots, name, at, dur) {
  const s = shots[name] || shots['wide-final'];
  const end = lerp3(s.pos, s.target, s.dolly == null ? 0.1 : s.dolly);
  tl.set(cam.pos, { px: s.pos[0], py: s.pos[1], pz: s.pos[2], overwrite: 'auto' }, at);
  tl.set(cam.target, { tx: s.target[0], ty: s.target[1], tz: s.target[2], overwrite: 'auto' }, at);
  tl.to(cam.pos, { px: end[0], py: end[1], pz: end[2], duration: dur, ease: 'none', overwrite: 'auto' }, at);
}

function rigWalk(tl, rig, dest, at, dur) {
  const { x, z } = dest;
  tl.call(() => {
    rig.setFacing(x, z);
    rig.anim.walking = true;
    rig.anim.walkStart = tl.time();
    rig.anim.sit = false;
  }, null, at);
  tl.to(rig.char.group.position, { x, z, duration: dur, ease: 'power1.inOut', overwrite: 'auto' }, at);
  tl.call(() => { rig.anim.walking = false; }, null, at + dur);
}

function talkWindow(tl, rigs, L) {
  tl.call(() => { rigs[L.speaker].anim.talking = true; }, null, Math.max(0, L.start - 0.05));
  tl.call(() => { rigs[L.speaker].anim.talking = false; }, null, L.end + 0.05);
}

function subtitle(tl, ui, scenario, L) {
  const speakerLabel = scenario.lines.find((x) => x.id === L.id).speaker;
  const label = { doctor: 'دکتر', mother: 'مادر', child: 'کودک' }[speakerLabel] || '';
  tl.call(() => ui.showSubtitle(label, scenario.lines.find((x) => x.id === L.id).display), null, L.start - 0.1);
  tl.call(() => ui.showSubtitle(null), null, L.end + 0.05);
}

function audioCue(tl, audio, L) {
  tl.call(() => audio.play(L.id), null, L.start);
  tl.call(() => audio.stopAll(), null, L.end + 0.05);
}

function pop(tl, obj, at, size = 1) {
  tl.fromTo(obj.scale,
    { x: 0.001, y: 0.001, z: 0.001 },
    { x: size, y: size, z: size, duration: 0.45, ease: 'back.out(2.2)', overwrite: 'auto' }, at);
}

export function buildTimeline(ctx) {
  const { tl, scenario, timing, rigs, world, cam, ui, audio, marks } = ctx;
  const shots = buildShots(marks);
  const S = (id) => timing.lines.find((l) => l.id === id);

  // Walk durations tuned to the v3 room path (~75 units door→chair);
  // must finish before L02.start (timing.json ≈ 5.81)
  const WALK_MOTHER = 4.4;
  const WALK_CHILD = 4.3;
  const WALK_START_M = 1.0;
  const WALK_START_C = 1.15;
  const ARRIVE_M = WALK_START_M + WALK_MOTHER; // 5.4
  const ARRIVE_C = WALK_START_C + WALK_CHILD;  // 5.45

  tl.fromTo('#fade', { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power1.out', overwrite: 'auto' }, 0);

  // --- opening: door opens → family walks in → doctor greets ---
  const L1 = S('L01');
  tl.to(world.doorPivot.rotation, { y: -1.85, duration: 1.0, ease: 'power2.out', overwrite: 'auto' }, 0.12);
  setShot(tl, cam, shots, 'wide-door', 0, Math.max(L1.end, ARRIVE_M + 0.4));
  let currentShot = 'wide-door';

  rigWalk(tl, rigs.mother, marks.motherSit, WALK_START_M, WALK_MOTHER);
  rigWalk(tl, rigs.child, marks.childSit, WALK_START_C, WALK_CHILD);

  tl.call(() => { rigs.doctor.anim.wave = { start: 0.5, dur: 2.2 }; }, null, 0.5);
  talkWindow(tl, rigs, L1);
  subtitle(tl, ui, scenario, L1);
  audioCue(tl, audio, L1);

  // Sit + face doctor (both mother and child sit on the guest chairs)
  tl.call(() => {
    rigs.mother.anim.sit = true;
    rigs.mother.anim.walking = false;
  }, null, ARRIVE_M + 0.05);
  tl.call(() => {
    rigs.child.anim.sit = true;
    rigs.child.anim.walking = false;
    rigs.child.setFacing(marks.familyFace.x, marks.familyFace.z);
  }, null, ARRIVE_C);
  tl.call(() => rigs.mother.setFacing(marks.familyFace.x, marks.familyFace.z), null, ARRIVE_M + 0.05);

  // --- dialogue (setShot only when the shot name changes → L03–L04 hold) ---
  const plan = [
    { id: 'L02', shot: 'over-doctor' },
    { id: 'L03', shot: 'medium-doctor', foods: true },
    { id: 'L04', shot: 'medium-doctor', warning: true },
    { id: 'L05', shot: 'medium-doctor-2' },
    { id: 'L06', shot: 'child', heart: true },
    { id: 'L07', shot: 'medium-doctor-2' },
    { id: 'L08', shot: 'over-doctor' },
    { id: 'L09', shot: 'wide-final', nod: true },
  ];

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const L = S(p.id);
    if (p.shot !== currentShot) {
      // Span consecutive lines that hold the same angle (e.g. L03–L04)
      let last = L;
      for (let j = i + 1; j < plan.length && plan[j].shot === p.shot; j++) {
        last = S(plan[j].id);
      }
      const at = Math.max(0, L.start - 0.35);
      const dur = (last.end + 0.35) - at;
      setShot(tl, cam, shots, p.shot, at, dur);
      currentShot = p.shot;
    }
    talkWindow(tl, rigs, L);
    subtitle(tl, ui, scenario, L);
    audioCue(tl, audio, L);

    if (p.foods) {
      tl.set(world.props.tray, { visible: true }, L.start + 0.05);
      tl.fromTo(world.props.tray.position,
        { y: -8 }, { y: 14, duration: 0.8, ease: 'power3.out', overwrite: 'auto' }, L.start + 0.05);
      const fr = [0.10, 0.30, 0.50, 0.72];
      const posterIds = ['potato', 'yogurt', 'katmast', 'ors'];
      world.props.foodGroups.forEach((fg, i) => {
        pop(tl, fg, L.start + L.duration * fr[i]);
        // the matching food poster on the back wall pulses in sync
        const poster = world.foodPosters && world.foodPosters[posterIds[i]];
        if (poster) {
          const at = L.start + L.duration * fr[i];
          tl.to(poster.scale, { x: 1.16, y: 1.16, z: 1.16, duration: 0.18, ease: 'power2.out', overwrite: 'auto' }, at);
          tl.to(poster.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'power2.inOut', overwrite: 'auto' }, at + 0.2);
        }
      });
      tl.set(world.props.tray, { visible: false }, L.end + 0.55);
      tl.set(world.props.tray.position, { y: -8 }, L.end + 0.55);
      world.props.foodGroups.forEach((fg) => {
        tl.set(fg.scale, { x: 0.001, y: 0.001, z: 0.001 }, L.end + 0.55);
      });
    }
    if (p.warning) {
      pop(tl, world.props.waterGroup, L.start + 0.4);
      pop(tl, world.props.warnGroup, L.start + L.duration * 0.6);
      tl.to(world.props.waterGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.01, overwrite: 'auto' }, L.end + 0.55);
      tl.to(world.props.warnGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.01, overwrite: 'auto' }, L.end + 0.55);
    }
    if (p.heart) {
      tl.set(world.props.heart, { visible: true }, L.start + 0.3);
      tl.set(world.props.heart, { visible: false }, L.end + 0.8);
    }
    if (p.nod) {
      tl.call(() => { rigs.doctor.anim.nod = { start: L.end - 1.6, end: L.end - 0.2 }; }, null, L.end - 1.6);
    }
  }

  const tEnd = timing.total;
  tl.call(() => ui.showEndCard(true), null, tEnd - 7.4);
  tl.to(cam.pos, { py: '+=6', pz: '+=5', duration: 6.6, ease: 'power1.inOut', overwrite: 'auto' }, tEnd - 7.2);
  tl.to('#endCard', { opacity: 1, duration: 0.9, ease: 'power1.out', overwrite: 'auto' }, tEnd - 7.2);
  tl.to('#fade', { opacity: 1, duration: 0.8, ease: 'power1.in', overwrite: 'auto' }, tEnd - 0.85);
  tl.set({}, {}, tEnd);

  return tl;
}
