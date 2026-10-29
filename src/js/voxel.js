import * as THREE from 'three';

export function boxMesh(w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
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
  const group = new THREE.Group();
  group.scale.setScalar(def.scale || 1);

  // legs (hip at y=12)
  const legL = limbMesh(P.leg[0], P.leg[1], P.leg[2], C.pants);
  legL.position.set(-2, 12, 0);
  const legR = limbMesh(P.leg[0], P.leg[1], P.leg[2], C.pants);
  legR.position.set(2, 12, 0);
  for (const leg of [legL, legR]) {
    const shoe = boxMesh(4.3, 2.2, 5.2, C.shoes);
    shoe.position.set(0, -11.2, 0.6);
    leg.add(shoe);
  }

  // torso (y 12..24)
  const torsoColor = F.coat || F.longCoat ? C.coat : C.shirt;
  const torso = boxMesh(P.torso[0], P.torso[1], P.torso[2], torsoColor);
  torso.position.set(0, 18, 0);
  group.add(torso);

  if (F.coat) {
    const collar = boxMesh(8.3, 3, 4.3, C.shirt);
    collar.position.set(0, 22.4, 0);
    group.add(collar);
    const lapelL = boxMesh(0.9, 9, 0.5, C.shirt);
    lapelL.position.set(-1.6, 18, 2.15);
    const lapelR = lapelL.clone();
    lapelR.position.x = 1.6;
    group.add(lapelL, lapelR);
  }
  if (F.longCoat) {
    const skirt = boxMesh(8.6, 10, 4.9, C.coat);
    skirt.position.set(0, 9, 0);
    group.add(skirt);
  }

  // arms (shoulder at y=22)
  const armL = limbMesh(P.arm[0], P.arm[1], P.arm[2], F.coat ? C.coat : (F.longCoat ? C.coat : C.shirt));
  armL.position.set(-6, 22, 0);
  const armR = limbMesh(P.arm[0], P.arm[1], P.arm[2], F.coat ? C.coat : (F.longCoat ? C.coat : C.shirt));
  armR.position.set(6, 22, 0);
  for (const arm of [armL, armR]) {
    const hand = boxMesh(4.1, 2, 4.1, C.skin);
    hand.position.set(0, -11, 0);
    arm.add(hand);
  }

  // head (neck pivot at y=24)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 24, 0);
  const head = boxMesh(P.head[0], P.head[1], P.head[2], C.skin);
  head.position.set(0, 4, 0);
  headGroup.add(head);

  // face (front face is +z)
  const eyeL = boxMesh(1.5, 2.1, 0.35, C.eye);
  eyeL.position.set(-1.9, 5, 4.08);
  const eyeR = eyeL.clone();
  eyeR.position.x = 1.9;
  headGroup.add(eyeL, eyeR);
  const mouth = boxMesh(2.6, 1.1, 0.35, C.mouth);
  mouth.position.set(0, 1.9, 4.08);
  headGroup.add(mouth);

  if (F.cheeks) {
    const chL = boxMesh(1.3, 1.3, 0.3, '#f19b93');
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
    headGroup.add(bar, bridge);
  }
  if (F.hairStyle === 'short') {
    const top = boxMesh(8.5, 2.2, 8.5, C.hair);
    top.position.set(0, 8.7, 0);
    const back = boxMesh(8.5, 4, 1.6, C.hair);
    back.position.set(0, 6.6, -3.5);
    headGroup.add(top, back);
  }
  if (F.hijab) {
    const S = C.scarf;
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
  }
  if (F.stethoscope) {
    const tube = '#78909c';
    const tl = boxMesh(0.9, 6.5, 0.9, tube);
    tl.position.set(-2.6, 20, 2.3);
    const tr = tl.clone();
    tr.position.x = 2.6;
    const bottom = boxMesh(4.4, 0.9, 0.9, tube);
    bottom.position.set(0, 17, 2.3);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.7, 12),
      new THREE.MeshLambertMaterial({ color: '#b0bec5' })
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(-2.6, 14.5, 2.6);
    disc.castShadow = true;
    group.add(tl, tr, bottom, disc);
  }

  group.add(legL, legR, armL, armR, headGroup);

  return {
    def,
    group,
    parts: { legL, legR, armL, armR, headGroup, eyeL, eyeR, mouth },
    scale: def.scale || 1,
    phase: def.phase || 0,
    sitY: -(12 - 8) * (def.scale || 1), // hips at chair seat height 8
  };
}
