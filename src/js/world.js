import * as THREE from 'three';
import { boxMesh, limbMesh, textSprite, shade } from './voxel.js';

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
  // baseboard strip along the back wall for depth
  const baseB = boxMesh(W, 2.6, 0.8, P.wallTrim);
  baseB.position.set(0, 1.3, -D / 2 + 0.1);
  baseB.castShadow = false;
  scene.add(baseB);
  const left = boxMesh(1.2, wallH, D, P.wall);
  left.position.set(-W / 2 - 0.6, wallH / 2, 0);
  scene.add(left);
  const baseL = boxMesh(0.8, 2.6, D, P.wallTrim);
  baseL.position.set(-W / 2 + 0.1, 1.3, 0);
  baseL.castShadow = false;
  scene.add(baseL);
  const rightDepth = D;
  const right = boxMesh(1.2, wallH, rightDepth, P.wall);
  right.position.set(W / 2 + 0.6, wallH / 2, -D / 2 + rightDepth / 2);
  scene.add(right);

  // ---- window (back wall) ----
  const win = R.window;
  // sky panel on the wall behind the glass so the window reads as "outside"
  // (placed just in front of the wall surface — behind it, it would be hidden
  // by the wall itself and fight its faces)
  const sky = boxMesh(win.width, win.height, 0.6, win.sky || '#aee3f5');
  sky.position.set(win.x, win.y, -D / 2 + 0.35);
  sky.castShadow = false;
  scene.add(sky);
  const cloud = boxMesh(win.width * 0.3, 1.6, 0.3, '#ffffff');
  cloud.position.set(win.x - win.width * 0.18, win.y + win.height * 0.2, -D / 2 + 0.7);
  const cloud2 = boxMesh(win.width * 0.2, 1.2, 0.3, '#ffffff');
  cloud2.position.set(win.x + win.width * 0.25, win.y - win.height * 0.15, -D / 2 + 0.7);
  scene.add(cloud, cloud2);
  const wf = boxMesh(win.width + 2, win.height + 2, 0.8, P.metal);
  wf.position.set(win.x, win.y, -D / 2 - 0.1);
  const glass = boxMesh(win.width, win.height, 1.2, win.glassTint || '#cfeef8');
  glass.position.copy(wf.position);
  glass.material.transparent = true;
  glass.material.opacity = 0.35;
  scene.add(wf, glass);
  const barV = boxMesh(0.7, win.height, 1.0, P.metal); barV.position.copy(wf.position);
  const barH = boxMesh(win.width, 0.7, 1.0, P.metal); barH.position.copy(wf.position);
  scene.add(barV, barH);
  // window sill
  const sill = boxMesh(win.width + 3.2, 1, 2.2, P.wallTrim);
  sill.position.set(win.x, win.y - win.height / 2 - 1.4, -D / 2 + 0.6);
  scene.add(sill);
  // curtains on both sides
  if (win.curtain) {
    const cw = 3.2;
    const curL = boxMesh(cw, win.height + 4, 0.8, win.curtain);
    curL.position.set(win.x - win.width / 2 - cw / 2 + 0.4, win.y + 0.6, -D / 2 + 1.0);
    const curR = curL.clone();
    curR.position.x = win.x + win.width / 2 + cw / 2 - 0.4;
    // folded look: thin darker stripes
    const foldL = boxMesh(0.6, win.height + 4, 0.9, shade(win.curtain, 0.75));
    foldL.position.copy(curL.position);
    foldL.position.z += 0.05;
    const foldR = foldL.clone();
    foldR.position.x = curR.position.x;
    const rod = boxMesh(win.width + cw * 2 + 2, 0.8, 0.8, P.woodDark);
    rod.position.set(win.x, win.y + win.height / 2 + 2.6, -D / 2 + 1.0);
    scene.add(curL, curR, foldL, foldR, rod);
  }

  // ---- door (back wall, hinged) ----
  const door = R.door;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(door.x - door.width / 2, 0, -D / 2 + 0.3);
  // panel lifted a hair off the floor — resting exactly on the floor plane
  // makes the threshold z-fight/shadow-flicker as the door swings
  const panel = boxMesh(door.width, door.height, 1, door.color);
  panel.position.set(door.width / 2, door.height / 2 + 0.06, 0);
  doorPivot.add(panel);
  const handle = boxMesh(1.2, 1.2, 1.6, '#ffd54f');
  handle.position.set(door.width - 1.2, door.height / 2, 0.8);
  doorPivot.add(handle);
  // nudged forward of the baseboard strip (front face would otherwise be at
  // exactly the same z-plane, -D/2+0.5, and the two flicker against each other)
  const frame = boxMesh(door.width + 2.4, door.height + 1.4, 1.4, P.woodDark);
  frame.position.set(door.x, (door.height + 1.4) / 2, -D / 2 - 0.12);
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
        // drawer unit under the desktop
        const drawer = boxMesh(w * 0.42, h - 2.4, d - 2.5, P.wood);
        drawer.position.set(w * 0.26, (h - 2.4) / 2, 0);
        const drawerLine1 = boxMesh(w * 0.42 - 0.6, 0.4, d - 2.2, P.woodDark);
        drawerLine1.position.set(w * 0.26, h * 0.55, 0);
        const drawerLine2 = drawerLine1.clone();
        drawerLine2.position.y = h * 0.3;
        const knob = boxMesh(1.4, 0.7, 0.5, '#78909c');
        knob.position.set(w * 0.26, h * 0.62, d / 2 - 1.0);
        const knob2 = knob.clone();
        knob2.position.y = h * 0.37;
        g.add(drawer, drawerLine1, drawerLine2, knob, knob2);
        // small monitor + clipboard on desk
        const mon = boxMesh(6, 4, 0.8, '#37474f');
        mon.position.set(-4, h + 2.8, -1.5);
        const monScreen = boxMesh(5.2, 3.2, 0.3, '#4fc3f7');
        monScreen.position.set(-4, h + 2.8, -1.05);
        const monStand = boxMesh(1.2, 1.6, 1.2, '#263238');
        monStand.position.set(-4, h + 0.6, -1.5);
        const papers = boxMesh(4, 0.3, 3, '#ffffff');
        papers.position.set(3.4, h + 0.2, 0.8);
        papers.rotation.y = 0.3;
        const penTray = boxMesh(2.4, 0.5, 1.4, '#eceff1');
        penTray.position.set(0.5, h + 0.4, -3.2);
        g.add(mon, monScreen, monStand, papers, penTray);
        // desk lamp
        const lampBase = new THREE.Mesh(
          new THREE.CylinderGeometry(1.3, 1.5, 0.6, 10),
          new THREE.MeshLambertMaterial({ color: P.metal })
        );
        lampBase.position.set(-w / 2 + 2.4, h + 0.3, d / 2 - 2.4);
        lampBase.castShadow = true;
        const lampArm = boxMesh(0.5, 4.5, 0.5, P.metal);
        lampArm.position.set(-w / 2 + 2.4, h + 2.5, d / 2 - 2.4);
        lampArm.rotation.x = -0.3;
        const lampHead = boxMesh(2.2, 1.4, 1.6, '#eceff1');
        lampHead.position.set(-w / 2 + 2.4, h + 4.6, d / 2 - 3.4);
        lampHead.rotation.x = 0.5;
        g.add(lampBase, lampArm, lampHead);
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
        // armrests
        for (const sx of [-1, 1]) {
          const post = boxMesh(0.9, 3.4, 0.9, P.woodDark);
          post.position.set(sx * 3.1, 9.4, 0.4);
          const rest = boxMesh(1.2, 0.9, 5.4, P.accent);
          rest.position.set(sx * 3.1, 11.2, 0.2);
          g.add(post, rest);
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
        // side safety rail
        const railTop = boxMesh(w - 4, 0.8, 0.8, P.metal);
        railTop.position.set(0, h + 3.4, d / 2 - 0.6);
        for (let i = -1; i <= 1; i++) {
          const railPost = boxMesh(0.7, 3, 0.7, P.metal);
          railPost.position.set(i * (w / 2 - 3), h + 1.9, d / 2 - 0.6);
          g.add(railPost);
        }
        // step stool at the foot
        const step = boxMesh(6, 2.4, 3, P.metal);
        step.position.set(w / 2 + 3, 1.2, 0);
        const stepTop = boxMesh(6.4, 0.8, 3.4, '#eceff1');
        stepTop.position.set(w / 2 + 3, 2.8, 0);
        g.add(base, mattress, pillow, railTop, step, stepTop);
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
        // door split + hinge line so the cabinet reads as two doors
        const split = boxMesh(0.5, h - 2, 0.4, '#cfd8dc');
        split.position.set(0, h / 2, d / 2 + 0.1);
        const handle3 = boxMesh(0.8, 3, 0.6, '#78909c');
        handle3.position.set(-w / 2 + 1, h / 2 - 1.5, d / 2 + 0.1);
        g.add(body, crossV, crossH, handle2, split, handle3);
        break;
      }
      case 'rug': {
        const [w, d] = item.size;
        const rc = item.colors || {};
        const inner = rc.inner || '#80cbc4';
        const outer = rc.outer || '#4db6ac';
        const rug = boxMesh(w, 0.5, d, inner);
        rug.position.set(0, 0.25, 0);
        rug.castShadow = false;
        const border = boxMesh(w + 1.6, 0.5, d + 1.6, outer);
        border.position.set(0, 0.18, 0);
        border.castShadow = false;
        // woven pattern: inner frame + center diamond
        const frame = boxMesh(w - 4, 0.2, d - 4, shade(inner, 0.85));
        frame.position.set(0, 0.56, 0);
        frame.castShadow = false;
        const dia = boxMesh(4.5, 0.2, 4.5, outer);
        dia.rotation.y = Math.PI / 4;
        // lifted clear of the rug's top face (y=0.5) — exactly touching = z-fight
        dia.position.set(0, 0.65, 0);
        dia.castShadow = false;
        g.add(border, rug, frame, dia);
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
        const pc = item.colors || {};
        const potC = pc.pot || '#bf6b3f';
        const pot = boxMesh(4, 4.5, 4, potC);
        pot.position.set(0, 2.25, 0);
        const rim = boxMesh(4.6, 0.9, 4.6, shade(potC, 0.8));
        rim.position.set(0, 4.3, 0);
        const soil = boxMesh(3.6, 0.4, 3.6, '#4e342e');
        soil.position.set(0, 4.7, 0);
        g.add(pot, rim, soil);
        const leafA = pc.leaf || '#43a047';
        const leafB = shade(leafA, 0.75);
        let y = 4.9;
        for (let i = 0; i < 4; i++) {
          const s = 5.2 - i * 1.05;
          const leaf = boxMesh(s, 2.2, s, i % 2 ? leafA : leafB);
          leaf.position.set((i % 2 ? -0.7 : 0.7), y + 1.1, (i % 2 ? 0.5 : -0.5));
          leaf.rotation.y = i * 0.35;
          g.add(leaf);
          y += 1.9;
        }
        break;
      }
      case 'poster': {
        const frame = boxMesh(0.5, 10, 8, P.woodDark);
        frame.position.set(0, 0, -0.3);
        g.add(frame);
        const board = boxMesh(0.6, 9, 7, P.white);
        board.position.set(0, item.pos[1] !== undefined ? 0 : 0, 0);
        g.add(board);
        const head = boxMesh(0.8, 1.6, 5.4, P.accent);
        head.position.set(0.1, 3.4, 0);
        const line1 = boxMesh(0.8, 0.5, 5, '#90a4ae');
        line1.position.set(0.1, 1.6, 0);
        const line2 = boxMesh(0.8, 0.5, 5, '#90a4ae');
        line2.position.set(0.1, 0.6, 0);
        // rising bar chart icon
        for (let i = 0; i < 3; i++) {
          const bar = boxMesh(0.7, 0.9 + i * 0.9, 1.1, P.accent);
          bar.position.set(0.15, -2.6 + (0.9 + i * 0.9) / 2 + i * 0.15, -2 + i * 1.4);
          g.add(bar);
        }
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
  const trayRim = boxMesh(PR.tray.size[0] + 0.6, PR.tray.size[1] * 0.7, PR.tray.size[2] + 0.6, shade(PR.tray.color, 0.75));
  trayRim.position.y = PR.tray.size[1] * 0.6;
  tray.add(trayRim);
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
        const foot = boxMesh(5.5, 0.6, 5.5, shade(c.bowl, 0.8));
        foot.position.y = 0.3;
        const rim = boxMesh(8.4, 0.7, 8.4, shade(c.bowl, 0.9));
        rim.position.y = 3.1;
        const mash = boxMesh(6, 2.4, 6, c.food);
        mash.position.y = 4.0;
        const chunk = boxMesh(2, 2, 2, c.food);
        chunk.position.set(-1.4, 5.8, 0.8);
        const chunk2 = boxMesh(1.6, 1.6, 1.6, shade(c.food, 0.9));
        chunk2.position.set(1.6, 5.6, -1);
        // steam wisps
        for (const [sx, sz] of [[-1, 0.5], [1, -0.6]]) {
          const steam = boxMesh(0.7, 2.6, 0.7, '#ffffff');
          steam.material.transparent = true;
          steam.material.opacity = 0.45;
          steam.position.set(sx * 1.6, 8.2, sz);
          fg.add(steam);
        }
        fg.add(foot, bowl, rim, mash, chunk, chunk2);
        break;
      }
      case 'yogurt': {
        const cup = boxMesh(5.4, 6.5, 5.4, c.cup);
        cup.position.y = 3.25;
        const stripe = boxMesh(5.7, 1.8, 5.7, c.stripe);
        stripe.position.y = 4.8;
        const stripe2 = boxMesh(5.6, 0.7, 5.6, c.stripe);
        stripe2.position.y = 1.4;
        const top = boxMesh(5.0, 0.7, 5.0, '#e8eaf0');
        top.position.y = 6.8;
        const lid = boxMesh(5.6, 0.9, 5.6, c.lid || c.stripe);
        lid.position.y = 7.15;
        // probiotic culture dots on the label
        for (let i = 0; i < 3; i++) {
          const dot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10),
            new THREE.MeshLambertMaterial({ color: c.stripe })
          );
          dot.rotation.x = Math.PI / 2;
          dot.position.set(-1.2 + i * 1.2, 3, 2.75);
          fg.add(dot);
        }
        fg.add(cup, stripe, stripe2, top, lid);
        break;
      }
      case 'katmast': {
        const plate = boxMesh(10, 1.2, 10, c.plate);
        plate.position.y = 0.6;
        const rim2 = boxMesh(10.4, 0.5, 10.4, shade(c.plate, 0.88));
        rim2.position.y = 1.2;
        const rice = boxMesh(7.5, 2.6, 7.5, c.rice);
        rice.position.y = 2.4;
        // rice grain texture bumps
        for (let i = 0; i < 5; i++) {
          const grain = boxMesh(1.1, 0.6, 0.9, shade(c.rice, 0.88));
          const ang = (i / 5) * Math.PI * 2;
          grain.position.set(Math.cos(ang) * 2.2, 3.9, Math.sin(ang) * 2.2);
          grain.rotation.y = ang;
          fg.add(grain);
        }
        const yog = boxMesh(3.4, 1.4, 3.4, c.yogurt);
        yog.position.set(2, 4.2, 2);
        const butter = boxMesh(1.4, 0.9, 1.4, c.butter || '#f9e79f');
        butter.position.set(-1.6, 4.2, -1.2);
        fg.add(plate, rim2, rice, yog, butter);
        break;
      }
      case 'ors': {
        const glassM = new THREE.MeshLambertMaterial({ color: c.glass, transparent: true, opacity: 0.55 });
        const glassB = new THREE.Mesh(new THREE.BoxGeometry(5, 7.5, 5), glassM);
        glassB.position.y = 3.75;
        glassB.castShadow = true;
        const liquid = boxMesh(4.2, 4.2, 4.2, c.liquid);
        liquid.position.y = 2.4;
        const surface = boxMesh(4.35, 0.5, 4.35, shade(c.liquid, 1.25));
        surface.position.y = 4.5;
        const straw = boxMesh(0.7, 5.5, 0.7, c.straw || '#ef5350');
        straw.position.set(1.2, 7, 1.2);
        straw.rotation.z = 0.35;
        const sachet = boxMesh(3, 5.5, 0.9, c.sachet);
        sachet.position.set(-3.4, 2.75, 1);
        sachet.rotation.z = -0.25;
        const stripe = boxMesh(3.1, 1.2, 1.0, '#ffffff');
        stripe.position.set(-3.4, 3.6, 1);
        stripe.rotation.z = -0.25;
        fg.add(glassB, liquid, surface, straw, sachet, stripe);
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
  cone.position.y = 2.85;
  cone.rotation.y = Math.PI / 3;
  cone.castShadow = true;
  const warnBase = boxMesh(4.4, 0.8, 4.4, PR.warning.mark);
  warnBase.position.y = 0.4;
  const mark = boxMesh(0.8, 2.2, 0.5, PR.warning.mark);
  mark.position.set(0, 3.1, 0.55);
  const dot = boxMesh(0.8, 0.8, 0.5, PR.warning.mark);
  dot.position.set(0, 1.3, 0.55);
  warnGroup.add(cone, warnBase, mark, dot);
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
  // highlight facet + darker underside for volume
  const hl = boxMesh(1.4, 1.4, 0.4, shade(hc, 1.35));
  hl.position.set(-2.2, 3.2, 1.1);
  hl.rotation.z = Math.PI / 4;
  const under = boxMesh(4, 3.2, 2.3, shade(hc, 0.75));
  under.position.set(0, -1.2, 0);
  under.rotation.z = Math.PI / 4;
  heart.add(diamond, bumpL, bumpR, hl, under);
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
