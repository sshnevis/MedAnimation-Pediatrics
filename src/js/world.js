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
  const ground = boxMesh(400, 1.4, 400, '#ccd5d8');
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

  // ---- window (back wall by default; win.side === 'left' puts it on the left wall) ----
  // Everything is built in a group using back-wall-local coords
  // (x = along the wall, z = into the room), then the group is placed+rotated.
  const win = R.window;
  const winG = new THREE.Group();
  // sky panel just in front of the wall surface — behind it, it would be hidden
  // by the wall itself and fight its faces
  const sky = boxMesh(win.width, win.height, 0.6, win.sky || '#aee3f5');
  sky.position.set(win.x, win.y, 0.35);
  sky.castShadow = false;
  winG.add(sky);
  // voxel greenery outside the window (trees seen through the glass)
  if (win.greenery) {
    const treeDefs = [
      [win.x - win.width * 0.28, 3.2, 6, '#66bb6a'],
      [win.x - win.width * 0.05, 2.4, 5, '#81c784'],
      [win.x + win.width * 0.24, 3.8, 7, '#4caf50'],
    ];
    for (const [tx, baseH, th, tc] of treeDefs) {
      const trunk = boxMesh(1.4, baseH, 1.2, '#6d4c41');
      trunk.position.set(tx, win.y - win.height / 2 + baseH / 2, 0.4);
      const crown = boxMesh(5, th, 3, tc);
      crown.position.set(tx, win.y - win.height / 2 + baseH + th / 2, 0.4);
      winG.add(trunk, crown);
    }
  }
  const cloud = boxMesh(win.width * 0.3, 1.6, 0.3, '#ffffff');
  cloud.position.set(win.x - win.width * 0.18, win.y + win.height * 0.32, 0.7);
  const cloud2 = boxMesh(win.width * 0.2, 1.2, 0.3, '#ffffff');
  cloud2.position.set(win.x + win.width * 0.25, win.y - win.height * 0.05, 0.7);
  winG.add(cloud, cloud2);
  const wf = boxMesh(win.width + 2, win.height + 2, 0.8, P.metal);
  wf.position.set(win.x, win.y, -0.1);
  const glass = boxMesh(win.width, win.height, 1.2, win.glassTint || '#cfeef8');
  glass.position.copy(wf.position);
  glass.material.transparent = true;
  glass.material.opacity = 0.35;
  winG.add(wf, glass);
  const barV = boxMesh(0.7, win.height, 1.0, P.metal); barV.position.copy(wf.position);
  const barH = boxMesh(win.width, 0.7, 1.0, P.metal); barH.position.copy(wf.position);
  winG.add(barV, barH);
  // window sill
  const sill = boxMesh(win.width + 3.2, 1, 2.2, P.wallTrim);
  sill.position.set(win.x, win.y - win.height / 2 - 1.4, 0.6);
  winG.add(sill);
  // little cactus pot on the sill
  const cacPot = boxMesh(3, 2.6, 3, '#bf6b3f');
  cacPot.position.set(win.x + win.width * 0.3, win.y - win.height / 2 - 0.6, 0.6);
  const cacBody = boxMesh(2, 4, 2, '#66bb6a');
  cacBody.position.set(win.x + win.width * 0.3, win.y - win.height / 2 + 1.8, 0.6);
  const cacArm = boxMesh(2.6, 1.4, 1.6, '#81c784');
  cacArm.position.set(win.x + win.width * 0.3 - 1.8, win.y - win.height / 2 + 2.4, 0.6);
  winG.add(cacPot, cacBody, cacArm);
  // curtains on both sides
  if (win.curtain) {
    const cw = 3.2;
    const curL = boxMesh(cw, win.height + 4, 0.8, win.curtain);
    curL.position.set(win.x - win.width / 2 - cw / 2 + 0.4, win.y + 0.6, 1.0);
    const curR = curL.clone();
    curR.position.x = win.x + win.width / 2 + cw / 2 - 0.4;
    // folded look: thin darker stripes
    const foldL = boxMesh(0.6, win.height + 4, 0.9, shade(win.curtain, 0.75));
    foldL.position.copy(curL.position);
    foldL.position.z += 0.05;
    const foldR = foldL.clone();
    foldR.position.x = curR.position.x;
    const rod = boxMesh(win.width + cw * 2 + 2, 0.8, 0.8, P.woodDark);
    rod.position.set(win.x, win.y + win.height / 2 + 2.6, 1.0);
    winG.add(curL, curR, foldL, foldR, rod);
  }
  if (win.side === 'left') {
    winG.position.set(-W / 2, 0, 0);
    winG.rotation.y = Math.PI / 2; // local +z (into room) → world +x
  } else {
    winG.position.set(0, 0, -D / 2);
  }
  scene.add(winG);

  // ---- door (back wall, hinged) ----
  const door = R.door;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(door.x - door.width / 2, 0, -D / 2 + 0.3);
  // panel lifted a hair off the floor — resting exactly on the floor plane
  // makes the threshold z-fight/shadow-flicker as the door swings
  const panel = boxMesh(door.width, door.height, 1, door.color);
  panel.position.set(door.width / 2, door.height / 2 + 0.06, 0);
  doorPivot.add(panel);
  const handle = boxMesh(1.2, 1.2, 1.6, '#cfd8dc');
  handle.position.set(door.width - 1.2, door.height / 2, 0.8);
  doorPivot.add(handle);
  // nudged forward of the baseboard strip (front face would otherwise be at
  // exactly the same z-plane, -D/2+0.5, and the two flicker against each other)
  // Frame lightened vs woodDark so it still reads against the light door panel
  const frame = boxMesh(door.width + 2.4, door.height + 1.4, 1.4, '#8d6e63');
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
        // Image: wooden top on a white/cream body
        const top = boxMesh(w, 1.6, d, P.wood);
        top.position.set(0, h - 0.8, 0);
        g.add(top);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const leg = boxMesh(1.4, h - 1.6, 1.4, P.white);
          leg.position.set(sx * (w / 2 - 1.2), (h - 1.6) / 2, sz * (d / 2 - 1.2));
          g.add(leg);
        }
        // drawer unit under the desktop (cream body)
        const drawer = boxMesh(w * 0.42, h - 2.4, d - 2.5, '#eceff1');
        drawer.position.set(w * 0.26, (h - 2.4) / 2, 0);
        const drawerLine1 = boxMesh(w * 0.42 - 0.6, 0.4, d - 2.2, '#cfd8dc');
        drawerLine1.position.set(w * 0.26, h * 0.55, 0);
        const drawerLine2 = drawerLine1.clone();
        drawerLine2.position.y = h * 0.3;
        const knob = boxMesh(1.4, 0.7, 0.5, '#78909c');
        knob.position.set(w * 0.26, h * 0.62, d / 2 - 1.0);
        const knob2 = knob.clone();
        knob2.position.y = h * 0.37;
        g.add(drawer, drawerLine1, drawerLine2, knob, knob2);
        // monitor on desk — screen faces the DOCTOR (local -z side, where he sits)
        const mon = boxMesh(6, 4, 0.8, '#37474f');
        mon.position.set(-3, h + 2.8, 0.5);
        const monScreen = boxMesh(5.2, 3.2, 0.3, '#4fc3f7');
        monScreen.position.set(-3, h + 2.8, 0.05);
        const monStand = boxMesh(1.2, 1.6, 1.2, '#263238');
        monStand.position.set(-3, h + 0.6, 0.5);
        const keyboard = boxMesh(6, 0.5, 2.2, '#263238');
        keyboard.position.set(-2.5, h + 0.35, -3.4);
        const papers = boxMesh(4, 0.3, 3, '#ffffff');
        papers.position.set(4.2, h + 0.25, -1.5);
        papers.rotation.y = 0.3;
        // stack of reference books
        const book1 = boxMesh(4.4, 0.9, 3, '#1e88e5');
        book1.position.set(6.5, h + 0.55, 2.4);
        const book2 = boxMesh(4, 0.8, 2.7, '#e53935');
        book2.position.set(6.4, h + 1.4, 2.5);
        book2.rotation.y = -0.25;
        const penTray = boxMesh(2.4, 0.5, 1.4, '#eceff1');
        penTray.position.set(1.5, h + 0.4, 2.8);
        g.add(mon, monScreen, monStand, keyboard, papers, book1, book2, penTray);
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
        // Enlarged guest chair — seat top at y=9, which is the seat height the
        // sit math in voxel.js (sitY) is tuned to. Bigger seat/back so the
        // mother and child read as properly seated, not perched.
        const seat = boxMesh(15, 1.6, 8, P.accent);
        seat.position.set(0, 8.2, 0);
        const backrest = boxMesh(15, 9, 1.5, P.accent);
        backrest.position.set(0, 13, -3.2);
        g.add(seat, backrest);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const leg = boxMesh(1.3, 8.2, 1.3, P.woodDark);
          leg.position.set(sx * 6.4, 4.1, sz * 3.2);
          g.add(leg);
        }
        // armrests — placed outside the seated character's arms (arms span to x≈±7.2)
        for (const sx of [-1, 1]) {
          const post = boxMesh(1, 4, 1, P.woodDark);
          post.position.set(sx * 7.1, 11, 0.4);
          const rest = boxMesh(1.3, 1, 6.4, P.accent);
          rest.position.set(sx * 7.1, 13.2, 0.2);
          g.add(post, rest);
        }
        break;
      }
      case 'officeChair': {
        // black swivel desk chair the doctor sits in
        const dark = '#37474f';
        const darker = '#263238';
        const seat = boxMesh(7, 1.4, 7, dark);
        seat.position.set(0, 8.3, 0); // seat top = 9 — matches the sit height in voxel.js
        const backrest = boxMesh(7, 9, 1.4, dark);
        backrest.position.set(0, 13.8, -3);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.9, 6.2, 8),
          new THREE.MeshLambertMaterial({ color: darker })
        );
        post.position.set(0, 4.2, 0);
        g.add(seat, backrest, post);
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const arm = boxMesh(5, 0.9, 1.2, darker);
          arm.position.set(Math.sin(ang) * 2.2, 1, Math.cos(ang) * 2.2);
          arm.rotation.y = ang;
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 0.6, 8),
            new THREE.MeshLambertMaterial({ color: '#111111' })
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.rotation.y = ang;
          wheel.position.set(Math.sin(ang) * 4.2, 0.8, Math.cos(ang) * 4.2);
          g.add(arm, wheel);
        }
        break;
      }
      case 'stool': {
        // rolling exam stool with teal round seat
        const seatC = new THREE.Mesh(
          new THREE.CylinderGeometry(3.4, 3.4, 1.4, 12),
          new THREE.MeshLambertMaterial({ color: P.accent })
        );
        seatC.position.y = 7.2;
        seatC.castShadow = true;
        const postS = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.7, 6, 8),
          new THREE.MeshLambertMaterial({ color: P.metal })
        );
        postS.position.y = 3.6;
        g.add(seatC, postS);
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2;
          const legS = boxMesh(4.5, 0.8, 1, P.metal);
          legS.position.set(Math.sin(ang) * 1.8, 0.9, Math.cos(ang) * 1.8);
          legS.rotation.y = ang;
          const caster = new THREE.Mesh(
            new THREE.CylinderGeometry(0.7, 0.7, 0.6, 8),
            new THREE.MeshLambertMaterial({ color: '#111111' })
          );
          caster.rotation.z = Math.PI / 2;
          caster.rotation.y = ang;
          caster.position.set(Math.sin(ang) * 3.4, 0.7, Math.cos(ang) * 3.4);
          g.add(legS, caster);
        }
        break;
      }
      case 'bookshelf': {
        const bw = 14, bh = 22, bd = 6;
        const wood = '#a1887f';
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const post = boxMesh(1, bh, 1, '#8d6e63');
          post.position.set(sx * (bw / 2 - 0.5), bh / 2, sz * (bd / 2 - 0.5));
          g.add(post);
        }
        const bookColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'];
        for (let s = 0; s < 3; s++) {
          const shelf = boxMesh(bw, 0.7, bd, wood);
          shelf.position.set(0, 2.5 + s * 7, 0);
          g.add(shelf);
          // row of books on each shelf
          let bx = -bw / 2 + 1.6;
          let bi = s;
          while (bx < bw / 2 - 2) {
            const bwid = 1.1 + ((s * 7 + bi) % 3) * 0.35;
            const bhei = 4 + ((bi * 3) % 2);
            const book = boxMesh(bwid, bhei, 4.4, bookColors[bi % bookColors.length]);
            book.position.set(bx + bwid / 2, 2.5 + s * 7 + 0.35 + bhei / 2, 0.4);
            g.add(book);
            bx += bwid + 0.35;
            bi++;
          }
        }
        const topShelf = boxMesh(bw + 0.8, 0.8, bd + 0.8, wood);
        topShelf.position.y = bh;
        g.add(topShelf);
        break;
      }
      case 'sideTable': {
        const top = boxMesh(11, 1, 9, P.wood);
        top.position.y = 8.5;
        const body = boxMesh(9.5, 8, 7.5, '#78909c');
        body.position.y = 4;
        g.add(top, body);
        // tissue box
        const tBox = boxMesh(5, 3.4, 4, P.accent);
        tBox.position.set(-2, 10.7, 0.5);
        const tissue = boxMesh(2.6, 1.6, 2, '#ffffff');
        tissue.position.set(-2, 12.8, 0.5);
        g.add(tBox, tissue);
        // small cactus in a white pot
        const cpot = boxMesh(3, 2.6, 3, '#eceff1');
        cpot.position.set(3, 10.3, 0.5);
        const cbody = boxMesh(1.8, 3.6, 1.8, '#66bb6a');
        cbody.position.set(3, 13, 0.5);
        const carm = boxMesh(2.2, 1.2, 1.4, '#81c784');
        carm.position.set(1.6, 13.5, 0.5);
        g.add(cpot, cbody, carm);
        break;
      }
      case 'welcomePoster': {
        // framed "welcome" poster with a teddy bear (back wall, pos[1] = height)
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 1.0);
        // frame sits BEHIND the board front face so the board stays visible
        // Face spans x (wall width) × y (height); thin z (back wall poster)
        const frame = boxMesh(11, 13, 0.6, '#6f8fa8');
        frame.position.set(0, 0, -0.3);
        const board = boxMesh(10, 12, 0.7, '#f2f9ff');
        board.position.set(0, 0, 0.3);
        g.add(frame, board);
        // teddy head + ears + muzzle (proud of the board face at z≈0.9)
        const bear = '#a1704f';
        const head = boxMesh(4.2, 3.8, 0.8, bear);
        head.position.set(0.1, 2.6, 0.9);
        for (const ex of [-1.7, 1.7]) {
          const ear = boxMesh(1.4, 1.4, 0.7, shade(bear, 0.8));
          ear.position.set(0.1 + ex, 4.6, 0.9);
          g.add(ear);
        }
        const muzzle = boxMesh(1.8, 1.2, 0.5, '#d7a97c');
        muzzle.position.set(0.1, 2.1, 1.1);
        g.add(head, muzzle);
        // text bars + heart
        const bar1 = boxMesh(6.4, 1.1, 0.6, '#37474f');
        bar1.position.set(0.15, 0.4, 0.85);
        const bar2 = boxMesh(5, 1.1, 0.6, '#37474f');
        bar2.position.set(0.15, -1.2, 0.85);
        const heartP = boxMesh(1.6, 1.6, 0.6, '#e53935');
        heartP.rotation.z = Math.PI / 4;
        heartP.position.set(0.3, -3, 0.9);
        g.add(bar1, bar2, heartP);
        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
        break;
      }
      case 'foodPoster': {
        // colorful food poster matching the L03 props (back wall, pos[1] = height)
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 1.0);
        const bg = item.bg || '#fdd835';
        const frame = boxMesh(9.5, 10.5, 0.6, shade(bg, 0.7));
        frame.position.set(0, 0, -0.3);
        const board = boxMesh(8.5, 9.5, 0.7, bg);
        board.position.set(0, 0, 0.3);
        g.add(frame, board);
        const c = item.icon === 'potato' ? { dish: '#ffffff', food: '#f3d36b' }
          : item.icon === 'yogurt' ? { dish: '#fafafa', food: '#e53935' }
          : item.icon === 'katmast' ? { dish: '#ffffff', food: '#f6f1e3' }
          : { dish: '#cfe9f7', food: '#7fc9ec' };
        if (item.icon === 'ors') {
          // little ORS bottle
          const bottle = boxMesh(2.4, 4.6, 1.2, c.dish);
          bottle.position.set(0, 1.6, 1.1);
          const neck = boxMesh(1.2, 1.2, 1.2, c.dish);
          neck.position.set(0, 4.4, 1.1);
          const cap = boxMesh(1.5, 0.7, 1.5, '#e53935');
          cap.position.set(0, 5.2, 1.1);
          const liquidP = boxMesh(1.7, 2.4, 1.4, c.food);
          liquidP.position.set(0, 1, 1.25);
          g.add(bottle, neck, cap, liquidP);
        } else {
          const dish = boxMesh(4.6, 1.2, 3, c.dish);
          dish.position.set(0, 0.4, 1.05);
          const food = boxMesh(3.4, 2, 2.4, c.food);
          food.position.set(0, 1.9, 1.05);
          g.add(dish, food);
        }
        if (item.label) {
          // label printed on the poster itself (transparent sprite bg, dark text)
          const lbl = textSprite(item.label, { fontSize: 40, bg: 'rgba(0,0,0,0)', fg: '#263238' });
          lbl.position.set(0, -3.1, 1.0);
          lbl.scale.multiplyScalar(0.5);
          g.add(lbl);
        }

        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
        world.foodPosters = world.foodPosters || {};
        world.foodPosters[item.icon] = g;
        break;
      }
      case 'whiteboard': {
        // teal-framed whiteboard with heart + pulse line; rotY aims local +z
        // Center on the wall (~eye height); board is 15 tall so y≈14 keeps it clear of the floor
        g.position.y = 14;
        const wframe = boxMesh(1, 15, 18, P.accent);
        wframe.position.y = 0;
        const wboard = boxMesh(0.8, 13.6, 16.6, '#ffffff');
        wboard.position.set(-0.2, 0, 0);
        g.add(wframe, wboard);
        // red heart icon
        const hw = 2.6;
        const hd = boxMesh(hw, hw, 0.5, '#e53935');
        hd.rotation.z = Math.PI / 4;
        hd.position.set(0.3, 3.2, 0.4);
        const hl1 = boxMesh(1.7, 1.7, 0.5, '#e53935');
        hl1.position.set(0.3 - 0.9, 3.2 + 0.9, 0.4);
        const hl2 = hl1.clone();
        hl2.position.x = 0.3 + 0.9;
        g.add(hd, hl1, hl2);
        // pulse line: segments in the board plane (local YZ)
        const pulse = [[-5.4, -2.4], [-3.6, -2.4], [-2.6, -0.6], [-1.2, -4], [0.2, -1.4], [1.4, -2.4], [5.4, -2.4]];
        for (let i = 0; i < pulse.length - 1; i++) {
          const [ay, az] = pulse[i];
          const [by, bz] = pulse[i + 1];
          const len = Math.hypot(by - ay, bz - az);
          const seg = boxMesh(0.5, 0.5, len, '#e53935');
          seg.rotation.x = Math.atan2(-(by - ay), bz - az);
          seg.position.set(0.3, (ay + by) / 2, (az + bz) / 2);
          g.add(seg);
        }
        // marker tray
        const trayW = boxMesh(1.6, 0.7, 12, '#b2dfdb');
        trayW.position.set(-0.8, -7.2, 0);
        const marker = boxMesh(0.6, 0.6, 3, '#ef5350');
        marker.position.set(-1, -6.6, -2);
        g.add(trayW, marker);
        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
        break;
      }
      case 'stetho': {
        // stethoscope hanging on the back wall
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 0.9);
        const hook = boxMesh(1.4, 1.2, 0.8, '#78909c');
        hook.position.set(0, 4.6, -0.2);
        const tubeC = '#90a4ae';
        const tubeL = boxMesh(0.8, 5.5, 0.7, tubeC);
        tubeL.position.set(-1.5, 1.2, 0);
        tubeL.rotation.z = 0.18;
        const tubeR = tubeL.clone();
        tubeR.position.x = 1.5;
        tubeR.rotation.z = -0.18;
        const bridge = boxMesh(3.4, 0.8, 0.7, tubeC);
        bridge.position.set(0, 4, 0);
        const chest = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, 0.7, 12),
          new THREE.MeshLambertMaterial({ color: '#546e7a' })
        );
        chest.rotation.x = Math.PI / 2;
        chest.position.set(0, -2.4, 0.3);
        g.add(hook, tubeL, tubeR, bridge, chest);
        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
        break;
      }
      case 'examBed': {
        const [w, h, d] = item.size;
        const baseH = h - 3.5;
        const base = boxMesh(w, baseH, d - 1, P.metal);
        base.position.set(0, baseH / 2, 0);
        const mattress = boxMesh(w - 1, 2.6, d, '#ffffff');
        mattress.position.set(0, h - 2.2, 0);
        // Teal pad proud of the white mattress (Rule 1: ≥ 0.1 clearance)
        const mattressTop = (h - 2.2) + 1.3;
        const padH = 1.0;
        const tealPad = boxMesh(w - 2.2, padH, d - 1.2, '#4db6ac');
        tealPad.position.set(0, mattressTop + 0.1 + padH / 2, 0);
        const pillow = boxMesh(4.5, 1.8, d - 2, '#b2ebf2');
        pillow.position.set(-w / 2 + 3.4, mattressTop + 0.1 + padH + 0.9, 0);
        // Drawers on the room-facing side (local -Z → world −X when rotY=π/2)
        const baseFrontZ = -(d - 1) / 2;
        const drawerFront = boxMesh(w * 0.38, baseH * 0.36, 0.6, '#eceff1');
        drawerFront.position.set(-w * 0.22, baseH * 0.55, baseFrontZ - 0.1 - 0.3);
        const drawerFront2 = drawerFront.clone();
        drawerFront2.position.x = w * 0.22;
        const dKnob = boxMesh(0.7, 0.7, 0.5, '#78909c');
        dKnob.position.set(-w * 0.22, baseH * 0.55, baseFrontZ - 0.1 - 0.65);
        const dKnob2 = dKnob.clone();
        dKnob2.position.x = w * 0.22;
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
        g.add(base, mattress, tealPad, pillow, drawerFront, drawerFront2, dKnob, dKnob2, railTop, step, stepTop);
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

        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
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
  // Wide X spacing (gap 10) so the bowl/plate dishes never overlap each other
  const offsets = [-15, -5, 5, 15];
  PR.foods.forEach((food, i) => {
    const fg = new THREE.Group();
    fg.userData.foodId = food.id;
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
    // smaller so neighboring labels on the compact tray don't overlap
    lbl.scale.multiplyScalar(0.6);
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
  heart.position.set(heartXZ.x, 26, heartXZ.z);
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
      heart.position.y = 26 + Math.sin(t * 2.2) * 0.6;
      heart.rotation.y = Math.sin(t * 1.3) * 0.25;
    }
  };

  return world;
}
