import * as THREE from 'three';

export function boxMesh(w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Darken/lighten a hex color by factor f (<1 darker, >1 lighter) — used for
// automatic shading tones when a JSON does not specify an explicit shade.
export function shade(hex, f) {
  if (!hex || typeof hex !== 'string') return hex;
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Box whose origin sits at its top-center — used for limbs pivoting at shoulder/hip.
export function limbMesh(w, h, d, color) {
  const m = boxMesh(w, h, d, color);
  m.geometry.translate(0, -h / 2, 0);
  return m;
}

// Canvas-texture label (Persian/RTL aware) used for floating prop captions.
export function textSprite(text, { fontSize = 46, pad = 18, bg = 'rgba(255,255,255,0.94)', fg = '#17323a' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `700 ${fontSize}px Vazirmatn, Tahoma, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontSize + pad * 2;
  c.width = w;
  c.height = h;
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.font = font;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(text, w / 2, h / 2 + 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  const k = 0.05;
  sp.scale.set(w * k, h * k, 1);
  return sp;
}

/**
 * Builds a Minecraft-proportioned character from its JSON definition.
 * Total standing height = 32 voxel units (1 unit = 1 voxel), scale applied on the group.
 * Pivots: legs/arms rotate at hip/shoulder (top of limb), head at neck.
 */
export function buildCharacter(def) {
  const P = def.parts, C = def.colors, F = def.features || {};
  // Shading tones: explicit color wins, otherwise derive from the base color.
  const hairDark = C.hairShade || shade(C.hair, 0.72);
  const skinDark = C.skinShade || shade(C.skin, 0.85);
  const pantsDark = C.pantsShade || shade(C.pants, 0.85);
  const group = new THREE.Group();
  group.scale.setScalar(def.scale || 1);

  // legs (hip at y=12)
  const legL = limbMesh(P.leg[0], P.leg[1], P.leg[2], C.pants);
  legL.position.set(-2, 12, 0);
  const legR = limbMesh(P.leg[0], P.leg[1], P.leg[2], C.pants);
  legR.position.set(2, 12, 0);
  for (const leg of [legL, legR]) {
    // side seam stripe for depth (nudged 0.05 out of the leg face so the two
    // surfaces never sit exactly coplanar and z-fight)
    const seam = boxMesh(0.4, P.leg[1] - 3, 0.4, pantsDark);
    seam.position.set(P.leg[0] / 2 - 0.15, -P.leg[1] / 2 + 0.4, P.leg[2] / 2 - 0.35);
    leg.add(seam);
    if (F.socks) {
      // 0.2 wider than the shoe below it — equal widths would put both side
      // faces in the same plane and make the ankle flicker
      const sock = boxMesh(P.leg[0] + 0.5, 2.6, P.leg[2] + 0.5, C.sock || '#f5f5f5');
      sock.position.set(0, -P.leg[1] + 2.2, 0);
      leg.add(sock);
    }
    const shoeH = 2.2, shoeD = 5.2;
    // z = 0.7 keeps the shoe's back face 0.1 in front of the leg's back face —
    // at z = 0.6 the two are exactly coplanar and the ankle z-fights
    const shoe = boxMesh(4.3, shoeH, shoeD, C.shoes);
    shoe.position.set(0, -P.leg[1] + shoeH / 2 + 0.4, 0.7);
    leg.add(shoe);
    const sole = boxMesh(4.5, 0.7, shoeD + 0.4, F.sneakers ? (C.sole || '#eceff1') : shade(C.shoes, 0.55));
    // y puts the sole 0.05 below the leg's bottom face (coplanar there, and
    // coplanar with the floor when standing) so the leg/floor never z-fights
    // with the sole bottom
    sole.position.set(0, -P.leg[1] + 0.3, 0.7);
    leg.add(sole);
    if (F.sneakers) { // lace strip on top of the shoe
      const lace = boxMesh(1.2, 0.4, 3, '#ffffff');
      lace.position.set(0, -P.leg[1] + shoeH + 0.6, 1);
      leg.add(lace);
    }
  }

  // torso (y 12..24)
  const torsoColor = F.coat || F.longCoat ? C.coat : C.shirt;
  const torso = boxMesh(P.torso[0], P.torso[1], P.torso[2], torsoColor);
  torso.position.set(0, 18, 0);
  group.add(torso);
  // hem shading at the bottom of the torso for volume
  const hem = boxMesh(P.torso[0] + 0.15, 1.2, P.torso[2] + 0.15, shade(torsoColor, 0.82));
  hem.position.set(0, 12.6, 0);
  group.add(hem);

  if (F.belt && !F.longCoat) {
    const belt = boxMesh(P.torso[0] + 0.25, 1.3, P.torso[2] + 0.25, C.belt || '#3e2723');
    belt.position.set(0, 12.9, 0);
    const buckle = boxMesh(1.4, 1.4, 0.5, C.buckle || '#ffd54f');
    buckle.position.set(0, 12.9, P.torso[2] / 2 + 0.2);
    group.add(belt, buckle);
  }

  // front button column (coat or shirt)
  const nButtons = F.coatButtons ?? (F.coat ? 3 : F.buttons || 0);
  for (let i = 0; i < nButtons; i++) {
    const btn = boxMesh(0.7, 0.7, 0.35, F.coat ? shade(torsoColor, 0.6) : (C.buttons || shade(torsoColor, 0.6)));
    btn.position.set(F.coat ? 0.9 : 0, 21.4 - i * 2.6, P.torso[2] / 2 + 0.15);
    group.add(btn);
  }

  if (F.pocket) { // chest pocket with a pen
    const pocket = boxMesh(2.2, 2, 0.35, shade(torsoColor, 0.75));
    pocket.position.set(-2.4, 20.6, P.torso[2] / 2 + 0.15);
    const pen = boxMesh(0.35, 1.8, 0.35, C.pen || '#1565c0');
    pen.position.set(-2.4, 22, P.torso[2] / 2 + 0.2);
    group.add(pocket, pen);
  }
  if (F.badge) { // staff ID card on a lanyard
    // strap ends below the collar top (23.9) instead of touching the head's
    // bottom plane (24), sits fully proud of the collar front, and skips
    // shadows — a thin rotated strap flickers when it casts/receives them
    const lanyard = boxMesh(0.5, 4.4, 0.3, C.lanyard || '#1565c0');
    // z = +0.5 keeps the strap's back face (2.35) 0.2 clear of the coat
    // collar's front face (2.15) — flush there, the strap z-fights at the neck
    lanyard.position.set(1.6, 21.2, P.torso[2] / 2 + 0.5);
    lanyard.rotation.z = 0.18;
    lanyard.castShadow = false;
    lanyard.receiveShadow = false;
    const card = boxMesh(2.4, 3.2, 0.3, '#fafafa');
    card.position.set(2.1, 18.4, P.torso[2] / 2 + 0.32);
    card.rotation.z = 0.18;
    const photo = boxMesh(1.1, 1.3, 0.3, C.badge || '#42a5f5');
    photo.position.set(1.7, 18.7, P.torso[2] / 2 + 0.42);
    photo.rotation.z = 0.18;
    group.add(lanyard, card, photo);
  }

  if (F.coat) {
    // white coat collar; teal scrub V shows at the neck (matches the reference)
    const collar = boxMesh(8.3, 3, 4.3, torsoColor);
    collar.position.set(0, 22.4, 0);
    group.add(collar);
    const scrubV = boxMesh(2.2, 2.6, 0.4, C.shirt);
    scrubV.position.set(0, 22.2, P.torso[2] / 2 + 0.05);
    group.add(scrubV);
    const collarTrim = boxMesh(8.5, 0.7, 4.5, shade(torsoColor, 0.85));
    collarTrim.position.set(0, 21.1, 0);
    group.add(collarTrim);
    // white coat lapels framing the teal shirt strip
    const lapelL = boxMesh(0.9, 9, 0.5, torsoColor);
    lapelL.position.set(-1.9, 18, 2.2);
    const lapelR = lapelL.clone();
    lapelR.position.x = 1.9;
    group.add(lapelL, lapelR);
    // open coat front revealing the shirt underneath
    const front = boxMesh(2.6, 8, 0.4, shade(C.shirt, 0.9));
    front.position.set(0, 17.5, 2.15);
    group.add(front);
  }
  if (F.collar && !F.coat) { // t-shirt / dress collar
    const col = boxMesh(8.2, 1.6, 4.25, shade(torsoColor, 0.75));
    col.position.set(0, 22.9, 0);
    group.add(col);
  }
  if (F.longCoat) {
    const skirt = boxMesh(8.6, 10, 4.9, C.coat);
    skirt.position.set(0, 9, 0);
    group.add(skirt);
    const skirtHem = boxMesh(8.8, 1.2, 5.1, shade(C.coat, 0.8));
    skirtHem.position.set(0, 4.6, 0);
    group.add(skirtHem);
    // center pleat line
    const pleat = boxMesh(0.5, 9.4, 0.3, shade(C.coat, 0.75));
    pleat.position.set(0, 9, 2.5);
    group.add(pleat);
  }

  // arms (shoulder at y=22)
  const armColor = F.coat || F.longCoat ? C.coat : C.shirt;
  const armL = limbMesh(P.arm[0], P.arm[1], P.arm[2], armColor);
  armL.position.set(-6, 22, 0);
  const armR = limbMesh(P.arm[0], P.arm[1], P.arm[2], armColor);
  armR.position.set(6, 22, 0);
  const wrist = F.watch || null;
  for (const [i, arm] of [armL, armR].entries()) {
    const hand = boxMesh(4.1, 2, 4.1, C.skin);
    // y puts the hand 0.05 below the arm's bottom face (y=-12) — coplanar
    // there, the hand and the arm's flat end z-fight
    hand.position.set(0, -11.05, 0);
    arm.add(hand);
    // sleeve cuff
    const cuff = boxMesh(P.arm[0] + 0.2, 1.2, P.arm[2] + 0.2, shade(armColor, 0.78));
    cuff.position.set(0, -9.6, 0);
    arm.add(cuff);
    if ((i === 0 && wrist === 'left') || (i === 1 && wrist === 'right')) {
      const band = boxMesh(P.arm[0] + 0.35, 1.1, P.arm[2] + 0.35, C.watch || '#263238');
      band.position.set(0, -8.4, 0);
      const dial = boxMesh(1.6, 0.35, 1.6, '#eceff1');
      dial.position.set(0, -8.4, P.arm[2] / 2 + 0.25);
      arm.add(band, dial);
    }
  }

  // head (neck pivot at y=24)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 24, 0);
  const head = boxMesh(P.head[0], P.head[1], P.head[2], C.skin);
  head.position.set(0, 4, 0);
  headGroup.add(head);
  // neck
  const neck = boxMesh(3.4, 2.2, 3.4, skinDark);
  neck.position.set(0, -0.9, 0);
  headGroup.add(neck);
  if (F.ears !== false) {
    const earL = boxMesh(0.8, 2, 2, skinDark);
    earL.position.set(-P.head[0] / 2 - 0.35, 4, 0);
    const earR = earL.clone();
    earR.position.x = P.head[0] / 2 + 0.35;
    headGroup.add(earL, earR);
  }

  // face (front face is +z)
  const eyeL = boxMesh(1.5, 2.1, 0.35, C.eye);
  eyeL.position.set(-1.9, 5, 4.08);
  const eyeR = eyeL.clone();
  eyeR.position.x = 1.9;
  headGroup.add(eyeL, eyeR);
  // eye highlights
  const hlL = boxMesh(0.45, 0.45, 0.15, '#ffffff');
  hlL.position.set(-2.2, 5.5, 4.25);
  const hlR = hlL.clone();
  hlR.position.x = 1.6;
  headGroup.add(hlL, hlR);
  if (F.eyebrows !== false) {
    const browL = boxMesh(1.8, 0.55, 0.3, C.brow || hairDark);
    browL.position.set(-1.9, 6.9, 4.12);
    const browR = browL.clone();
    browR.position.x = 1.9;
    headGroup.add(browL, browR);
  }
  if (F.nose !== false) {
    const nose = boxMesh(1.2, 1.2, 0.9, skinDark);
    nose.position.set(0, 3.7, 4.35);
    headGroup.add(nose);
  }
  const mouth = boxMesh(2.6, 1.1, 0.35, C.mouth);
  mouth.position.set(0, 1.9, 4.08);
  headGroup.add(mouth);
  const lowerLip = boxMesh(1.8, 0.4, 0.3, shade(C.mouth, 0.7));
  lowerLip.position.set(0, 1.15, 4.12);
  headGroup.add(lowerLip);

  if (F.beard) {
    const beardC = C.beard || hairDark;
    const chin = boxMesh(5.2, 2.4, 0.4, beardC);
    chin.position.set(0, 1.4, 4.16);
    headGroup.add(chin);
    // full beard adds jaw sides; 'goatee' keeps chin + mustache only
    if (F.beardStyle !== 'goatee') {
      const jawL = boxMesh(1.2, 3.6, 0.4, beardC);
      jawL.position.set(-2.4, 2.6, 4.16);
      const jawR = jawL.clone();
      jawR.position.x = 2.4;
      headGroup.add(jawL, jawR);
    }
  }
  if (F.mustache) {
    const mo = boxMesh(2.4, 0.6, 0.35, C.beard || hairDark);
    mo.position.set(0, 2.85, 4.16);
    headGroup.add(mo);
  }

  if (F.cheeks) {
    const chL = boxMesh(1.3, 1.3, 0.3, C.cheek || '#f19b93');
    chL.position.set(-3.1, 3.1, 4.08);
    const chR = chL.clone();
    chR.position.x = 3.1;
    headGroup.add(chL, chR);
  }
  if (F.glasses) {
    const bar = boxMesh(7.2, 1.1, 0.4, '#37474f');
    bar.position.set(0, 6.6, 4.15);
    const bridge = boxMesh(0.9, 0.6, 0.4, '#37474f');
    bridge.position.set(0, 5.6, 4.15);
    const lensL = boxMesh(2.6, 2.2, 0.25, '#b3e5fc');
    lensL.material.transparent = true;
    lensL.material.opacity = 0.35;
    lensL.position.set(-2, 5.5, 4.05);
    const lensR = lensL.clone();
    lensR.position.x = 2;
    const templeL = boxMesh(1.1, 0.5, 0.4, '#37474f');
    templeL.position.set(-3.8, 6.4, 4.15);
    const templeR = templeL.clone();
    templeR.position.x = 3.8;
    headGroup.add(bar, bridge, lensL, lensR, templeL, templeR);
  }
  // hair styles — every style is a small composition of slabs with a shaded under-layer
  const hs = F.hairStyle || 'short';
  if (!F.hijab && hs !== 'bald') {
    const top = boxMesh(P.head[0] + 0.5, 2.2, P.head[2] + 0.5, C.hair);
    top.position.set(0, 8.7, 0);
    const under = boxMesh(P.head[0] + 0.6, 0.9, P.head[2] + 0.6, hairDark);
    under.position.set(0, 7.5, 0);
    headGroup.add(top, under);
    const back = boxMesh(P.head[0] + 0.5, 4, 1.6, C.hair);
    back.position.set(0, 6.6, -P.head[2] / 2 + 0.7);
    headGroup.add(back);
    if (hs === 'side-part') {
      const part = boxMesh(3.4, 1, 0.6, hairDark);
      part.position.set(1.8, 8.4, P.head[2] / 2 + 0.1);
      const fringe = boxMesh(4.4, 1.4, 0.8, C.hair);
      fringe.position.set(-1.4, 8, P.head[2] / 2 + 0.3);
      headGroup.add(part, fringe);
    }
    if (hs === 'bob') {
      const sideL = boxMesh(1.4, 5.4, P.head[2] + 0.4, C.hair);
      sideL.position.set(-P.head[0] / 2 - 0.15, 5.4, 0);
      const sideR = sideL.clone();
      sideR.position.x = P.head[0] / 2 + 0.15;
      const tipL = boxMesh(1.5, 1.2, 2.2, C.hair);
      tipL.position.set(-P.head[0] / 2 - 0.2, 2.6, P.head[2] / 2 - 1.4);
      const tipR = tipL.clone();
      tipR.position.x = P.head[0] / 2 + 0.2;
      headGroup.add(sideL, sideR, tipL, tipR);
    }
    if (hs === 'ponytail') {
      const tail = boxMesh(2.2, 6.5, 2.2, C.hair);
      tail.position.set(0, 5.5, -P.head[2] / 2 - 1.2);
      const tie = boxMesh(2.6, 1, 2.6, C.hairTie || '#c62828');
      tie.position.set(0, 8.2, -P.head[2] / 2 - 0.9);
      headGroup.add(tail, tie);
      // front bangs
      const bangs = boxMesh(P.head[0] + 0.3, 1.4, 0.9, C.hair);
      bangs.position.set(0, 8, P.head[2] / 2 + 0.2);
      headGroup.add(bangs);
    }
  }
  if (F.hijab) {
    const S = C.scarf;
    const SD = shade(S, 0.78);
    const topSlab = boxMesh(9.6, 2.8, 9.6, S);
    topSlab.position.set(0, 8.9, 0);
    const sideL = boxMesh(1.3, 8.6, 9.6, S);
    sideL.position.set(-4.15, 4.3, 0);
    const sideR = sideL.clone();
    sideR.position.x = 4.15;
    const backSlab = boxMesh(9.6, 8.6, 1.3, S);
    backSlab.position.set(0, 4.3, -4.15);
    const tail = boxMesh(4.4, 7.5, 1.1, S);
    tail.position.set(-1, 0.6, -4.8);
    headGroup.add(topSlab, sideL, sideR, backSlab, tail);
    // inner fold framing the face
    const fold = boxMesh(9.0, 1.1, 1.1, SD);
    fold.position.set(0, 8.1, 4.35);
    headGroup.add(fold);
    // drape shading down the front sides (front face pushed past the scarf
    // panels' plane at z=4.8 so the two never coincide)
    const drapeL = boxMesh(1.5, 5.5, 1.2, SD);
    drapeL.position.set(-4.1, 5.2, 4.25);
    const drapeR = drapeL.clone();
    drapeR.position.x = 4.1;
    headGroup.add(drapeL, drapeR);
    if (F.hijabPin) {
      // z puts the pin's front face 0.25 past the fold's front face at z=4.9 —
      // flush there, the pin and the fold z-fight at the corner of the face
      const pin = boxMesh(1, 1, 0.4, C.hijabPin || '#ffd54f');
      pin.position.set(-3.4, 7.6, 4.95);
      headGroup.add(pin);
    }
  }
  if (F.stethoscope) {
    const tube = '#78909c';
    const tl = boxMesh(0.9, 6.5, 0.9, tube);
    tl.position.set(-2.6, 20, 2.3);
    const tr = tl.clone();
    tr.position.x = 2.6;
    const bottom = boxMesh(4.4, 0.9, 0.9, tube);
    bottom.position.set(0, 17, 2.3);
    const earTipL = boxMesh(1, 1.6, 1, '#37474f');
    earTipL.position.set(-2.6, 23.4, 2.3);
    const earTipR = earTipL.clone();
    earTipR.position.x = 2.6;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.7, 12),
      new THREE.MeshLambertMaterial({ color: '#b0bec5' })
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(-2.6, 14.5, 2.6);
    disc.castShadow = true;
    group.add(tl, tr, bottom, earTipL, earTipR, disc);
  }

  group.add(legL, legR, armL, armR, headGroup);

  return {
    def,
    group,
    parts: { legL, legR, armL, armR, headGroup, eyeL, eyeR, mouth },
    scale: def.scale || 1,
    phase: def.phase || 0,
    sitY: 9 - 12 * (def.scale || 1), // hips land on the seat top at y=9 (guest chairs + office chair), regardless of scale
  };
}
