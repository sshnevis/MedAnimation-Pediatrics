import * as THREE from 'three';
import { boxMesh, limbMesh, textSprite } from './voxel.js';

export function buildWorld(scene, roomDef, propsDef, marks = null) {
  const R = roomDef;
  const P = R.palette;
  const world = { apply(t) {} };
  const M = marks || {};

  // ---- floor ----
  const [W, D] = R.size;
  const tile = 6;
  for (let x = -W / 2; x < W / 2; x += tile) {
    for (let z = -D / 2; z < D / 2; z += tile) {
      const even = (Math.round(x / tile) + Math.round(z / tile)) % 2 === 0;
      const f = boxMesh(tile, 0.6, tile, even ? P.floorA : P.floorB);
      f.position.set(x + tile / 2, -0.3, z + tile / 2);
      f.castShadow = false;
      scene.add(f);
    }
  }

  // ---- ground plane around the building (so the room doesn't float in the sky) ----
  const ground = boxMesh(400, 1.4, 400, '#b9c6cb');
  ground.position.set(0, -1.4, 0);
  ground.castShadow = false;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- walls: back (z=-D/2), left, right ----
  const wallH = R.wallHeight;
  const back = boxMesh(W, wallH, 1.2, P.wall);
  back.position.set(0, wallH / 2, -D / 2 - 0.6);
  back.castShadow = false;
  scene.add(back);
  const trimB = boxMesh(W, 1.4, 1.5, P.wallTrim);
  trimB.position.set(0, 0.7, -D / 2 - 0.5);
  scene.add(trimB);
  const left = boxMesh(1.2, wallH, D, P.wall);
  left.position.set(-W / 2 - 0.6, wallH / 2, 0);
  scene.add(left);
  const rightDepth = D;
  const right = boxMesh(1.2, wallH, rightDepth, P.wall);
  right.position.set(W / 2 + 0.6, wallH / 2, -D / 2 + rightDepth / 2);
  scene.add(right);

  // ---- window (back wall) ----
  const win = R.window;
  const wf = boxMesh(win.width + 2, win.height + 2, 0.8, P.metal);
  wf.position.set(win.x, win.y, -D / 2 - 0.1);
  const glass = boxMesh(win.width, win.height, 0.9, '#aee3f5');
  glass.position.copy(wf.position);
  glass.material.transparent = true;
  glass.material.opacity = 0.9;
  scene.add(wf, glass);
  const barV = boxMesh(0.7, win.height, 1.0, P.metal); barV.position.copy(wf.position);
  const barH = boxMesh(win.width, 0.7, 1.0, P.metal); barH.position.copy(wf.position);
  scene.add(barV, barH);

  // ---- door (back wall, hinged) ----
  const door = R.door;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(door.x - door.width / 2, 0, -D / 2 + 0.3);
  const panel = boxMesh(door.width, door.height, 1, door.color);
  panel.position.set(door.width / 2, door.height / 2, 0);
  doorPivot.add(panel);
  const handle = boxMesh(1.2, 1.2, 1.6, '#ffd54f');
  handle.position.set(door.width - 1.2, door.height / 2, 0.8);
  doorPivot.add(handle);
  const frame = boxMesh(door.width + 2.4, door.height + 1.4, 1.4, P.woodDark);
  frame.position.set(door.x, (door.height + 1.4) / 2, -D / 2 - 0.2);
  scene.add(frame, doorPivot);
  world.doorPivot = doorPivot;

  // ---- furniture ----
  for (const item of R.furniture) {
    const g = new THREE.Group();
    g.position.set(item.pos[0], 0, item.pos[1]);
    g.rotation.y = item.rotY || 0;
    switch (item.type) {
      case 'desk': {
        const [w, h, d] = item.size;
        const top = boxMesh(w, 1.6, d, P.wood);
        top.position.set(0, h - 0.8, 0);
        g.add(top);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const leg = boxMesh(1.4, h - 1.6, 1.4, P.woodDark);
          leg.position.set(sx * (w / 2 - 1.2), (h - 1.6) / 2, sz * (d / 2 - 1.2));
          g.add(leg);
        }
        // small monitor + clipboard on desk
        const mon = boxMesh(6, 4, 0.8, '#37474f');
        mon.position.set(-4, h + 2.8, -1.5);
        const monStand = boxMesh(1.2, 1.6, 1.2, '#263238');
        monStand.position.set(-4, h + 0.6, -1.5);
        const papers = boxMesh(4, 0.3, 3, '#ffffff');
        papers.position.set(3.4, h + 0.2, 0.8);
        papers.rotation.y = 0.3;
        g.add(mon, monStand, papers);
        break;
      }
      case 'chair': {
        const seat = boxMesh(6, 1.3, 6, P.accent);
        seat.position.set(0, 7.35, 0);
        const backrest = boxMesh(6, 7.5, 1.3, P.accent);
        backrest.position.set(0, 11.6, -2.4);
        g.add(seat, backrest);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const leg = boxMesh(1.1, 6.7, 1.1, P.woodDark);
          leg.position.set(sx * 2.3, 3.35, sz * 2.3);
          g.add(leg);
        }
        break;
      }
      case 'examBed': {
        const [w, h, d] = item.size;
        const base = boxMesh(w, h - 3.5, d - 1, P.metal);
        base.position.set(0, (h - 3.5) / 2, 0);
        const mattress = boxMesh(w - 1, 2.6, d, '#ffffff');
        mattress.position.set(0, h - 2.2, 0);
        const pillow = boxMesh(4.5, 1.8, d - 2, '#b2ebf2');
        pillow.position.set(-w / 2 + 3.4, h - 0.6, 0);
        g.add(base, mattress, pillow);
        break;
      }
      case 'cabinet': {
        const [w, h, d] = item.size;
        const body = boxMesh(w, h, d, P.white);
        body.position.set(0, h / 2, 0);
        const crossV = boxMesh(1.3, 5, 0.5, '#e53935');
        crossV.position.set(0, h / 2 + 2.5, d / 2 + 0.1);
        const crossH = boxMesh(5, 1.3, 0.5, '#e53935');
        crossH.position.set(0, h / 2 + 2.5, d / 2 + 0.1);
        const handle2 = boxMesh(0.8, 3, 0.6, '#78909c');
        handle2.position.set(w / 2 - 1, h / 2 - 1.5, d / 2 + 0.1);
        g.add(body, crossV, crossH, handle2);
        break;
      }
      case 'rug': {
        const [w, d] = item.size;
        const rug = boxMesh(w, 0.5, d, '#80cbc4');
        rug.position.set(0, 0.25, 0);
        rug.castShadow = false;
        const border = boxMesh(w + 1.6, 0.5, d + 1.6, '#4db6ac');
        border.position.set(0, 0.18, 0);
        border.castShadow = false;
        g.add(border, rug);
        break;
      }
      case 'clock': {
        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(3.2, 3.2, 0.8, 20),
          new THREE.MeshLambertMaterial({ color: '#ffffff' })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(0, item.pos[1] !== undefined ? 0 : 0, 0);
        rim.position.y = 0;
        g.add(rim);
        const hourPivot = new THREE.Group();
        const minutePivot = new THREE.Group();
        const hourHand = boxMesh(0.6, 1.7, 0.4, '#263238');
        hourHand.position.set(0, 0.85, 0.5);
        const minuteHand = boxMesh(0.45, 2.2, 0.4, '#263238');
        minuteHand.position.set(0, 1.1, 0.6);
        hourPivot.add(hourHand);
        minutePivot.add(minuteHand);
        g.add(hourPivot, minutePivot);
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 0.8);
        world.clockHands = { hourPivot, minutePivot };
        break;
      }
      case 'plant': {
        const pot = boxMesh(4, 4.5, 4, '#bf6b3f');
        pot.position.set(0, 2.25, 0);
        g.add(pot);
        let y = 4.5;
        for (let i = 0; i < 3; i++) {
          const s = 4.6 - i * 1.1;
          const leaf = boxMesh(s, 2.2, s, i % 2 ? '#43a047' : '#2e7d32');
          leaf.position.set((i % 2 ? -0.6 : 0.6), y + 1.1, (i % 2 ? 0.4 : -0.4));
          g.add(leaf);
          y += 2.0;
        }
        break;
      }
      case 'poster': {
        const board = boxMesh(0.6, 9, 7, P.white);
        board.position.set(0, item.pos[1] !== undefined ? 0 : 0, 0);
        g.add(board);
        const head = boxMesh(0.8, 1.6, 5.4, P.accent);
        head.position.set(0.1, 3.4, 0);
        const line1 = boxMesh(0.8, 0.5, 5, '#90a4ae');
        line1.position.set(0.1, 1.6, 0);
        const line2 = boxMesh(0.8, 0.5, 5, '#90a4ae');
        line2.position.set(0.1, 0.6, 0);
        g.add(head, line1, line2);
        if (item.text) {
          const lbl = textSprite(item.text, { fontSize: 64 });
          lbl.position.set(0.8, 4.6, 0);
          lbl.scale.multiplyScalar(0.55);
          g.add(lbl);
        }
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 1.0);
        break;
      }
    }
    scene.add(g);
  }

  // ---- explainer props ----
  const PR = propsDef;

  // floating tray with foods (hidden until L03)
  const tray = new THREE.Group();
  const trayBox = boxMesh(PR.tray.size[0], PR.tray.size[1], PR.tray.size[2], PR.tray.color);
  tray.add(trayBox);
  const foodGroups = [];
  // Compact X spacing so the tray fits the narrow Reels FOV
  const offsets = [-7.2, -2.4, 2.4, 7.2];
  PR.foods.forEach((food, i) => {
    const fg = new THREE.Group();
    const c = food.colors;
    switch (food.id) {
      case 'potato': {
        const bowl = boxMesh(8, 3, 8, c.bowl);
        bowl.position.y = 1.5;
        const mash = boxMesh(6, 2.4, 6, c.food);
        mash.position.y = 4.0;
        const chunk = boxMesh(2, 2, 2, c.food);
        chunk.position.set(-1.4, 5.8, 0.8);
        fg.add(bowl, mash, chunk);
        break;
      }
      case 'yogurt': {
        const cup = boxMesh(5.4, 6.5, 5.4, c.cup);
        cup.position.y = 3.25;
        const stripe = boxMesh(5.7, 1.8, 5.7, c.stripe);
        stripe.position.y = 4.8;
        const top = boxMesh(5.0, 0.7, 5.0, '#e8eaf0');
        top.position.y = 6.8;
        fg.add(cup, stripe, top);
        break;
      }
      case 'katmast': {
        const plate = boxMesh(10, 1.2, 10, c.plate);
        plate.position.y = 0.6;
        const rice = boxMesh(7.5, 2.6, 7.5, c.rice);
        rice.position.y = 2.4;
        const yog = boxMesh(3.4, 1.4, 3.4, c.yogurt);
        yog.position.set(2, 4.2, 2);
        fg.add(plate, rice, yog);
        break;
      }
      case 'ors': {
        const glassM = new THREE.MeshLambertMaterial({ color: c.glass, transparent: true, opacity: 0.55 });
        const glassB = new THREE.Mesh(new THREE.BoxGeometry(5, 7.5, 5), glassM);
        glassB.position.y = 3.75;
        glassB.castShadow = true;
        const liquid = boxMesh(4.2, 4.2, 4.2, c.liquid);
        liquid.position.y = 2.4;
        const sachet = boxMesh(3, 5.5, 0.9, c.sachet);
        sachet.position.set(-3.4, 2.75, 1);
        sachet.rotation.z = -0.25;
        const stripe = boxMesh(3.1, 1.2, 1.0, '#ffffff');
        stripe.position.set(-3.4, 3.6, 1);
        stripe.rotation.z = -0.25;
        fg.add(glassB, liquid, sachet, stripe);
        break;
      }
    }
    const lbl = textSprite(food.label, { fontSize: 40 });
    lbl.position.y = 8.2;
    lbl.scale.multiplyScalar(0.85);
    fg.add(lbl);
    fg.position.set(offsets[i], 0.7, 0);
    fg.scale.setScalar(0.001);
    tray.add(fg);
    foodGroups.push(fg);
  });
  const trayXZ = M.tray || { x: -4, z: 2 };
  const waterXZ = M.water || { x: -8, z: -2 };
  const warnXZ = M.warn || { x: -2, z: 2 };
  const heartXZ = M.heart || { x: 12, z: 14 };

  tray.position.set(trayXZ.x, -8, trayXZ.z);
  tray.visible = false;
  scene.add(tray);

  const waterGroup = new THREE.Group();
  const wg = new THREE.MeshLambertMaterial({ color: PR.water.glass, transparent: true, opacity: 0.55 });
  const wglass = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 4.5), wg);
  wglass.position.y = 3.25;
  wglass.castShadow = true;
  const wliquid = boxMesh(3.7, 3.6, 3.7, PR.water.liquid);
  wliquid.position.y = 2.1;
  waterGroup.add(wglass, wliquid);
  waterGroup.position.set(waterXZ.x, 15, waterXZ.z);
  waterGroup.scale.setScalar(0.001);
  scene.add(waterGroup);

  const warnGroup = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 5.5, 3),
    new THREE.MeshLambertMaterial({ color: PR.warning.sign })
  );
  cone.position.y = 2.75;
  cone.rotation.y = Math.PI / 3;
  cone.castShadow = true;
  const mark = boxMesh(0.8, 2.2, 0.5, PR.warning.mark);
  mark.position.set(0, 3.1, 0.55);
  const dot = boxMesh(0.8, 0.8, 0.5, PR.warning.mark);
  dot.position.set(0, 1.3, 0.55);
  warnGroup.add(cone, mark, dot);
  warnGroup.position.set(warnXZ.x, 18, warnXZ.z);
  warnGroup.scale.setScalar(0.001);
  scene.add(warnGroup);

  const heart = new THREE.Group();
  const hc = PR.heart.color;
  const diamond = boxMesh(6, 6, 2.2, hc);
  diamond.rotation.z = Math.PI / 4;
  const bumpL = boxMesh(4.2, 4.2, 2.2, hc);
  bumpL.position.set(-2.1, 2.5, 0);
  const bumpR = bumpL.clone();
  bumpR.position.x = 2.1;
  heart.add(diamond, bumpL, bumpR);
  heart.position.set(heartXZ.x, 22, heartXZ.z);
  heart.visible = false;
  scene.add(heart);

  world.props = { tray, foodGroups, waterGroup, warnGroup, heart };

  // ---- per-frame pure-time updates (clock hands, heart pulse) ----
  world.apply = function (t) {
    if (world.clockHands) {
      world.clockHands.minutePivot.rotation.z = -(t / 60) * Math.PI * 2;
      world.clockHands.hourPivot.rotation.z = -(t / 3600) * Math.PI * 2;
    }
    if (heart.visible) {
      const pulse = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.6)), 2);
      const s = 1 + 0.28 * pulse;
      heart.scale.setScalar(s);
      heart.position.y = 22 + Math.sin(t * 2.2) * 0.6;
      heart.rotation.y = Math.sin(t * 1.3) * 0.25;
    }
  };

  return world;
}
