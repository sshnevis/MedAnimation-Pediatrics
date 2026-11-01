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
// Active episode: episodes/<id>/ holds scenario.json, audio/, timing.json, render output.
// Without ?ep= the start overlay becomes an episode picker instead.
const EP = qs.get('ep');

// Episode picker: lists episodes/<id>/ via the dev server (/api/episodes).
async function showEpisodePicker() {
  const overlay = document.getElementById('startOverlay');
  const card = overlay.querySelector('.card');
  let episodes = [];
  let error = '';
  try {
    const r = await fetch('/api/episodes');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    episodes = await r.json();
  } catch (e) {
    error = 'دریافت فهرست قسمت‌ها ممکن نشد — سرور را با Run.bat یا tools/serve.js اجرا کنید.';
  }
  const items = episodes.map((ep) =>
    '<li><a href="index.html?ep=' + encodeURIComponent(ep.id) + '">' +
    '<span class="ep-title">' + escapeHtml(ep.title) + '</span>' +
    (ep.subtitle ? '<span class="ep-sub">' + escapeHtml(ep.subtitle) + '</span>' : '') +
    '</a></li>'
  ).join('');
  card.innerHTML =
    '<h1>انتخاب قسمت</h1>' +
    (items
      ? '<ul class="ep-list">' + items + '</ul>'
      : '<p>' + (error || 'هیچ قسمتی یافت نشد — یک پوشه در episodes/ بسازید.') + '</p>') +
    '<a class="ep-mv-link" href="model-view.html">🧊 3D Model View — مشاهده و دیباگ مدل‌ها</a>';
  overlay.style.display = 'flex';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
    t += dur + GAP + (L.settleAfter || 0);
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

// Merge multiple library/props/<pack>.json packs into one propsDef.
// Array-valued keys (foods, …) concatenate; object values shallow-merge.
function mergeProps(packs) {
  const out = {};
  for (const pack of packs) {
    for (const [k, v] of Object.entries(pack)) {
      if (Array.isArray(v) && Array.isArray(out[k])) out[k] = out[k].concat(v);
      else if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) Object.assign(out[k], v);
      else out[k] = v;
    }
  }
  return out;
}

async function boot() {
  if (!EP) {
    if (RENDER_MODE) throw new Error('render mode requires ?ep=<episode-id>');
    await showEpisodePicker();
    return;
  }
  const EP_URL = '../episodes/' + EP;
  const scenario = await loadJSON(EP_URL + '/scenario.json');
  // Cast, room and prop packs are declared by the episode manifest, loaded
  // from the shared library so every episode reuses the same definitions.
  const [roomDef, ...charDefs] = await Promise.all([
    loadJSON('../library/room/' + scenario.location + '.json'),
    ...scenario.characters.map((id) => loadJSON('../library/characters/' + id + '.json')),
  ]);
  const charById = Object.fromEntries(charDefs.map((d) => [d.id, d]));
  const propPacks = await Promise.all(
    (scenario.props || ['explainer-props']).map((id) => loadJSON('../library/props/' + id + '.json')));
  const propsDef = mergeProps(propPacks);
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

  // Bright, airy clinic look (matches scenario/project 1.png): near-white walls,
  // soft shadows — strong neutral hemisphere + warm sun + shadowless fill.
  scene.add(new THREE.HemisphereLight('#ffffff', '#e8eef0', 1.45));
  scene.add(new THREE.AmbientLight('#ffffff', 0.25));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.7);
  sun.position.set(28, 70, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 250;
  sun.shadow.bias = -0.0002;
  // normalBias pushes the shadow sample off thin surfaces (book spines, furniture
  // edges) so self-shadow acne doesn't flicker/crawl as the camera moves
  // (Rule 3: 0.5–0.6 — plain bias alone leaves crawling stripe acne on box faces)
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  // Shadowless front fill: lifts wall-facing surfaces so they read near-white
  const fill = new THREE.DirectionalLight('#f4f8fb', 0.85);
  fill.position.set(-10, 45, 130);
  scene.add(fill);
  // Cool daylight streaming in through the side window (project 2.png: the
  // curtained light-catching window on the wall behind the doctor). Aimed from
  // the window's side of the room into the desk/family area, no castShadow so
  // it lifts the room without fighting the sun's shadows.
  if (roomDef.window && roomDef.window.side === 'left') {
    const winLight = new THREE.DirectionalLight('#ddf2ff', 0.75);
    winLight.position.set(-120, 60, 10);
    winLight.target.position.set(30, 0, 0);
    winLight.castShadow = false;
    scene.add(winLight, winLight.target);
  }

  // ---- blocking marks (single source of truth for positions) ----
  const marks = marksFromRoom(roomDef);

  // ---- world + characters ----
  const world = buildWorld(scene, roomDef, propsDef, marks);
  const rigs = {};
  for (const id of scenario.characters) {
    const def = charById[id];
    if (!def) throw new Error('scenario.characters references unknown library character: ' + id);
    const rig = { char: buildCharacter(def), anim: { talking: false, walking: false, walkStart: 0, sit: false, wave: null, nod: null } };
    rig.setFacing = (x, z) => {
      const p = rig.char.group.position;
      rig.char.group.rotation.y = Math.atan2(x - p.x, z - p.z);
    };
    rigs[id] = rig;
    scene.add(rig.char.group);
  }

  // start positions from staging.initial (mark names from the room blocking)
  for (const init of (scenario.staging && scenario.staging.initial) || []) {
    const rig = rigs[init.char];
    if (!rig) continue;
    const m = marks[init.at];
    if (m) rig.char.group.position.set(m.x, 0, m.z);
    if (init.face && marks[init.face]) rig.setFacing(marks[init.face].x, marks[init.face].z);
    if (init.sit) rig.anim.sit = true;
  }

  // ---- timing (measured when audio exists, estimates otherwise) ----
  const timing = (await loadJSON(EP_URL + '/timing.json', false)) || localTiming(scenario);

  // ---- audio ----
  const audio = new LineAudio(timing, RENDER_MODE, EP_URL + '/audio/');

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
  // Subtitle box color comes from library/characters/<id>.json → subtitleColor
  // (falling back to the CSS [data-speaker] rules when a character lacks one)
  const ui = {
    showSubtitle(speakerId, text) {
      const box = document.getElementById('subtitleBox');
      const sub = document.getElementById('subtitle');
      if (!text) { box.classList.remove('on'); return; }
      const def = charById[speakerId];
      box.dataset.speaker = speakerId;
      sub.style.background = def && def.subtitleColor ? def.subtitleColor : '';
      sub.textContent = text;
      box.classList.add('on');
    },
    showEndCard(on) {
      // opacity handled by the timeline tween; this guarantees content state
    },
    // Full-frame effect cards (danger / infant / dose). kind=null hides all.
    showCard(kind, cfg) {
      document.querySelectorAll('.fx-card').forEach((el) => el.classList.remove('on'));
      if (!kind) return;
      const el = document.getElementById(kind + 'Card');
      if (!el) return;
      if (kind === 'danger' && cfg) {
        el.querySelector('#dangerTitle').textContent = cfg.title;
        el.querySelector('#dangerNote').textContent = cfg.note || '';
        const ul = el.querySelector('#dangerItems');
        ul.innerHTML = '';
        cfg.items.forEach((it) => {
          const li = document.createElement('li');
          const ic = document.createElement('span');
          ic.className = 'ic';
          ic.textContent = it.icon;
          li.appendChild(ic);
          li.appendChild(document.createTextNode(it.text));
          ul.appendChild(li);
        });
      } else if (kind === 'infant' && cfg) {
        el.querySelector('#infantIcon').textContent = cfg.icon || '👶';
        el.querySelector('#infantTitle').textContent = cfg.title;
        el.querySelector('#infantText').textContent = cfg.text;
      } else if (kind === 'dose' && cfg) {
        el.querySelector('#doseText').textContent = cfg.text;
      }
      el.classList.add('on');
    },
    revealCardItem(i) {
      const li = document.querySelectorAll('#dangerItems li')[i];
      if (li) li.classList.add('shown');
    },
  };

  const overlay = document.getElementById('startOverlay');
  const btnPlay = document.getElementById('btnPlay');
  const timeLabel = document.getElementById('timeLabel');
  const audioState = document.getElementById('audioState');

  const cam = { pos: { px: 8, py: 36, pz: 145 }, target: { tx: 6, ty: 12, tz: -18 } };
  const tl = gsap.timeline({ paused: true });
  buildTimeline({ tl, scenario, timing, rigs, world, cam, ui, audio, marks, roomDef });

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
    window.__scene = scene; // debug handle for offline diagnostics (z-fight checker)
    window.__roomDef = roomDef; // shot-camera list for the z-fight visibility test
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
