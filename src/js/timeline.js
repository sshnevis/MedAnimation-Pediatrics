// Storyboard + master GSAP timeline.
// All episode choreography (shots per line, walk-in, effects, ending) comes
// from the episode's scenario.json → "staging" section. Blocking marks +
// shots come from library/room/<location>.json via blocking.js.

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
  const line = scenario.lines.find((x) => x.id === L.id);
  tl.call(() => ui.showSubtitle(line.speaker, line.display), null, L.start - 0.1);
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
  const { tl, scenario, timing, rigs, world, cam, ui, audio, marks, roomDef } = ctx;
  const shots = buildShots(marks, roomDef);
  const S = (id) => timing.lines.find((l) => l.id === id);
  const staging = scenario.staging || {};
  const plan = staging.plan || [];
  const faceAfterWalk = staging.faceAfterWalk ? marks[staging.faceAfterWalk] : null;
  const walkIns = staging.walkIn || [];
  const lastArrive = walkIns.reduce((a, w) => Math.max(a, w.start + w.dur), 0);

  tl.fromTo('#fade', { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power1.out', overwrite: 'auto' }, 0);

  // --- opening: door opens → family walks in → first line ---
  // The opening is the FIRST dialogue line (timing.lines[0]) with the camera
  // its scenario line names (e.g. wide-door). staging.plan covers the REST of
  // the dialogue and must not include it (entries for it are skipped below).
  // The opening shot holds from 0 until every walk-in has arrived (+0.4 beat).
  const firstLine = scenario.lines[0];
  const first = S(firstLine.id);
  const openingShot = firstLine.camera || (plan[0] && plan[0].shot) || 'wide-door';
  if (staging.openDoor && world.doorPivot) {
    tl.to(world.doorPivot.rotation, {
      y: staging.openDoor.angle != null ? staging.openDoor.angle : -1.85,
      duration: staging.openDoor.dur || 1.0,
      ease: 'power2.out', overwrite: 'auto',
    }, staging.openDoor.at || 0.12);
  }
  setShot(tl, cam, shots, openingShot, 0, Math.max(first.end, lastArrive + 0.4));
  let currentShot = openingShot;

  for (const w of walkIns) {
    const rig = rigs[w.char];
    if (!rig || !marks[w.dest]) continue;
    rigWalk(tl, rig, marks[w.dest], w.start, w.dur);
    tl.call(() => {
      if (w.sit !== false) { rig.anim.sit = true; rig.anim.walking = false; }
      if (faceAfterWalk) rig.setFacing(faceAfterWalk.x, faceAfterWalk.z);
    }, null, w.start + w.dur + 0.05);
  }
  if (staging.wave && rigs[staging.wave.char]) {
    const w = staging.wave;
    tl.call(() => { rigs[w.char].anim.wave = { start: w.at, dur: w.dur || 2.2 }; }, null, w.at);
  }

  talkWindow(tl, rigs, first);
  subtitle(tl, ui, scenario, first);
  audioCue(tl, audio, first);

  // --- dialogue (setShot only when the shot name changes → holds) ---
  let medicineWasOn = false; // medicine insert props stay up across consecutive lines
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    if (p.id === firstLine.id) continue; // already handled by the opening
    const L = S(p.id);
    // hide the medicine insert when the shot moves off it
    const mg = world.props.medicineGroup;
    if (medicineWasOn && !p.medicineInsert && mg) {
      tl.set(mg, { visible: false }, Math.max(0, L.start - 0.3));
      medicineWasOn = false;
    }
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
      // smaller tray, floated low beneath the poster row so the food-wall
      // shot keeps the posters (the real subject of L03) fully readable
      tl.set(world.props.tray, { visible: true }, L.start + 0.05);
      tl.call(() => world.props.tray.scale.setScalar(0.7), null, L.start + 0.05);
      tl.fromTo(world.props.tray.position,
        { y: -8 }, { y: 9, duration: 0.8, ease: 'power3.out', overwrite: 'auto' }, L.start + 0.05);
      const fr = [0.10, 0.30, 0.50, 0.72];
      world.props.foodGroups.forEach((fg, i) => {
        pop(tl, fg, L.start + L.duration * fr[i % fr.length]);
        // the matching food poster on the back wall pulses in sync
        const poster = world.foodPosters && world.foodPosters[fg.userData.foodId];
        if (poster) {
          const at = L.start + L.duration * fr[i % fr.length];
          tl.to(poster.scale, { x: 1.16, y: 1.16, z: 1.16, duration: 0.18, ease: 'power2.out', overwrite: 'auto' }, at);
          tl.to(poster.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'power2.inOut', overwrite: 'auto' }, at + 0.2);
        }
      });
      tl.set(world.props.tray, { visible: false }, L.end + 0.55);
      tl.call(() => world.props.tray.scale.setScalar(1), null, L.end + 0.55);
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
      const nodChar = (p.nod && p.nod.char) || L.speaker;
      tl.call(() => { rigs[nodChar].anim.nod = { start: L.end - 1.6, end: L.end - 0.2 }; }, null, L.end - 1.6);
    }
    if (p.medicineInsert) {
      if (mg) {
        tl.set(mg, { visible: true }, L.start + 0.05);
        // half size — the full-scale props read oversized on the desk (user note)
        pop(tl, mg, L.start + 0.05, 0.5);
        medicineWasOn = true;
      }
    }
    if (p.dangerCard) {
      // the plan flag is a boolean; the card content lives on the scenario line
      const cfg = scenario.lines.find((x) => x.id === p.id).dangerCard;
      // full-frame warning card; items appear sequentially (never all at once)
      tl.call(() => ui.showCard('danger', cfg), null, L.start + L.duration * 0.28);
      cfg.items.forEach((it, i) => {
        tl.call(() => ui.revealCardItem(i), null, L.start + L.duration * (0.38 + i * 0.115));
      });
      tl.call(() => ui.showCard(null), null, L.end + 0.35);
    }
    if (p.infantCard) {
      const cfg = scenario.lines.find((x) => x.id === p.id).infantCard;
      tl.call(() => ui.showCard('infant', cfg), null, L.start + L.duration * 0.35);
      tl.call(() => ui.showCard(null), null, L.end + 0.35);
    }
    if (p.doseCard) {
      const cfg = scenario.lines.find((x) => x.id === p.id).doseCard;
      tl.call(() => ui.showCard('dose', cfg), null, L.start + L.duration * 0.45);
      tl.call(() => ui.showCard(null), null, L.end + 0.4);
    }
  }
  // medicine insert off after the final line that used it
  if (medicineWasOn && world.props.medicineGroup) {
    const last = plan[plan.length - 1];
    const LL = S(last.id);
    tl.set(world.props.medicineGroup, { visible: false }, LL.end + 0.5);
  }

  // --- ending: end card + slow push + fade ---
  const tEnd = timing.total;
  const ending = staging.ending || { leadIn: 7.4, camPush: { py: 6, pz: 5, dur: 6.6 }, fadeOut: 0.85 };
  tl.call(() => ui.showEndCard(true), null, tEnd - ending.leadIn);
  tl.to(cam.pos, {
    py: '+=' + (ending.camPush ? ending.camPush.py : 6),
    pz: '+=' + (ending.camPush ? ending.camPush.pz : 5),
    duration: ending.camPush ? ending.camPush.dur : 6.6,
    ease: 'power1.inOut', overwrite: 'auto',
  }, tEnd - ending.leadIn + 0.2);
  tl.to('#endCard', { opacity: 1, duration: 0.9, ease: 'power1.out', overwrite: 'auto' }, tEnd - ending.leadIn + 0.2);
  tl.to('#fade', { opacity: 1, duration: 0.8, ease: 'power1.in', overwrite: 'auto' }, tEnd - (ending.fadeOut != null ? ending.fadeOut : 0.85));
  tl.set({}, {}, tEnd);

  return tl;
}
