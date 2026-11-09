import * as THREE from 'three';
import { buildWorld } from './world.js';
import { updatePoses } from './characters.js';

// Preload before main.boot(): the existing synchronous timeline and render-ready
// contract must not race a late secondary-room fetch.
export const insertAssets = await (async () => {
  const ep = new URLSearchParams(location.search).get('ep');
  if (!ep) return null;
  const json = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Cannot load insert asset: ' + url);
    return response.json();
  };
  const scenario = await json(new URL('../../episodes/' + encodeURIComponent(ep) + '/scenario.json', import.meta.url));
  const insert = scenario.staging?.inserts;
  if (!insert?.room) return null;
  const room = await json(new URL('../../library/room/' + insert.room + '.json', import.meta.url));
  const packs = await Promise.all((scenario.props || []).map(id => json(new URL('../../library/props/' + id + '.json', import.meta.url))));
  return { room, props: Object.assign({}, ...packs) };
})().catch(error => ({ error }));

const strip = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
function cueTime(line, timing, cue) {
  const index = strip(line.tts).indexOf(strip(cue));
  if (index < 0) throw new Error('Missing insert cue in ' + line.id);
  return timing.start + index / line.display.length * timing.duration;
}

function teachingOverlay() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../css/room-inserts.css', import.meta.url).href;
  document.head.appendChild(link);
  const root = document.createElement('div');
  root.id = 'roomTeaching';
  root.innerHTML = '<div class="memory-vignette"></div><div class="memory-label">بازسازی اتفاق · خواب در تخت والدین خطرناک است</div>' +
    '<div class="sharing-warning"><svg viewBox="0 0 180 110" aria-hidden="true"><path d="M20 85V40H160V85M20 65H160M45 40V28H80V40M100 40V28H135V40" fill="none" stroke="#fff" stroke-width="7"/><circle cx="90" cy="52" r="11" fill="#f1c7a2"/><circle cx="90" cy="55" r="48" fill="none" stroke="#ff7272" stroke-width="8"/><path d="M56 21L124 89" stroke="#ff7272" stroke-width="8"/></svg><b>خطر</b></div>' +
    '<div class="position-guide"><div class="back-safe">✓ همیشه به پشت</div><div class="wrong-position side"><svg viewBox="0 0 160 72" aria-hidden="true"><circle cx="35" cy="38" r="14"/><path d="M51 33Q90 16 128 43L126 57H55Z"/><path d="M20 12L140 66" fill="none" stroke="#ff7272" stroke-width="6"/></svg><span>✕ به پهلو</span></div><div class="wrong-position stomach"><svg viewBox="0 0 160 72" aria-hidden="true"><circle cx="32" cy="41" r="14"/><rect x="49" y="32" width="83" height="22" rx="10"/><path d="M20 12L140 66" fill="none" stroke="#ff7272" stroke-width="6"/></svg><span>✕ روی شکم</span></div></div>' +
    '<div class="near-guide"><b>تخت نزدیک شما، نه داخل تخت شما</b><span>تخت والدین　 ↔　 تخت مستقل نوزاد</span></div>';
  document.getElementById('stage').appendChild(root);
  return root;
}

export function installRoomInserts(ctx, assets) {
  if (!assets) return;
  if (assets.error) throw assets.error;
  const { scenario, timing, rigs, world, cam, roomDef, ui } = ctx;
  const scene = Object.values(rigs)[0].char.group.parent;
  const clinicChildren = scene.children.filter(o => !Object.values(rigs).some(r => r.char.group === o));
  const nursery = buildWorld(scene, assets.room, assets.props);
  // Separate world-space sets keep diagnostic geometry disjoint. Camera clipping
  // remains local (near=1/far=300), not stretched to span both rooms.
  const offset = new THREE.Vector3(0, 0, 500);
  nursery.root.position.copy(offset);
  const lighting = new THREE.Group();
  lighting.name = 'insert-lighting';
  lighting.position.copy(offset);
  lighting.add(new THREE.HemisphereLight('#ffffff', '#e8eef0', 1.45), new THREE.AmbientLight('#ffffff', 0.25));
  for (const [color, strength, pos] of [['#fff6e8', 1.7, [28, 70, 40]], ['#f4f8fb', 0.85, [-10, 45, 130]]]) {
    const light = new THREE.DirectionalLight(color, strength);
    light.position.fromArray(pos);
    light.target.position.set(0, 10, -12);
    if (strength === 1.7) {
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      Object.assign(light.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 5, far: 250 });
      light.shadow.bias = -0.0002;
      light.shadow.normalBias = 0.6;
    }
    lighting.add(light, light.target);
  }
  scene.add(lighting);
  const overlay = teachingOverlay();
  const nurseryShots = Object.fromEntries(Object.entries(assets.room.shots).map(([key, shot]) => [key, {
    ...shot, pos: shot.pos.map((v, i) => v + offset.getComponent(i)), target: shot.target.map((v, i) => v + offset.getComponent(i)),
  }]));
  // The existing diagnostic consumes this same room-camera map.
  Object.assign(roomDef.shots, scenario.staging.shots, nurseryShots);
  const times = Object.fromEntries(timing.lines.map(l => [l.id, l]));
  const lines = Object.fromEntries(scenario.lines.map(l => [l.id, l]));
  const cuts = [{ at: 0, shot: scenario.lines[0].camera, nursery: false }];
  const flashes = [];
  const itemEvents = [];
  for (const p of scenario.staging.plan) {
    const L = times[p.id], line = lines[p.id];
    cuts.push({ at: L.start, shot: p.shot, nursery: p.room === assets.room.id });
    if (p.flashbackFall) {
      const cfg = line.flashbackFall;
      const start = Math.min(cueTime(line, L, cfg.cue), L.end - cfg.duration - 0.3);
      flashes.push({ start, end: start + cfg.duration });
      cuts.push({ at: start, shot: cfg.shot, nursery: true }, { at: start + cfg.duration, shot: cfg.returnShot, nursery: false });
    }
    if (p.nurseryInsert) cuts.push({ at: cueTime(line, L, line.nurseryInsert.cue), shot: line.nurseryInsert.shot, nursery: true });
    if (p.forbiddenItems) line.forbiddenItems.items.forEach((key, i) => {
      const start = L.start + L.duration * line.forbiddenItems.fractions[i];
      itemEvents.push({ key, start, end: Math.min(start + 1.65, L.end) });
    });
  }
  cuts.sort((a, b) => a.at - b.at);
  const originalApply = world.apply.bind(world);
  const originalSubtitle = ui.showSubtitle.bind(ui);
  ui.showSubtitle = (speaker, text) => {
    originalSubtitle(speaker, text);
    const color = scenario.speakers?.[speaker]?.subtitleColor;
    if (color) document.getElementById('subtitle').style.background = color;
  };
  const endLine = scenario.staging.plan.find(p => p.endCard);
  const endTiming = endLine && times[endLine.id];
  const endCfg = endLine && lines[endLine.id].endCard;
  const endItems = Array.from(document.querySelectorAll('#endItems li'));
  const endCard = document.getElementById('endCard');
  const canvas = document.getElementById('scene');
  document.getElementById('subtitleBox').style.zIndex = '8';
  document.getElementById('subtitleBox').style.transition = 'none';
  endCard.style.zIndex = '6';
  document.getElementById('fade').style.zIndex = '10';
  const baby = rigs[scenario.staging.inserts.baby.char];
  const carrier = rigs[scenario.staging.inserts.baby.returnParent];
  const anchor = new THREE.Vector3();
  const bedEdge = new THREE.Vector3();
  const activeLine = t => timing.lines.find(l => t >= l.start && t <= l.end);
  world.apply = t => {
    originalApply(t);
    let cut = cuts[0];
    for (const next of cuts) { if (next.at > t) break; cut = next; }
    const flash = flashes.find(f => t >= f.start && t < f.end);
    clinicChildren.forEach(o => { o.visible = !cut.nursery; });
    nursery.root.visible = lighting.visible = cut.nursery;
    for (const [id, rig] of Object.entries(rigs)) rig.char.group.visible = id === baby.char.def.id || !cut.nursery;
    const shot = roomDef.shots[cut.shot];
    if (!shot) throw new Error('Unknown insert shot: ' + cut.shot);
    const push = cut.at === 0 ? Math.min(1, t / times[scenario.lines[0].id].end) * (shot.dolly || 0) : 0;
    Object.assign(cam.pos, { px: shot.pos[0] + (shot.target[0] - shot.pos[0]) * push, py: shot.pos[1] + (shot.target[1] - shot.pos[1]) * push, pz: shot.pos[2] + (shot.target[2] - shot.pos[2]) * push });
    Object.assign(cam.target, { tx: shot.target[0], ty: shot.target[1], tz: shot.target[2] });
    carrier.anim.carrying = !cut.nursery;
    const current = activeLine(t);
    ui.showSubtitle(current?.speaker, current ? lines[current.id].display : null);
    if (cut.nursery) {
      nursery.root.updateWorldMatrix(true, true);
      nursery.crib.babyAnchor.getWorldPosition(anchor);
      if (flash) {
        nursery.parentsBed.edgeAnchor.getWorldPosition(bedEdge);
        const progress = (t - flash.start) / (flash.end - flash.start);
        anchor.copy(bedEdge);
        anchor.x += -4 + 9 * progress;
        anchor.y += 1 - 5 * progress * progress;
        // Hide before any landing/contact; no impact or injury is depicted.
        baby.char.group.visible = progress < 0.78;
      }
      Object.assign(baby.anim, { pose: 'lying', carrier: null, sleeping: !flash, alert: false, wiggle: 0, posePosition: anchor.toArray(), poseRotation: [0, flash ? Math.PI / 2 : 0, 0] });
    } else {
      Object.assign(baby.anim, { pose: 'held', carrier, sleeping: false, alert: current?.id === 'L03' || current?.id === 'L04', wiggle: 1 });
    }
    // Pose state is reconstructed for every time, including backward/random seeks.
    for (const [id, rig] of Object.entries(rigs)) rig.anim.talking = id === current?.speaker;
    updatePoses(rigs, t);
    const talk = current && rigs[current.speaker];
    if (talk && current.speaker !== baby.char.def.id && !cut.nursery && !talk.anim.carrying) {
      const pulse = Math.sin(Math.PI * Math.min(1, (t - current.start) / 0.5)) * 0.18;
      talk.char.parts.armR.rotation.x -= 0.15 + pulse;
      talk.char.parts.elbowR.rotation.x -= 0.15;
    }
    for (const [key, prop] of Object.entries(nursery.sleepProps.forbiddenItems)) {
      const event = itemEvents.find(e => e.key === key && t >= e.start && t < e.end);
      prop.group.visible = !!event && cut.nursery && !flash;
      prop.group.position.copy(prop.homePosition);
      prop.group.scale.setScalar(1);
      prop.group.rotation.set(0, 0, 0);
      if (event) {
        const dt = t - event.start;
        prop.group.scale.setScalar(Math.min(1, 0.2 + dt * 5));
        prop.group.position.x += Math.sin(dt * 20) * 0.3;
        prop.group.position.y += Math.sin(Math.min(1, dt * 4) * Math.PI) * 1.2;
      }
      // World-space prohibition marks face the insert camera, never edge-on.
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(...shot.pos), new THREE.Vector3(...shot.target), new THREE.Vector3(0, 1, 0)));
      prop.cross.quaternion.copy(q);
    }
    overlay.classList.toggle('flashback', !!flash);
    canvas.style.filter = flash ? 'saturate(0.25) sepia(0.12)' : '';
    const co = current && lines[current.id].coSleepCard;
    overlay.classList.toggle('co-sleep', !!co && t > current.start + current.duration * 0.2);
    const sleep = current && lines[current.id].sleepPosition;
    overlay.classList.toggle('sleep-position', !!sleep);
    overlay.querySelector('.side').style.visibility = sleep && t >= current.start + current.duration * sleep.fractions[1] ? 'visible' : 'hidden';
    overlay.querySelector('.stomach').style.visibility = sleep && t >= current.start + current.duration * sleep.fractions[2] ? 'visible' : 'hidden';
    overlay.classList.toggle('near', !!(current && lines[current.id].nurseryTop));
    if (endTiming) {
      const on = t >= endTiming.start;
      endCard.style.opacity = on ? '1' : '0';
      endCard.classList.add('insert-endcard');
      endItems.forEach((li, i) => { li.style.visibility = on && t >= endTiming.start + endTiming.duration * endCfg.fractions[i] ? 'visible' : 'hidden'; });
    }
    // Debug/QA hooks expose data, not alternate rendering behavior.
    window.__insertState = { time: t, room: cut.nursery ? assets.room.id : scenario.location, shot: cut.shot, flashback: !!flash, pose: baby.anim.pose, visibleItems: Object.entries(nursery.sleepProps.forbiddenItems).filter(([, p]) => p.group.visible).map(([key]) => key) };
  };
}
