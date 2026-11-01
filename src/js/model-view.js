// 3D Model View — standalone inspector for every model in the project:
// rooms, characters, furniture/wall decor (extracted from each room) and the
// explainer props. Pick a model from the sidebar, then use the 6 view buttons
// (front / back / left / right / top / rotatable perspective) to debug it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCharacter } from './voxel.js';
import { buildWorld } from './world.js';

const PERSIAN_TYPE = {
  desk: 'میز دکتر', chair: 'صندلی مهمان', officeChair: 'صندلی اداری', stool: 'چهارپایه',
  bookshelf: 'قفسه کتاب', sideTable: 'میز کنار', rug: 'فرش', plant: 'گلدان',
  cabinet: 'کابینت', examBed: 'تخت معاینه', drawerCabinet: 'کمد کشویی',
  whiteboard: 'وایت‌برد', clock: 'ساعت دیواری', stetho: 'گوشی پزشکی',
  welcomePoster: 'پوستر خوش‌آمد', foodPoster: 'پوستر غذا', heartPoster: 'پوستر قلب',
  growthChart: 'نمودار رشد', poster: 'پوستر',
};

// ---- scene / renderer / camera ----
const canvas = document.getElementById('mvScene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dcecf2');
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

function fit() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
fit();
window.addEventListener('resize', fit);

scene.add(new THREE.HemisphereLight('#ffffff', '#e8eef0', 1.45));
scene.add(new THREE.AmbientLight('#ffffff', 0.25));
const sun = new THREE.DirectionalLight('#fff6e8', 1.7);
sun.position.set(28, 70, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.6;
scene.add(sun);
const fill = new THREE.DirectionalLight('#f4f8fb', 0.85);
fill.position.set(-10, 45, 130);
scene.add(fill);

const modelRoot = new THREE.Group();
modelRoot.name = 'mv-model';
scene.add(modelRoot);
let grid = null;

// ---- model builders ----
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Cannot load ' + url);
  return r.json();
}

// Build a full room into a standalone group.
function buildRoomGroup(roomDef) {
  const g = new THREE.Group();
  buildWorld(g, roomDef, {}, null);
  return g;
}

// Build a single furniture/wall-decor item from a room: run the room builder
// once into a throwaway group, then detach the nth group named item.type
// (nth = order of the item among the room's furniture list, so duplicate
// types like two chairs resolve to the right instance).
function buildFurnitureGroup(roomDef, item, occurrence) {
  const temp = new THREE.Group();
  buildWorld(temp, roomDef, {}, null);
  let seen = 0;
  for (const child of temp.children) {
    if (child.name === item.type) {
      if (seen === occurrence) {
        temp.remove(child);
        return child;
      }
      seen++;
    }
  }
  return temp; // fallback: shouldn't happen
}

// Minimal room shell used as a host when building explainer props (the prop
// builders are embedded in buildWorld and need a room context to run in).
const DUMMY_ROOM = {
  id: 'mv-dummy', size: [40, 40], wallHeight: 20,
  palette: {
    floorA: '#e8dfd2', floorB: '#d6cbb9', wall: '#f3ecdf', wallTrim: '#cfd4d6',
    accent: '#35b0a8', wood: '#a9825f', woodDark: '#6d4c41', metal: '#90a4ae', white: '#fafafa',
  },
  door: { x: 0, width: 12, height: 24, color: '#b08968' },
  window: { x: 0, y: 12, width: 16, height: 10 },
  furniture: [],
};

// Prepare a prop group (built hidden/tiny by buildWorld) for solo display.
function prepProp(g) {
  g.visible = true;
  g.scale.setScalar(1);
  g.position.set(0, 0, 0);
  g.rotation.set(0, 0, 0);
  return g;
}

// ---- model registry ----
let current = null; // { name, build(): Group }
let currentGroup = null;

async function loadModels() {
  const listEl = document.getElementById('mvList');
  const models = [];
  try {
    const lib = await fetchJSON('/api/library');
    const roomDefs = await Promise.all(lib.rooms.map((id) => fetchJSON('/library/room/' + id + '.json')));

    // Rooms — the whole room as built in the animation.
    for (const rd of roomDefs) {
      models.push({ cat: 'اتاق‌ها', name: rd.label || rd.id, build: () => buildRoomGroup(rd) });
    }

    // Characters.
    for (const id of lib.characters) {
      const def = await fetchJSON('/library/characters/' + id + '.json');
      models.push({ cat: 'کاراکترها', name: def.label || def.id, build: () => buildCharacter(def).group });
    }

    // Furniture + wall decor, per room.
    for (const rd of roomDefs) {
      const counts = {};
      for (const item of rd.furniture || []) {
        const occ = counts[item.type] || 0;
        counts[item.type] = occ + 1;
        const label = PERSIAN_TYPE[item.type] || item.type;
        // foodPosters: label them by their icon text so instances are distinguishable
        const suffix = item.type === 'foodPoster' && item.label ? ' — ' + item.label
          : occ > 0 ? ' #' + (occ + 1) : '';
        const roomLabel = (rd.label || rd.id);
        models.push({
          cat: 'اشیای اتاق — ' + roomLabel,
          name: label + suffix,
          build: () => buildFurnitureGroup(rd, item, occ),
        });
      }
    }

    // Explainer props from each props pack.
    for (const packId of lib.props) {
      const PR = await fetchJSON('/library/props/' + packId + '.json');
      const mk = (extract) => () => {
        const temp = new THREE.Group();
        const world = buildWorld(temp, DUMMY_ROOM, PR, {});
        return extract(world, temp);
      };
      const cat = 'اجسام توضیحی — ' + (PR.label || packId);
      if (PR.tray) {
        models.push({ cat, name: 'سینی مواد غذایی (کامل)', build: mk((world) => prepProp(world.props.tray)) });
        (PR.foods || []).forEach((food, i) => {
          models.push({
            cat,
            name: 'غذا — ' + (food.label || food.id),
            build: mk((world) => {
              const fg = world.props.foodGroups[i];
              world.props.tray.remove(fg);
              return prepProp(fg);
            }),
          });
        });
      }
      if (PR.water) models.push({ cat, name: 'لیوان آب', build: mk((world) => prepProp(world.props.waterGroup)) });
      if (PR.warning) models.push({ cat, name: 'علامت هشدار', build: mk((world) => prepProp(world.props.warnGroup)) });
      if (PR.heart) models.push({ cat, name: 'قلب', build: mk((world) => prepProp(world.props.heart)) });
      if (PR.medicine) models.push({ cat, name: 'دارو و قطره‌چکان', build: mk((world) => prepProp(world.props.medicineGroup)) });
    }
  } catch (err) {
    listEl.innerHTML = '<p class="mv-loading">خطا در بارگذاری: ' + String(err.message || err) +
      '<br>سرور را با Run.bat اجرا کنید.</p>';
    return;
  }

  // group by category, preserving order
  listEl.innerHTML = '';
  let lastCat = null;
  for (const m of models) {
    if (m.cat !== lastCat) {
      const h = document.createElement('h3');
      h.className = 'mv-cat';
      h.textContent = m.cat;
      listEl.appendChild(h);
      lastCat = m.cat;
    }
    const btn = document.createElement('button');
    btn.className = 'mv-item';
    btn.textContent = m.name;
    btn.addEventListener('click', () => select(m, btn));
    listEl.appendChild(btn);
  }
  if (models.length) select(models[0], listEl.querySelector('.mv-item'));
}

// ---- view framing ----
const VIEWS = {
  front: { dir: [0, 0, 1], up: [0, 1, 0] },
  back: { dir: [0, 0, -1], up: [0, 1, 0] },
  left: { dir: [-1, 0, 0], up: [0, 1, 0] },
  right: { dir: [1, 0, 0], up: [0, 1, 0] },
  top: { dir: [0, 1, 0], up: [0, 0, -1] },
};

let orbitDist = 100;

function applyView(name) {
  document.querySelectorAll('#mvToolbar button').forEach((b) => b.classList.toggle('on', b.dataset.view === name));
  if (name === 'orbit') {
    camera.up.set(0, 1, 0);
    camera.position.set(orbitDist * 0.75, orbitDist * 0.6, orbitDist * 0.95);
    controls.target.set(0, 0, 0);
    controls.enabled = true;
    controls.update();
    return;
  }
  controls.enabled = false;
  const v = VIEWS[name];
  camera.up.set(v.up[0], v.up[1], v.up[2]);
  camera.position.set(v.dir[0] * orbitDist, v.dir[1] * orbitDist, v.dir[2] * orbitDist);
  controls.target.set(0, 0, 0);
  camera.lookAt(0, 0, 0);
}

document.querySelectorAll('#mvToolbar button').forEach((b) =>
  b.addEventListener('click', () => applyView(b.dataset.view)));
window.addEventListener('keydown', (e) => {
  const map = { Digit1: 'front', Digit2: 'back', Digit3: 'left', Digit4: 'right', Digit5: 'top', Digit6: 'orbit' };
  if (map[e.code]) applyView(map[e.code]);
});

// ---- selection ----
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
  });
}

function select(model, btn) {
  document.querySelectorAll('.mv-item').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (currentGroup) {
    modelRoot.remove(currentGroup);
    disposeGroup(currentGroup);
  }
  current = model;
  currentGroup = model.build();
  modelRoot.position.set(0, 0, 0); // drop the previous model's centering offset first
  modelRoot.add(currentGroup);
  currentGroup.updateWorldMatrix(true, true);

  // center the model at the origin so all 6 views frame it identically
  const box = new THREE.Box3().setFromObject(modelRoot, true);
  const center = box.getCenter(new THREE.Vector3());
  modelRoot.position.set(-center.x, -center.y, -center.z);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 5);
  orbitDist = r / Math.tan((camera.fov * Math.PI / 180) / 2) * 1.15;

  // context grid under the model
  if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
  grid = new THREE.GridHelper(r * 4, 20, '#9db4bd', '#c3d3d9');
  // model is now centered at the origin → grid sits just under its lowest point
  grid.position.y = -(box.max.y - box.min.y) / 2 - 0.3;
  scene.add(grid);

  // shadow frustum follows the model size
  sun.position.set(r, r * 2, r);
  sun.shadow.camera.left = -r * 2;
  sun.shadow.camera.right = r * 2;
  sun.shadow.camera.top = r * 2;
  sun.shadow.camera.bottom = -r * 2;
  sun.shadow.camera.far = r * 8;
  sun.shadow.camera.updateProjectionMatrix();

  document.getElementById('mvLabel').textContent = model.name;
  applyView('orbit');
  // debug handle: inspect framing from the console / automation
  window.__mvDebug = () => ({
    r: sphere.radius, orbitDist,
    boxMin: box.min, boxMax: box.max,
    groupPos: currentGroup.position, rootPos: modelRoot.position,
    camPos: camera.position, nChildren: currentGroup.children.length,
  });
}

// ---- render loop ----
renderer.setAnimationLoop(() => {
  // update() recomputes the camera from the orbit state — it must not run in
  // fixed-view mode or it overrides the snapped camera position every frame
  if (controls.enabled) controls.update();
  renderer.render(scene, camera);
});

loadModels();
