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
  ground.name = 'ground';
  scene.add(ground);

  // ---- walls: back (z=-D/2), left, right ----
  // Walls have real thickness (wallThickness, default 5) so openings — the
  // window — read as cut THROUGH the wall, not as decals on a paper-thin slab.
  const wallH = R.wallHeight;
  const WT = R.wallThickness || 5;
  const back = boxMesh(W, wallH, WT, P.wall);
  back.position.set(0, wallH / 2, -D / 2 - WT / 2);
  back.castShadow = false;
  back.name = 'wall-back';
  scene.add(back);
    // Back-wall trims form a depth ladder off the wall face (Rule 24: every
    // visible same-facing pair ≥ 0.35 apart): trim 0.4, baseboard 0.8,
    // wainscot band 1.2, cap rail 1.6 (all in wall-local units).
    // trimB and baseB stop at the door casing sides — they would otherwise land
    // within the flicker zone of the door panel/frame faces, and real
    // baseboards die into the door casing anyway.
  const doorL = R.door ? R.door.x - R.door.width / 2 - 1.2 : null;
  const doorR = R.door ? R.door.x + R.door.width / 2 + 1.2 : null;
  const doorSpans = (full) => {
    if (doorL === null) return [[-full / 2, full / 2]];
    return [[-full / 2, doorL], [doorR, full / 2]];
  };
  for (const [a, b] of doorSpans(W)) {
    const trimB = boxMesh(b - a, 1.4, 1.5, P.wallTrim);
    trimB.position.set((a + b) / 2, 0.7, -D / 2 - 0.35); // front: -D/2+0.4
    trimB.castShadow = false;
    trimB.name = 'trim-back';
    scene.add(trimB);
  }
  for (const [a, b] of doorSpans(W)) {
    const baseB = boxMesh(b - a, 2.6, 0.8, P.wallTrim);
    baseB.position.set((a + b) / 2, 1.3, -D / 2 + 0.4); // front: -D/2+0.8
    baseB.castShadow = false;
    baseB.name = 'baseboard-back';
    scene.add(baseB);
  }
  const win = R.window;
  const winOnLeft = win && win.side === 'left';
  // Left wall — either one solid slab, or (window wall) four segments around
  // the window opening: below sill, above head, and one flank on each side.
  // World z of the opening on the left wall (local +x maps to world −z):
  const wz0 = winOnLeft ? -win.x - win.width / 2 : 0;
  const wz1 = winOnLeft ? -win.x + win.width / 2 : 0;
  const hy0 = winOnLeft ? win.y - win.height / 2 : 0;
  const hy1 = winOnLeft ? win.y + win.height / 2 : 0;
  if (winOnLeft) {
    const lx = -W / 2 - WT / 2;
    // below the sill — full depth of the wall
    const segBelow = boxMesh(WT, hy0, D, P.wall);
    segBelow.position.set(lx, hy0 / 2, 0);
    // above the head
    const segAbove = boxMesh(WT, wallH - hy1, D, P.wall);
    segAbove.position.set(lx, hy1 + (wallH - hy1) / 2, 0);
    segBelow.castShadow = false;
    segAbove.castShadow = false;
    scene.add(segBelow, segAbove);
    // the two flanks beside the opening
    for (const [a, b] of [[-D / 2, wz0], [wz1, D / 2]]) {
      const len = b - a;
      if (len <= 0.5) continue;
      const seg = boxMesh(WT, hy1 - hy0, len, P.wall);
      seg.position.set(lx, (hy0 + hy1) / 2, a + len / 2);
      // walls never cast: a casting flank stripes the window scenery/sill
      // with swimming shadow texels (Rule 3 / Q2 — shadows belong under
      // furniture, not across walls or window dressing)
      seg.castShadow = false;
      scene.add(seg);
    }
  } else {
    const left = boxMesh(WT, wallH, D, P.wall);
    left.position.set(-W / 2 - WT / 2, wallH / 2, 0);
    left.castShadow = false;
    scene.add(left);
  }
  const baseL = boxMesh(0.8, 2.6, D - 0.8, P.wallTrim);
  baseL.position.set(-W / 2 + 0.1, 1.3, 0); // ends 0.4 short of the wall ends (coplanar end faces)
  baseL.castShadow = false;
  scene.add(baseL);
  const rightDepth = D;
  const right = boxMesh(WT, wallH, rightDepth, P.wall);
  right.position.set(W / 2 + WT / 2, wallH / 2, -D / 2 + rightDepth / 2);
  right.castShadow = false;
  scene.add(right);

  // ---- wainscot: gray tile band along the lower walls (project 2.png) ----
  if (R.wainscot) {
    const wh = R.wainscot.height;
    const wc = R.wainscot.color;
    // bands sit proud of the wall faces (walls are at -D/2 and -W/2 outer edges);
    // back-wall ladder: band front 1.2, rail front 1.6 (≥0.35 steps, Rule 24)
    const backW = boxMesh(W, wh, 0.5, wc);
    backW.position.set(0, wh / 2, -D / 2 + 0.95);
    backW.castShadow = false;
    backW.name = 'wainscot-back';
    const leftW = winOnLeft
      ? null // segmented below — the band is cut by the window opening too
      : (() => {
          const b = boxMesh(0.5, wh, D, wc);
          b.position.set(-W / 2 + 0.85, wh / 2, 0);
          b.castShadow = false;
          scene.add(b);
          return b;
        })();
    if (winOnLeft) {
      // band on the two flanks (full height) + a shorter band under the sill
      for (const [a, b] of [[-D / 2, wz0], [wz1, D / 2]]) {
        const len = b - a;
        if (len <= 0.5) continue;
        const seg = boxMesh(0.5, wh, len, wc);
        seg.position.set(-W / 2 + 0.85, wh / 2, a + len / 2);
        seg.castShadow = false;
        scene.add(seg);
      }
      if (hy0 > 1) {
        const under = boxMesh(0.5, Math.min(wh, hy0), wz1 - wz0, wc);
        under.position.set(-W / 2 + 0.85, Math.min(wh, hy0) / 2, (wz0 + wz1) / 2);
        under.castShadow = false;
        scene.add(under);
      }
    }
    const rightW = boxMesh(0.5, wh, rightDepth, wc);
    rightW.position.set(W / 2 - 0.85, wh / 2, -D / 2 + rightDepth / 2);
    rightW.castShadow = false;
    scene.add(backW, leftW, rightW);
    // thin cap rail on top of the band — proud of the band face, not flush
    if (R.wainscot.rail) {
      const railB = boxMesh(W, 0.9, 0.8, R.wainscot.rail);
      railB.position.set(0, wh + 0.45, -D / 2 + 1.2); // front: -D/2+1.6
      const railL = winOnLeft
        ? null // rail is cut by the window opening on the window wall
        : (() => {
            const r = boxMesh(0.8, 0.9, D, R.wainscot.rail);
            r.position.set(-W / 2 + 1.0, wh + 0.45, 0);
            return r;
          })();
      if (winOnLeft) {
        for (const [a, b] of [[-D / 2, wz0], [wz1, D / 2]]) {
          const len = b - a;
          if (len <= 0.5) continue;
          const r = boxMesh(0.8, 0.9, len, R.wainscot.rail);
          r.position.set(-W / 2 + 1.0, wh + 0.45, a + len / 2);
          r.castShadow = false;
          scene.add(r);
        }
      }
      const railR = boxMesh(0.8, 0.9, rightDepth, R.wainscot.rail);
      railR.position.set(W / 2 - 1.0, wh + 0.45, -D / 2 + rightDepth / 2);
      railB.castShadow = false;
      if (railL) railL.castShadow = false;
      railR.castShadow = false;
      scene.add(railB, railL, railR);
    }
  }

  // ---- window (back wall by default; win.side === 'left' puts it on the left wall) ----
  // Everything is built in a group using back-wall-local coords
  // (x = along the wall, z = into the room), then the group is placed+rotated.
  // Rebuilt to match the reference frame (window corner of the visit room):
  // deep voxel scenery OUTSIDE the glass — layered sky, sun, clouds, multi-block
  // trees on a grass strip — plus a white frame, roller blind, white curtain
  // and a leafy plant on the sill.
  const winG = new THREE.Group();
  winG.name = 'window';
  const winFrameC = win.frame || P.metal; // ep01 keeps the metal frame; new rooms opt into white
  const sillY = win.y - win.height / 2;
  // The window is a TUNNEL through the thick wall: local z=0 is the inner wall
  // face, negative z goes into the wall depth. Every face of every piece keeps
  // ≥ 0.35 from the planes of its neighbours (Rule 24) — the reveal planes at
  // the opening edges (y = sillY / win.y+height/2, x = ±width/2) especially:
  // frame/sill faces used to land EXACTLY on them and flickered over the whole
  // sill and jambs.
  const TZ = -WT; // outer wall face in window-local z
  // 1) sky panel + horizon band — oversized so the tunnel edges never show past
  // it at oblique camera angles. The sky sits deep (front at TZ-0.15) so the
  // tree trunks/crowns can keep their approved depth in front of it.
  const sky = boxMesh(win.width + 6, win.height + 6, 0.5, win.sky || '#aee3f5');
  sky.position.set(win.x, win.y, TZ - 0.4);
  sky.castShadow = false;
  sky.name = 'win-sky';
  winG.add(sky);
  const horizon = boxMesh(win.width + 2, win.height * 0.45, 0.6, '#8fd08a');
  horizon.position.set(win.x, sillY + win.height * 0.14, TZ + 0.9);
  horizon.castShadow = false;
  horizon.name = 'win-horizon';
  winG.add(horizon);
  // 2) sun disc (upper corner, away from the curtain side)
  const sunDisc = boxMesh(4.2, 4.2, 0.5, '#fff3b0');
  sunDisc.position.set(win.x + win.width * 0.38, win.y + win.height * 0.36, TZ + 1.3);
  sunDisc.castShadow = false;
  const sunGlow = boxMesh(5.6, 5.6, 0.4, '#ffe37e');
  sunGlow.position.copy(sunDisc.position);
  sunGlow.position.z -= 0.5;
  winG.add(sunGlow, sunDisc);
  // 3) voxel trees OUTSIDE the glass — layered blocky crowns like the reference.
  // Consecutive crown layers must NOT overlap vertically (spacing 2.3 > height
  // 2.1). Each tree sits in its own depth slot; the slots are deep enough that
  // every trunk/crown front clears the horizon front (TZ+1.2) by ≥ 0.35 and
  // stays clear of the sky panel — low-crowned trees (2 and 4) get the deepest
  // slots because their lowest crowns overlap the horizon band's height.
  if (win.greenery) {
    const treeDefs = [
      // [x, trunkH, crownLayers, crownW, color, zOffset]
      [win.x - win.width * 0.32, 7, 4, 8, '#66bb6a', 0],
      [win.x - win.width * 0.08, 4, 3, 7, '#81c784', -1.15],
      [win.x + win.width * 0.2, 9, 4, 8.2, '#4caf50', -1.0],
      [win.x + win.width * 0.42, 5, 3, 5.6, '#7cb342', -1.0],
    ];
    for (const [ti, [tx, trunkH, layers, crownW, tc, zoff]] of treeDefs.entries()) {
      const trunk = boxMesh(1.6, trunkH, 1.2, '#6d4c41');
      trunk.position.set(tx, sillY + 1 + trunkH / 2, TZ + 1.15 + zoff);
      trunk.name = 'win-tree';
      winG.add(trunk);
      let ly = sillY + 1 + trunkH;
      for (let i = 0; i < layers; i++) {
        const lw = crownW - i * 1.7;
        const crown = boxMesh(lw, 2.1, 1.2, i % 2 ? shade(tc, 1.15) : tc);
        crown.position.set(tx, ly + 1.05, TZ + 1.15 + zoff + i * 0.1);
        crown.castShadow = false;
        crown.name = 'win-tree';
        winG.add(crown);
        ly += 2.3;
      }
    }
    // low bushes along the grass strip
    for (const [bx, bs] of [[win.x - win.width * 0.18, 3.4], [win.x + win.width * 0.06, 2.8], [win.x + win.width * 0.3, 3.8]]) {
      const bush = boxMesh(bs, bs * 0.75, 1.2, '#7cb342');
      bush.position.set(bx, sillY + 1 + bs * 0.3, TZ + 1.2);
      bush.castShadow = false;
      bush.name = 'win-bush';
      winG.add(bush);
    }
  }
  // 4) clouds drifting in the upper sky — BEHIND the tree crowns (correct depth
  // order), 0.4+ clear of each other and of the sky panel.
  const cloudDefs = [
    [win.x - win.width * 0.22, win.y + win.height * 0.3, 3],
    [win.x - win.width * 0.175, win.y + win.height * 0.16, 2.4],
    [win.x + win.width * 0.35, win.y + win.height * 0.275, 2],
  ]; // x/y slots keep every cloud clear of the tree-crown footprints
  for (const [cx, cy, cs] of cloudDefs) {
    const CZ = TZ + 0.15; // one shared depth plane: 0.5 off the sky front,
    // 0.65 behind the sun-glow front, 0.4+ clear of every tree crown
    const c1 = boxMesh(cs * 3, cs, 0.5, '#ffffff');
    c1.position.set(cx, cy, CZ);
    // side puffs join the main puff in the same plane (coplanar same-color —
    // reads as one cloud silhouette; offset planes fought the glow/crowns)
    const c2 = boxMesh(cs * 1.6, cs * 0.8, 0.5, '#ffffff');
    c2.position.set(cx + cs * 1.2, cy + cs * 0.5, CZ);
    const c3 = boxMesh(cs * 1.4, cs * 0.7, 0.5, '#ffffff');
    c3.position.set(cx - cs * 1.1, cy + cs * 0.35, CZ);
    c1.name = c2.name = c3.name = 'win-cloud';
    winG.add(c1, c2, c3);
  }
  // 5) frame border around the opening (4 bars, NOT a solid slab — scenery is
  // deep inside the tunnel now) + mid-tunnel glass and mullions. The cut wall
  // segments provide the real jambs/reveal.
  // The header is DEEPER than the jambs (1.8 vs 1.4) so the corner fronts never
  // share a plane, and every bar overlaps its opening edge by 0.4 so no bar
  // face lands on the wall segments' reveal planes (they used to be EXACTLY
  // flush there and flickered against the wall colour).
  // The bottom bar is replaced by the raised sill below.
  const fw = win.width + 2.4;
  const frameTop = boxMesh(fw, 1.2, 1.8, winFrameC);
  frameTop.position.set(win.x, win.y + win.height / 2 + 0.2, 0);
  frameTop.name = 'win-frame';
  const frameL = boxMesh(1.2, win.height + 0.3, 1.4, winFrameC);
  frameL.position.set(win.x - win.width / 2 - 0.2, win.y + 0.25, -0.2);
  frameL.name = 'win-frame';
  const frameR = frameL.clone();
  frameR.position.x = win.x + win.width / 2 + 0.2;
  winG.add(frameTop, frameL, frameR);
  // glass tint kept VERY light so the deep scenery behind stays readable
  const glass = boxMesh(win.width, win.height, 0.4, win.glassTint || '#cfeef8');
  glass.position.set(win.x, win.y, TZ / 2);
  glass.material.transparent = true;
  glass.material.opacity = 0.14;
  glass.castShadow = false;
  glass.name = 'win-glass';
  winG.add(glass);
  // cross mullions with the glass, mid-tunnel — 1.2 deep so both mullion faces
  // clear both glass faces by 0.4 (the 0.9-deep version sat 0.25 off the glass)
  const barV = boxMesh(0.8, win.height, 1.2, winFrameC); barV.position.set(win.x, win.y, TZ / 2);
  const barH = boxMesh(win.width, 0.8, 1.2, winFrameC); barH.position.set(win.x, win.y, TZ / 2);
  barV.name = barH.name = 'win-mullion';
  winG.add(barV, barH);
  // 6) roller blind (half-lowered white blind at the top, like the reference)
  // Opt-in via win.blind:true — older rooms (ep01) keep their approved look.
  if (win.blind) {
    const blindH = win.height * 0.28;
    // 1.2 narrower: the ends touch the jamb inner faces (culled contact) so the
    // blind front never overlaps the jamb fronts; 0.8 lower: the top tucks
    // 0.4 under the header bottom (the front ran 0.2 from the header front)
    const blind = boxMesh(win.width - 1.2, blindH, 0.5, '#f5f5f2');
    blind.position.set(win.x, win.y + win.height / 2 - blindH / 2 - 0.8, 0.45);
    blind.castShadow = false;
    blind.name = 'win-blind';
    winG.add(blind);
    // horizontal slat lines on the blind — proud of the blind's front face
    // (0.7) by 0.4 so the slat fronts never flicker against the panel
    for (let sy = 1; sy <= 3; sy++) {
      const slat = boxMesh(win.width - 0.6, 0.28, 0.2, '#d9d9d4');
      slat.position.set(win.x, win.y + win.height / 2 - (blindH / 4) * sy, 1.0);
      slat.name = 'win-slat';
      winG.add(slat);
    }
    // roller sits fully ABOVE the opening (bottom 0.45 over the reveal plane,
    // buried top edge inside the header) — its old position straddled the
    // header top and the reveal plane 0.2 away on both faces
    const roller = boxMesh(win.width + 1.4, 1.6, 1.6, '#e3e3de');
    roller.position.set(win.x, win.y + win.height / 2 + 1.25, 0.45);
    roller.name = 'win-roller';
    winG.add(roller);
  }
  // 7) window sill — a slab that spans the full wall depth and protrudes
  // into the room, like a real cut-wall sill. Its TOP is 0.5 ABOVE the opening
  // floor (the wall segment's reveal face at y=sillY): flush there, the sill
  // top, the reveal floor and the wainscot under-band top all fought each other
  // across the whole sill area. The raised sill also buries those reveal faces
  // and replaces the old bottom frame bar. + leafy plant in a white pot.
  const sill = boxMesh(win.width + 3.2, 1.2, WT + 1.6, winFrameC);
  sill.position.set(win.x, sillY - 0.2, 0.2); // top = sillY+0.4 (0.4 over the reveal)
  sill.name = 'win-sill';
  winG.add(sill);
  const silPotX = win.x + win.width * 0.05;
  const silPot = boxMesh(3.4, 3, 3.4, '#eceff1');
  silPot.position.set(silPotX, sillY + 1.9, 0.9); // sits on the raised sill top
  silPot.name = 'win-plant';
  const silSoil = boxMesh(2.9, 0.4, 2.9, '#4e342e');
  silSoil.position.set(silPotX, sillY + 3.6, 0.9);
  silSoil.name = 'win-plant';
  winG.add(silPot, silSoil);
  for (let i = 0; i < 3; i++) {
    const leafS = 2.6 - i * 0.5;
    const leaf = boxMesh(leafS, 2.2, leafS, i % 2 ? '#66bb6a' : '#81c784');
    leaf.position.set(silPotX + (i % 2 ? -0.5 : 0.5), sillY + 4.9 + i * 1.4, 1.0 + (i % 2 ? 0.3 : -0.3));
    leaf.rotation.y = i * 0.5;
    leaf.name = 'win-plant';
    winG.add(leaf);
  }
  // 8) curtain — folded panels on a wooden rod. Rooms that set curtainSide get
  // ONE bunched panel on that side (reference look); rooms without it keep the
  // legacy symmetric pair (ep01's approved look).
  if (win.curtain) {
    const cw = 4.2;
    const sides = win.curtainSide
      ? [win.curtainSide === 'right' ? 1 : -1]
      : [-1, 1];
    const rodY = win.y + win.height / 2 + 2.8;
    const rod = boxMesh(win.width + cw * 2 + 4, 0.9, 0.9, P.woodDark);
    rod.position.set(win.x, rodY, 1.5);
    const rodFinL = boxMesh(1.2, 1.2, 1.2, P.woodDark);
    rodFinL.position.set(win.x - (win.width + cw * 2 + 4) / 2 - 0.4, rodY, 1.5);
    const rodFinR = rodFinL.clone();
    rodFinR.position.x = win.x + (win.width + cw * 2 + 4) / 2 + 0.4;
    winG.add(rod, rodFinL, rodFinR);
    // curtain hangs from the rod, slightly wider than tall enough to pool
    const curH = win.height + 6;
    for (const side of sides) {
      const panel = new THREE.Group();
      // bunched look: 4 vertical folds with alternating shades
      const folds = 4;
      for (let fi = 0; fi < folds; fi++) {
        const fold = boxMesh(cw / folds, curH, cw / folds * 0.55,
          fi % 2 ? shade(win.curtain, 0.86) : win.curtain);
        fold.position.set(-cw / 2 + (cw / folds) * (fi + 0.5), -curH / 2, 0);
        fold.castShadow = false;
        panel.add(fold);
      }
      panel.position.set(
        win.x + side * (win.width / 2 + cw / 2 + 1.0),
        rodY - 0.6,
        1.7
      );
      winG.add(panel);
    }
  }
  if (win.side === 'left') {
    winG.position.set(-W / 2, 0, 0);
    winG.rotation.y = Math.PI / 2; // local +z (into room) → world +x
  } else {
    winG.position.set(0, 0, -D / 2);
  }
  // Wall decor rule (Q2): the window assembly casts no shadows — clean walls
  winG.traverse((o) => { o.castShadow = false; });
  scene.add(winG);

  // ---- door (back wall, hinged) ----
  const door = R.door;
  const doorPivot = new THREE.Group();
  doorPivot.name = 'door';
  doorPivot.position.set(door.x - door.width / 2, 0, -D / 2 + 0.3);
  // panel lifted a hair off the floor — resting exactly on the floor plane
  // makes the threshold z-fight/shadow-flicker as the door swings
  const panel = boxMesh(door.width, door.height, 1, door.color);
  panel.position.set(door.width / 2, door.height / 2 + 0.06, 0);
  panel.name = 'door-panel';
  doorPivot.add(panel);
  const handle = boxMesh(1.2, 1.2, 1.6, '#cfd8dc');
  // 1.05 (not 0.8): the knob front must clear the panel front by ≥ 0.35
  handle.position.set(door.width - 1.2, door.height / 2, 1.05);
  handle.name = 'door-handle';
  doorPivot.add(handle);
  // Frame front 0.4 proud of the wall face and 0.4 BEHIND the panel front —
  // the old -0.12 placement left the frame front 0.22 from the panel front and
  // 0.08 from the baseboard front (both inside the flicker zone).
  // Frame lightened vs woodDark so it still reads against the light door panel
  const frame = boxMesh(door.width + 2.4, door.height + 1.4, 1.4, '#8d6e63');
  frame.position.set(door.x, (door.height + 1.4) / 2, -D / 2 - 0.3);
  frame.name = 'door-frame';
  scene.add(frame, doorPivot);
  world.doorPivot = doorPivot;

  // ---- furniture ----
  for (const item of R.furniture) {
    const g = new THREE.Group();
    g.name = item.type; // owner label for the z-fight diagnostic reports
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
        // drawer face lines: narrow strips 0.35 clear of the body front — the
        // old full-depth strips poked past the body sides (0.15 gaps)
        const drawerLine1 = boxMesh(w * 0.42 - 1.2, 0.4, 0.3, '#cfd8dc');
        drawerLine1.position.set(w * 0.26, h * 0.55, (d - 2.5) / 2 + 0.5);
        const drawerLine2 = drawerLine1.clone();
        drawerLine2.position.y = h * 0.3;
        const knob = boxMesh(1.4, 0.7, 0.5, '#78909c');
        knob.position.set(w * 0.26, h * 0.62, d / 2 - 1.0);
        const knob2 = knob.clone();
        knob2.position.y = h * 0.37;
        g.add(drawer, drawerLine1, drawerLine2, knob, knob2);
        // monitor on desk — screen faces the DOCTOR (local -z side, where he sits).
        // Large body pushed close to the desk's outer (+z, family-side) edge,
        // per the user's markup on project 2.png (2 rounds of "bigger, further out")
        const mon = boxMesh(12, 8, 1.2, '#37474f');
        mon.position.set(-3, h + 5, 5.6);
        const monScreen = boxMesh(10.4, 6.8, 0.9, '#4fc3f7');
        monScreen.position.set(-3, h + 5, 4.75); // back edge buried in the body
        const monStand = boxMesh(1.8, 2.2, 1.2, '#263238');
        monStand.position.set(-3, h + 1.1, 6.0); // 0.4 clear of body back and front
        const keyboard = boxMesh(6, 0.5, 2.2, '#263238');
        keyboard.position.set(-2.5, h + 0.35, 1.4);
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
          leg.position.set(sx * 6.4, 4.1, sz * 2.9);
          g.add(leg);
        }
        // armrests — placed outside the seated character's arms (arms span to x≈±7.2)
        for (const sx of [-1, 1]) {
          const post = boxMesh(1, 4, 1, P.woodDark);
          post.position.set(sx * 7.1, 11, 0.4);
          const rest = boxMesh(2.0, 1, 6.4, P.accent); // 0.5 past the post sides each way
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
        // 0.4 further back: the seated doctor's coat back sat 0.15 from the
        // backrest front (flicker zone) — now 0.55
        backrest.position.set(0, 13.8, -3.4);
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
          // Posts sit 0.4 proud of the shelf fronts (0.15 was still inside the
          // flicker zone — Rule 24), so the post front/shelf front pair and the
          // post top/topShelf pair all keep ≥ 0.4. Posts cast (floor shadow)
          // but never receive: a post that both casts and receives strobes at
          // every shelf/post junction (Rule 3).
          const post = boxMesh(1, bh, 1, '#8d6e63');
          post.position.set(sx * (bw / 2 - 0.5), bh / 2, sz * (bd / 2 - 0.5 + 0.4));
          post.receiveShadow = false;
          post.name = 'bookshelf-post';
          g.add(post);
        }
        // muted, darkened book palette — readable color variety without
        // screaming saturation next to the window light
        const bookColors = ['#a35d52', '#52708a', '#5f7d63', '#b3a06e', '#7a6591'];
        for (let s = 0; s < 3; s++) {
          // Shelves are 1.4 narrower than the carcass: their end faces bury
          // INSIDE the corner posts (flush there, shelf end and post outer
          // faces were exactly coplanar and fought at every shelf level).
          // Shelves cast (floor shadow) but never receive: self-shadowing at
          // the shelf/post and shelf/book junctions strobes on camera moves
          const shelf = boxMesh(bw - 1.4, 0.7, bd, wood);
          shelf.position.set(0, 2.5 + s * 7, 0);
          shelf.receiveShadow = false;
          shelf.name = 'bookshelf-shelf';
          g.add(shelf);
          // row of books on each shelf — stop early enough that the widest
          // book (≤ 1.8) still clears the front corner posts (x = ±6).
          // Books are thin packed strips: no cast, no receive (Rule 3) —
          // shadow texels swimming over the spines read as flicker.
          let bx = -bw / 2 + 1.6;
          let bi = s;
          while (bx < bw / 2 - 3.6) {
            const bwid = 1.1 + ((s * 7 + bi) % 3) * 0.35;
            const bhei = 4 + ((bi * 3) % 2);
            const book = boxMesh(bwid, bhei, 4.4, bookColors[bi % bookColors.length]);
            book.position.set(bx + bwid / 2, 2.5 + s * 7 + 0.35 + bhei / 2, 0.4);
            book.castShadow = false;
            book.receiveShadow = false;
            book.name = 'bookshelf-book';
            g.add(book);
            bx += bwid + 0.35;
            bi++;
          }
        }
        // top cap clearly proud of posts AND shelves (0.8 vs 0.4 overhangs)
        const topShelf = boxMesh(bw + 1.6, 0.8, bd + 1.6, wood);
        topShelf.position.y = bh;
        topShelf.receiveShadow = false;
        topShelf.name = 'bookshelf-top';
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
        const carm = boxMesh(2.2, 1.2, 0.9, '#81c784');
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
        // head bottom exactly touches the top text bar; ears/muzzle fronts sit
        // 0.4 proud of the head front (0.05 before — flicker pairs)
        const bear = '#a1704f';
        const head = boxMesh(4.2, 3.8, 0.8, bear);
        head.position.set(0.1, 2.85, 0.9);
        for (const ex of [-1.7, 1.7]) {
          const ear = boxMesh(1.4, 1.4, 0.7, shade(bear, 0.8));
          ear.position.set(0.1 + ex, 4.85, 1.35);
          g.add(ear);
        }
        const muzzle = boxMesh(1.8, 1.2, 0.5, '#d7a97c');
        muzzle.position.set(0.1, 2.35, 1.5);
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
        // Persian label printed ON the poster (e.g. «سلامت کودکان»)
        if (item.label) {
          const lbl = textSprite(item.label, { fontSize: 36, bg: 'rgba(0,0,0,0)', fg: '#263238' });
          lbl.position.set(0.15, -4.6, 1.0);
          lbl.scale.multiplyScalar(0.42);
          g.add(lbl);
        }
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
          // little ORS bottle — neck bottom touches the bottle top, cap front
          // 0.4 proud of the neck front (was 0.15), food patch proud of the dish
          const bottle = boxMesh(2.4, 4.6, 1.2, c.dish);
          bottle.position.set(0, 1.6, 1.1);
          const neck = boxMesh(1.2, 1.2, 1.2, c.dish);
          neck.position.set(0, 4.5, 1.1);
          const cap = boxMesh(1.5, 0.7, 1.5, '#e53935');
          cap.position.set(0, 5.3, 1.35);
          const liquidP = boxMesh(1.7, 2.4, 1.4, c.food);
          liquidP.position.set(0, 1, 1.4);
          g.add(bottle, neck, cap, liquidP);
        } else {
          const dish = boxMesh(4.6, 1.2, 3, c.dish);
          dish.position.set(0, 0.4, 1.05);
          const food = boxMesh(3.4, 2, 2.4, c.food);
          food.position.set(0, 1.9, 0.95);
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
        // (the board faces) into the room. Built like the posters: frame slab
        // behind, board 0.6 proud of it, details 0.45 proud of the board —
        // the old build had the board buried inside the frame slab and the
        // red details 0.05 off the frame front (flicker pairs).
        g.position.y = 14;
        const wframe = boxMesh(18, 15, 1, P.accent);
        wframe.position.z = -0.2;
        const wboard = boxMesh(16.6, 13.6, 0.8, '#ffffff');
        wboard.position.z = 0.5;
        g.add(wframe, wboard);
        // red heart icon
        const hw = 2.6;
        const hd = boxMesh(hw, hw, 0.5, '#e53935');
        hd.rotation.z = Math.PI / 4;
        hd.position.set(0.3, 3.2, 1.1);
        const hl1 = boxMesh(1.7, 1.7, 0.5, '#e53935');
        hl1.position.set(0.3 - 0.9, 3.2 + 0.9, 1.1);
        const hl2 = hl1.clone();
        hl2.position.x = 0.3 + 0.9;
        g.add(hd, hl1, hl2);
        // pulse line: segments in the board plane (local xy), 0.45 off the board
        const pulse = [[-5.4, -2.4], [-3.6, -2.4], [-2.6, -0.6], [-1.2, -4], [0.2, -1.4], [1.4, -2.4], [5.4, -2.4]];
        for (let i = 0; i < pulse.length - 1; i++) {
          const [ay, ax] = pulse[i];
          const [by, bx] = pulse[i + 1];
          const len = Math.hypot(by - ay, bx - ax);
          const seg = boxMesh(len, 0.5, 0.5, '#e53935');
          seg.rotation.z = Math.atan2(by - ay, bx - ax);
          seg.position.set((ax + bx) / 2, (ay + by) / 2, 1.1);
          g.add(seg);
        }
        // marker tray below the board (top 0.4 under the board bottom) + marker
        const trayW = boxMesh(12, 0.7, 1.6, '#b2dfdb');
        trayW.position.set(0, -7.55, 1.05);
        const marker = boxMesh(3, 0.6, 0.6, '#ef5350');
        marker.position.set(-1, -6.9, 1.3);
        g.add(trayW, marker);
        // wall decor: no cast shadows (reference image has clean walls)
        g.traverse((o) => { o.castShadow = false; });
        break;
      }
      case 'stetho': {
        // stethoscope hanging on the back wall
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 0.9);
        const hook = boxMesh(1.4, 1.2, 0.8, '#78909c');
        hook.position.set(0, 4.6, -0.45);
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
        // knob front 0.45 off the drawer front (0.2 before — flicker zone)
        dKnob.position.set(-w * 0.22, baseH * 0.55, baseFrontZ - 0.1 - 0.9);
        const dKnob2 = dKnob.clone();
        dKnob2.position.x = w * 0.22;
        // side safety rail — rail stands 0.4 proud of the posts (flush there,
        // post outer and rail outer faces were 0.05 apart and flickered)
        const railTop = boxMesh(w - 4, 0.8, 0.8, P.metal);
        railTop.position.set(0, h + 3.4, d / 2 - 0.2);
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
        // The border is a 4-bar ring whose top face is EXACTLY the rug's top
        // plane — coplanar but edge-to-edge with zero overlapping area (like
        // the floor tiles), so nothing fights. The old border was a full slab
        // under the rug whose top face ran 0.07 below the rug top over the
        // whole rug area — a rug-wide flicker pair.
        for (const sz of [-1, 1]) {
          const tb = boxMesh(w + 1.6, 0.5, 0.8, outer);
          tb.position.set(0, 0.25, sz * (d / 2 + 0.4));
          tb.castShadow = false;
          tb.name = 'rug-border';
          g.add(tb);
        }
        for (const sx of [-1, 1]) {
          const lr = boxMesh(0.8, 0.5, d, outer);
          lr.position.set(sx * (w / 2 + 0.4), 0.25, 0);
          lr.castShadow = false;
          lr.name = 'rug-border';
          g.add(lr);
        }
        const rug = boxMesh(w, 0.5, d, inner);
        rug.position.set(0, 0.25, 0);
        rug.castShadow = false;
        rug.name = 'rug';
        // woven pattern: inner frame slab + center diamond, each stacked 0.4
        // proud of the surface below (bottom faces touch — culled contact)
        const frame = boxMesh(w - 4, 0.4, d - 4, shade(inner, 0.85));
        frame.position.set(0, 0.7, 0);
        frame.castShadow = false;
        frame.name = 'rug-frame';
        const dia = boxMesh(4.5, 0.4, 4.5, outer);
        dia.rotation.y = Math.PI / 4;
        dia.position.set(0, 1.1, 0);
        dia.castShadow = false;
        dia.name = 'rug-diamond';
        g.add(rug, frame, dia);
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
        // minute hand back face exactly touches the hour hand front plane —
        // the 0.6 z put the two hands 0.1 apart (flicker as they rotate)
        minuteHand.position.set(0, 1.1, 0.9);
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
        // pot/rim/soil ladder: each visible front ≥ 0.4 proud of the one below
        // (the old rim was 0.3 proud of the pot and the soil top 0.15 above the
        // rim top — both flicker pairs), and the rim clears the lowest leaf
        const pot = boxMesh(3.6, 4.5, 3.6, potC);
        pot.position.set(0, 2.25, 0);
        pot.name = 'plant-pot';
        const rim = boxMesh(4.4, 0.9, 4.4, shade(potC, 0.8));
        rim.position.set(0, 4.3, 0);
        rim.name = 'plant-rim';
        const soil = boxMesh(3.0, 0.4, 3.0, '#4e342e');
        soil.position.set(0, 4.95, 0);
        soil.name = 'plant-soil';
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
      case 'drawerCabinet': {
        // teal storage cabinet with stacked white drawers (project 2.png)
        const [w, h, d] = item.size;
        const body = boxMesh(w, h, d, P.accent);
        body.position.set(0, h / 2, 0);
        g.add(body);
        const rows = item.rows || 3;
        const dh = (h - 2.4) / rows;
        for (let r = 0; r < rows; r++) {
          const front = boxMesh(w - 2, dh - 1, 0.6, '#eceff1');
          // proud of the body's front face (d/2), never flush (Rule 1)
          front.position.set(0, 1.2 + dh * r + dh / 2, d / 2 + 0.35);
          // face line + knob 0.45 proud of the drawer front (0.15/0.3 before)
          const line = boxMesh(w - 3.4, 0.35, 0.2, '#b0bec5');
          line.position.set(0, front.position.y + dh / 2 - 1.2, d / 2 + 1.0);
          const knob = boxMesh(1.6, 0.6, 0.5, '#78909c');
          knob.position.set(0, front.position.y, d / 2 + 1.0);
          g.add(front, line, knob);
        }
        // top slab + plant pot on top
        const top = boxMesh(w + 1, 0.8, d + 1, shade(P.accent, 0.85));
        top.position.y = h + 0.4;
        g.add(top);
        break;
      }
      case 'heartPoster': {
        // small framed heart/medical poster on the back wall (pos[1] = height)
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 1.0);
        const frame = boxMesh(8, 9, 0.6, '#8fa8bf');
        frame.position.set(0, 0, -0.3);
        const board = boxMesh(7, 8, 0.7, '#fdf6f6');
        board.position.set(0, 0, 0.3);
        g.add(frame, board);
        const hc = '#e53935';
        const hd = boxMesh(2.4, 2.4, 0.6, hc);
        hd.rotation.z = Math.PI / 4;
        hd.position.set(0, 1.2, 0.9);
        const hl1 = boxMesh(1.5, 1.5, 0.6, hc);
        hl1.position.set(-0.9, 2.1, 0.9);
        const hl2 = hl1.clone();
        hl2.position.x = 0.9;
        const pulse = boxMesh(4.6, 0.6, 0.5, hc);
        pulse.position.set(0, -1.8, 0.9);
        const pulseUp = boxMesh(0.6, 1.4, 0.5, hc);
        pulseUp.position.set(-0.8, -1.2, 0.9);
        const pulseDn = pulseUp.clone();
        pulseDn.position.x = 0.8;
        pulseDn.position.y = -2.4;
        g.add(hd, hl1, hl2, pulse, pulseUp, pulseDn);
        g.traverse((o) => { o.castShadow = false; });
        break;
      }
      case 'growthChart': {
        // giraffe growth-chart poster near the exam bed (back wall, pos[1]=height)
        g.position.set(item.pos[0], item.pos[1], -R.size[1] / 2 + 1.0);
        const frame = boxMesh(9, 22, 0.6, '#a1887f');
        frame.position.set(0, 0, -0.3);
        const board = boxMesh(8, 21, 0.7, '#fdf3e3');
        board.position.set(0, 0, 0.3);
        g.add(frame, board);
        // measurement ticks along the right side
        for (let i = 0; i < 7; i++) {
          const tick = boxMesh(1.6, 0.35, 0.5, '#8d6e63');
          tick.position.set(2.6, 8 - i * 2.6, 0.85);
          g.add(tick);
        }
        // giraffe: neck + head + muzzle + ear + spots — every detail front sits
        // 0.4 proud of the face it mounts on (spots/muzzle/ear used to land
        // EXACTLY coplanar with the neck/head fronts — visible shimmer)
        const gc = '#f0b429';
        const neck = boxMesh(1.8, 10, 0.7, gc);
        neck.position.set(-2, -4.5, 0.85);
        const head = boxMesh(3, 2.4, 0.8, gc);
        head.position.set(-1.4, 1.7, 0.85);
        const muzzle = boxMesh(1.4, 1.2, 0.5, '#e3993c');
        muzzle.position.set(-0.4, 1.3, 1.45);
        const ear = boxMesh(1, 1, 0.5, '#e3993c');
        ear.position.set(-2.6, 2.7, 1.45);
        g.add(neck, head, muzzle, ear);
        for (const [sx, sy] of [[-2.4, -2], [-1.7, -5], [-2.2, -8], [-1.2, -10.5]]) {
          const spot = boxMesh(0.8, 0.8, 0.3, '#b07b20');
          spot.position.set(sx, sy, 1.45);
          g.add(spot);
        }
        g.traverse((o) => { o.castShadow = false; });
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
  // Every prop family is optional: an episode's pack may define only the props
  // it uses (e.g. fever-props defines only `medicine`).
  const PR = propsDef;

  // floating tray with foods (hidden until L03)
  const tray = new THREE.Group();
  tray.name = 'tray';
  const foodGroups = [];
  if (PR.tray && PR.foods) {
  const trayBox = boxMesh(PR.tray.size[0], PR.tray.size[1], PR.tray.size[2], PR.tray.color);
  tray.add(trayBox);
  // tray rim 0.4 proud of the tray sides (0.3 before — borderline flicker)
  const trayRim = boxMesh(PR.tray.size[0] + 0.8, PR.tray.size[1] * 0.7, PR.tray.size[2] + 0.8, shade(PR.tray.color, 0.75));
  trayRim.position.y = PR.tray.size[1] * 0.6;
  tray.add(trayRim);
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
        // rim 0.5 proud of the bowl sides (0.2 before — flicker pair)
        const rim = boxMesh(9.0, 0.7, 9.0, shade(c.bowl, 0.9));
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
        // label stripes 0.4 proud of the cup sides (0.15 before — flicker pair)
        const stripe = boxMesh(6.2, 1.8, 6.2, c.stripe);
        stripe.position.y = 4.8;
        const stripe2 = boxMesh(6.2, 0.7, 6.2, c.stripe);
        stripe2.position.y = 1.4;
        const top = boxMesh(5.0, 0.7, 5.0, '#e8eaf0');
        top.position.y = 6.1; // fully inside the cup
        const lid = boxMesh(6.0, 0.9, 6.0, c.lid || c.stripe);
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
        // plate rim 0.5 proud of the plate sides (0.2 before — flicker pair)
        const rim2 = boxMesh(11.0, 0.5, 11.0, shade(c.plate, 0.88));
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
        yog.position.set(2, 4.5, 2);
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
        const surface = boxMesh(4.9, 0.5, 4.9, shade(c.liquid, 1.25)); // 0.35 lip past the liquid
        surface.position.y = 4.5;
        const straw = boxMesh(0.7, 5.5, 0.7, c.straw || '#ef5350');
        straw.position.set(1.2, 7, 1.2);
        straw.rotation.z = 0.35;
        const sachet = boxMesh(3, 5.5, 0.9, c.sachet);
        sachet.position.set(-4.2, 2.75, 1);
        sachet.rotation.z = -0.25;
        // wider than the sachet (wrapped label band): its end faces stay 0.45
        // clear of the sachet end faces, front 0.6 proud of the sachet front
        const stripe = boxMesh(3.9, 1.2, 1.0, '#ffffff');
        stripe.position.set(-4.2, 3.05, 1.55);
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
  }
  const trayXZ = M.tray || { x: -4, z: 2 };
  const waterXZ = M.water || { x: -8, z: -2 };
  const warnXZ = M.warn || { x: -2, z: 2 };
  const heartXZ = M.heart || { x: 12, z: 14 };

  tray.position.set(trayXZ.x, -14, trayXZ.z);
  tray.visible = false;
  scene.add(tray);

  const waterGroup = new THREE.Group();
  waterGroup.name = 'water';
  if (PR.water) {
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
  }

  const warnGroup = new THREE.Group();
  warnGroup.name = 'warning';
  if (PR.warning) {
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
  }

  const heart = new THREE.Group();
  heart.name = 'heart';
  if (PR.heart) {
  const hc = PR.heart.color;
  const diamond = boxMesh(6, 6, 2.2, hc);
  diamond.rotation.z = Math.PI / 4;
  const bumpL = boxMesh(4.2, 4.2, 2.2, hc);
  bumpL.position.set(-2.1, 2.5, 0);
  const bumpR = bumpL.clone();
  bumpR.position.x = 2.1;
  // highlight facet + darker underside for volume (facet 0.4 proud of the
  // diamond front — 0.2 before, flicker pair on the floating heart)
  const hl = boxMesh(1.4, 1.4, 0.4, shade(hc, 1.35));
  hl.position.set(-2.2, 3.2, 1.3);
  hl.rotation.z = Math.PI / 4;
  const under = boxMesh(4, 3.2, 1.4, shade(hc, 0.75)); // 0.4 behind the diamond front
  under.position.set(0, -1.2, 0);
  under.rotation.z = Math.PI / 4;
  heart.add(diamond, bumpL, bumpR, hl, under);
  heart.position.set(heartXZ.x, 26, heartXZ.z);
  heart.visible = false;
  scene.add(heart);
  }

  // ---- medicine insert props (fever episode): amber bottle + dropper + water cup,
  // sitting on the desk at the `medicine` mark. Hidden until a medicineInsert /
  // insert-medicine line. MEDICAL SAFETY: no dosage amount is ever rendered. ----
  let medicineGroup = null;
  if (PR.medicine) {
    const mc = PR.medicine;
    medicineGroup = new THREE.Group();
    medicineGroup.name = 'medicine';
    const bBody = boxMesh(5, 8, 5, mc.bottle.body);
    bBody.position.y = 4;
    const bCap = boxMesh(3, 1.6, 3, mc.bottle.cap);
    bCap.position.y = 8.8;
    // label + band are progressively prouder of the body (0.45 / 0.85) —
    // the old 5.2/5.35 depths left 0.1/0.075 gaps (flicker on the label)
    const bLabel = boxMesh(5.9, 4, 5.9, mc.bottle.label);
    bLabel.position.y = 4;
    const bBand = boxMesh(6.7, 1.1, 6.7, mc.bottle.labelBand);
    bBand.position.y = 5.6;
    bBody.name = bCap.name = bLabel.name = bBand.name = 'medicine-bottle';
    medicineGroup.add(bBody, bCap, bLabel, bBand);
    // dropper leaning beside the bottle
    const dBulb = boxMesh(1.8, 1.8, 1.8, mc.dropper.bulb);
    dBulb.position.set(-5, 6.6, 0.6);
    const dTube = boxMesh(1.1, 4.4, 0.9, mc.dropper.tube);
    dTube.position.set(-5, 4, 0.6);
    dTube.rotation.z = 0.12;
    const dTip = boxMesh(0.7, 1.8, 0.5, mc.dropper.tip);
    dTip.position.set(-4.25, 1.4, 0.6);
    medicineGroup.add(dBulb, dTube, dTip);
    // water cup
    const cupG = new THREE.MeshLambertMaterial({ color: mc.cup.glass, transparent: true, opacity: 0.55 });
    const cupB = new THREE.Mesh(new THREE.BoxGeometry(4, 5.5, 4), cupG);
    cupB.position.set(7.4, 2.75, 0.6);
    cupB.castShadow = true;
    const cupL = boxMesh(3.3, 3, 3.3, mc.cup.liquid);
    cupL.position.set(7.4, 1.7, 0.6);
    medicineGroup.add(cupB, cupL);
    // pill + suppository on the desk surface
    const pill = boxMesh(2.6, 1.2, 1.6, mc.pill);
    pill.position.set(3, 0.6, 3.2);
    pill.rotation.y = 0.5;
    const supp = boxMesh(1.8, 3, 1.8, mc.suppository);
    supp.position.set(-8.6, 1.5, 2.6);
    supp.rotation.z = -0.25;
    medicineGroup.add(pill, supp);

    const mxz = M.medicine || { x: -26, z: -6 };
    // y=10 → the group's floor sits on a desk top of height 10 (desk size [*,10,*])
    medicineGroup.position.set(mxz.x, 10, mxz.z);
    medicineGroup.scale.setScalar(0.001);
    scene.add(medicineGroup);
  }

  world.props = { tray, foodGroups, waterGroup, warnGroup, heart, medicineGroup };

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
