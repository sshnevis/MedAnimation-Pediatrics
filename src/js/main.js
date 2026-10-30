import * as THREE from 'three';
import { buildCharacter } from './voxel.js';
import { applyPose } from './characters.js';
import { buildWorld } from './world.js';
import { buildTimeline } from './timeline.js';
import { LineAudio } from './audio.js';
import { marksFromRoom } from './blocking.js';

const qs = new URLSearchParams(location.search);
const RENDER_MODE = qs.get('render') === '1';
const FPS = Number(qs.get('fps') || 30);

// Output format: vertical 9:16 (Instagram/TikTok Reels). Change to 16/9 for landscape.
const ASPECT = 9 / 16;

async function loadJSON(url, required = true) {
  const r = await fetch(url);
  if (!r.ok) {
    if (required) throw new Error('Cannot load ' + url);
    return null;
  }
  return r.json();
}

// Same estimate formula as tools/compute-timing.js (used only before voices exist).
function estimateDuration(text) {
  const clean = text.replace(/[\u064B-\u0652\u0670]/g, '');
  return Math.min(40, Math.max(2.2, Math.round(((clean.length / 14) + 0.9) * 10) / 10));
}

function localTiming(scenario) {
  let t = 1.4;
  const GAP = 0.45;
  const lines = scenario.lines.map((L) => {
    const dur = estimateDuration(L.tts);
    const row = { id: L.id, speaker: L.speaker, start: +t.toFixed(2), end: +(t + dur).toFixed(2), duration: dur, source: 'estimated' };
    t += dur + GAP;
    return row;
  });
  return { fps: 30, total: +(t - GAP + 7.5).toFixed(2), lines };
}

function fitCanvas(renderer, camera) {
  const canvas = document.getElementById('scene');
  let cw, h;
  if (RENDER_MODE) {
    // Exact viewport pixels for Reels capture (1080×1920)
    cw = window.innerWidth;
    h = window.innerHeight;
  } else {
    // portrait: fit the 9:16 frame inside the window, sized by height
    h = Math.min(window.innerHeight, Math.round(window.innerWidth * 16 / 9));
    cw = Math.round(h * ASPECT);
  }
  renderer.setSize(cw, h, false);
  canvas.style.width = cw + 'px';
  canvas.style.height = h + 'px';
  camera.aspect = ASPECT;
  camera.updateProjectionMatrix();
}

async function boot() {
  const [scenario, doctorDef, motherDef, childDef, roomDef, propsDef] = await Promise.all([
    loadJSON('../scenario.json'),
    loadJSON('../assets/characters/doctor.json'),
    loadJSON('../assets/characters/mother.json'),
    loadJSON('../assets/characters/child.json'),
    loadJSON('../assets/room/visit-room.json'),
    loadJSON('../assets/props/props.json'),
  ]);
  document.title = scenario.title + ' — انیمیشن وکسل';
  document.getElementById('ovTitle').textContent = scenario.title;
  document.getElementById('ovSub').textContent = scenario.subtitle + ' — انیمیشن وکسل';

  try {
    await Promise.all([
      document.fonts.load('700 44px Vazirmatn'),
      document.fonts.load('400 44px Vazirmatn'),
    ]);
  } catch (e) { /* fallback font is fine */ }
  await document.fonts.ready;

  // ---- renderer / scene / camera ----
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dcecf2');
  // Slightly wider FOV so vertical Reels shots forgive small framing errors
  // near=1 (no geometry ever comes close to the camera) → ~10× better depth
  // precision, which kills the z-fighting flicker on close-but-not-coplanar faces
  const camera = new THREE.PerspectiveCamera(52, ASPECT, 1, 300);
  fitCanvas(renderer, camera);
  window.addEventListener('resize', () => fitCanvas(renderer, camera));

  scene.add(new THREE.HemisphereLight('#ffffff', '#8fa6ad', 0.95));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.7);
  sun.position.set(28, 70, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0002;
  // normalBias kills the crawling stripe artifacts (shadow acne) on box faces
  // — e.g. the flicker under the door and around the doctor's collar
  sun.shadow.normalBias = 0.6;
  scene.add(sun);

  // ---- blocking marks (single source of truth for positions) ----
  const marks = marksFromRoom(roomDef);

  // ---- world + characters ----
  const world = buildWorld(scene, roomDef, propsDef, marks);
  const rigs = {};
  for (const [id, def] of [['doctor', doctorDef], ['mother', motherDef], ['child', childDef]]) {
    const rig = { char: buildCharacter(def), anim: { talking: false, walking: false, walkStart: 0, sit: false, wave: null, nod: null } };
    rig.setFacing = (x, z) => {
      const p = rig.char.group.position;
      rig.char.group.rotation.y = Math.atan2(x - p.x, z - p.z);
    };
    rigs[id] = rig;
    scene.add(rig.char.group);
  }

  // start: family outside door, doctor at stand mark facing the chairs
  rigs.doctor.char.group.position.set(marks.doctorStand.x, 0, marks.doctorStand.z);
  rigs.doctor.setFacing(marks.doctorFace.x, marks.doctorFace.z);
  rigs.mother.char.group.position.set(marks.motherStart.x, 0, marks.motherStart.z);
  rigs.child.char.group.position.set(marks.childStart.x, 0, marks.childStart.z);

  // ---- timing (measured when audio exists, estimates otherwise) ----
  const timing = (await loadJSON('../timing.json', false)) || localTiming(scenario);

  // ---- audio ----
  const audio = new LineAudio(timing, RENDER_MODE);

  // ---- end card content ----
  document.getElementById('endTitle').textContent = scenario.endCard.title;
  const ul = document.getElementById('endItems');
  for (const item of scenario.endCard.items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  document.getElementById('endNote').textContent = scenario.endCard.note;

  // ---- UI ----
  const ui = {
    showSubtitle(label, text) {
      const box = document.getElementById('subtitleBox');
      if (!text) { box.classList.remove('on'); return; }
      document.getElementById('speakerTag').textContent = label;
      document.getElementById('subtitle').textContent = text;
      box.classList.add('on');
    },
    showEndCard(on) {
      // opacity handled by the timeline tween; this guarantees content state
    },
  };

  const overlay = document.getElementById('startOverlay');
  const btnPlay = document.getElementById('btnPlay');
  const timeLabel = document.getElementById('timeLabel');
  const audioState = document.getElementById('audioState');

  const cam = { pos: { px: 8, py: 36, pz: 145 }, target: { tx: 6, ty: 12, tz: -18 } };
  const tl = gsap.timeline({ paused: true });
  buildTimeline({ tl, scenario, timing, rigs, world, cam, ui, audio, marks });

  function start() {
    overlay.style.display = 'none';
    audio.stopAll();
    tl.pause(0);
    tl.play(0);
    btnPlay.textContent = '⏸';
  }
  document.getElementById('btnStart').addEventListener('click', start);
  btnPlay.addEventListener('click', () => {
    if (tl.isActive()) { tl.pause(); audio.setPlaying(false); btnPlay.textContent = '▶'; }
    else { tl.play(); audio.setPlaying(true); btnPlay.textContent = '⏸'; }
  });
  document.getElementById('btnRestart').addEventListener('click', start);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
    if (e.code === 'ArrowLeft') { tl.pause(); audio.stopAll(); tl.time(Math.max(0, tl.time() - 1)); }
    if (e.code === 'ArrowRight') { tl.pause(); audio.stopAll(); tl.time(Math.min(timing.total, tl.time() + 1)); }
  });

  if (!RENDER_MODE) {
    audioState.textContent = '';
    // warn quietly when voices are missing
    setTimeout(() => {
      if (!audio.anyFound) {
        audioState.textContent = 'صدایی یافت نشد — حالت بی‌صدا (فایل‌های audio/*.mp3 را بسازید)';
      }
    }, 1500);
  }

  // ---- render loop ----
  function frameApply() {
    const t = tl.time();
    for (const id in rigs) applyPose(rigs[id], t);
    world.apply(t);
    camera.position.set(
      cam.pos.px + Math.sin(t * 0.8) * 0.15,
      cam.pos.py + Math.sin(t * 1.4) * 0.1,
      cam.pos.pz
    );
    camera.lookAt(cam.target.tx, cam.target.ty, cam.target.tz);
    camera.rotation.z += Math.sin(t * 0.6) * 0.005;
    if (!RENDER_MODE) timeLabel.textContent = t.toFixed(1) + 's / ' + timing.total.toFixed(1) + 's';
  }

  function tickOnce() {
    frameApply();
    renderer.render(scene, camera);
  }

  // Seek that correctly applies GSAP call() side-effects (talking, props, sit…).
  // Going backwards resets to 0 first so callbacks re-run in order.
  function seekTo(t) {
    tl.pause();
    const prev = tl.time();
    if (t + 1e-4 < prev) {
      tl.time(0, true);
      tl.time(t, false);
    } else {
      tl.time(t, false);
    }
  }

  if (RENDER_MODE) {
    overlay.style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    // deterministic seek used by tools/render.js
    window.__duration = timing.total;
    window.__fps = FPS;
    window.__seek = (t) => { seekTo(t); tickOnce(); };
    tl.pause(0);
    tickOnce();
    window.__ready = true;
  } else {
    renderer.setAnimationLoop(() => { frameApply(); renderer.render(scene, camera); });
    tl.pause(0);
    tickOnce();
    // dev/debug handles (also used by the agent to inspect the timeline)
    window.__tl = tl;
    window.__scene = scene;
    window.__camera = camera;
    window.__seek = (t) => {
      overlay.style.display = 'none';
      seekTo(t);
    };
  }
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('startOverlay');
  if (el) {
    el.innerHTML =
      '<div class="card"><h1>خطا</h1><p style="direction:ltr;text-align:left;white-space:pre-wrap;font-size:13px;color:#ffb4a2">' +
      (err && err.stack ? err.stack : String(err)) +
      '</p></div>';
  }
});
