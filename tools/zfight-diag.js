// Diagnostic: the z-fighting gate. Builds an episode scene and reports every
// pair of VISIBLE, same-facing box faces whose planes are coplanar or closer
// than the safe separation (BUGFIX_RULES Rule 24 — the flicker zone is
// 0 < gap < 0.35 world units at this scene scale; exact coplanarity is worst).
//
// Face-level, not box-level: two boxes may interpenetrate harmlessly (buried
// faces never fight) — what fights is two faces that (a) face the same way,
// (b) overlap in footprint, (c) are both visible from some shot camera, and
// (d) sit < 0.35 apart in depth.
//
// Usage: node tools/zfight-diag.js [--ep <episode-id>] [--gap 0.35] [--all]
//   --all   also list benign pairs (opposite-facing contact, buried, same-color
//           coplanar, transparent) for audit instead of only summarizing them.
const path = require('path');
const { startServer } = require('./serve');

const ROOT = path.resolve(path.join(__dirname, '..'));
const args = process.argv.slice(2);
const EP = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : 'ep02-child-fever';
const GAP = args.includes('--gap') ? +args[args.indexOf('--gap') + 1] : 0.35;
const SHOW_ALL = args.includes('--all');
const PORT = 8096;

(async () => {
  const puppeteer = require('puppeteer');
  const server = startServer(PORT, ROOT);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERR:', e.message));
  await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/src/index.html?ep=${EP}&render=1`, { waitUntil: 'networkidle0', timeout: 50000 });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });

  const report = await page.evaluate(({ GAP, SHOW_ALL }) => {
    const scene = window.__scene;

    // ---- unhide rest-pose props FIRST, then refresh world matrices ----
    // (un-hiding after updateMatrixWorld leaves stale 0.001-scale matrices and
    // silently skips every prop from the audit)
    scene.traverse((o) => {
      if (!o.visible) o.visible = true;
      if (o.scale && o.scale.x < 0.01) o.scale.setScalar(1);
    });
    scene.updateMatrixWorld(true);

    // ---- camera positions to test visibility against (room shots + defaults) ----
    const cams = [[8, 36, 145], [54, 46, 128], [62, 36, 148]];
    const roomDef = window.__roomDef;
    if (roomDef && roomDef.shots) for (const k in roomDef.shots) cams.push(roomDef.shots[k].pos);

    // ---- polygon clip (Sutherland–Hodgman): subject A clipped by convex B ----
    // general 4x4 inverse (column-major, three.js layout) — no THREE global here
    const inv4 = (e) => {
      const a = e, out = new Array(16);
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      det = 1 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    };

    // ---- extract 6 world-space faces per BoxGeometry mesh ----
    // BoxGeometry lays out 24 verts: 4 per face in order +x,-x,+y,-y,+z,-z.
    const faces = [];
    const owner = (o) => {
      let n = o;
      while (n) { if (n.name) return n.name; n = n.parent; }
      return 'unnamed';
    };
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
      if (o.isSprite) return;
      const p = o.geometry.attributes.position;
      if (p.count !== 24) return; // not a plain box (limbMesh etc. still qualify)
      const m = o.matrixWorld.elements;
      const v = new Array(24);
      for (let k = 0; k < 24; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        v[k] = [m[0] * x + m[4] * y + m[8] * z + m[12],
                m[1] * x + m[5] * y + m[9] * z + m[13],
                m[2] * x + m[6] * y + m[10] * z + m[14]];
      }
      const hex = o.material && o.material.color ? '#' + o.material.color.getHexString() : '?';
      const transparent = !!(o.material && o.material.transparent);
      const name = owner(o);
      // world AABB (for the under-floor rest-pose filter and reports)
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let k = 0; k < 24; k++) for (let a = 0; a < 3; a++) {
        if (v[k][a] < mn[a]) mn[a] = v[k][a];
        if (v[k][a] > mx[a]) mx[a] = v[k][a];
      }
      // burial data: inverse world matrix + local half extents of this box, so a
      // face fully inside the OTHER box can be recognized as hidden (buried)
      const prm = o.geometry.parameters;
      const inv = inv4(m);
      const half = [prm.width / 2, prm.height / 2, prm.depth / 2];
      // face normals come from the geometry's own normal attribute (authoritative
      // for BoxGeometry's six faces), rotated into world space and normalized
      const nrm = o.geometry.attributes.normal;
      const rot = [
        [m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]],
      ];
      const boxIdx = faces.length ? faces[faces.length - 1].box + 1 : 0;
      // BoxGeometry stores each face's 4 verts in strip order (0,0)(1,0)(0,1)(1,1)
      // → the perimeter quad is 0,1,3,2 (else the "quad" is a self-crossing bowtie)
      const sub = [[0, 1, 3, 2], [4, 5, 7, 6], [8, 9, 11, 10], [12, 13, 15, 14], [16, 17, 19, 18], [20, 21, 23, 22]];
      for (let fi = 0; fi < 6; fi++) {
        const quad = sub[fi];
        const nl = [nrm.getX(fi * 4), nrm.getY(fi * 4), nrm.getZ(fi * 4)];
        let n = [
          rot[0][0] * nl[0] + rot[0][1] * nl[1] + rot[0][2] * nl[2],
          rot[1][0] * nl[0] + rot[1][1] * nl[1] + rot[1][2] * nl[2],
          rot[2][0] * nl[0] + rot[2][1] * nl[1] + rot[2][2] * nl[2],
        ];
        const len = Math.hypot(...n) || 1;
        n = n.map((x) => x / len);
        const ctr = [0, 1, 2].map((ax) => (v[quad[0]][ax] + v[quad[1]][ax] + v[quad[2]][ax] + v[quad[3]][ax]) / 4);
        // visible from at least one shot camera? (tolerance keeps edge-on faces)
        let vis = 0;
        for (const C of cams) {
          if ((C[0] - ctr[0]) * n[0] + (C[1] - ctr[1]) * n[1] + (C[2] - ctr[2]) * n[2] > -1.5) { vis = 1; break; }
        }
        faces.push({ n, ctr, quad: quad.map((k) => v[k]), hex, transparent, name, box: boxIdx, mn, mx, vis, inv, half });
      }
    });

    const signedArea = (poly) => {
      let a = 0;
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
        a += p1[0] * p2[1] - p2[0] * p1[1];
      }
      return a / 2;
    };
    const clipArea = (subjRaw, clipRaw) => {
      // normalize both polygons to CCW in the projected 2D space — the world
      // face winding can project to either orientation depending on the axes
      let subj = subjRaw.slice(), clip = clipRaw.slice();
      if (signedArea(subj) < 0) subj = subj.slice().reverse();
      if (signedArea(clip) < 0) clip = clip.slice().reverse();
      const inside = (pt, e1, e2) =>
        (e2[0] - e1[0]) * (pt[1] - e1[1]) - (e2[1] - e1[1]) * (pt[0] - e1[0]) >= -1e-9;
      const inter = (p1, p2, e1, e2) => {
        const d1 = (e2[0] - e1[0]) * (p1[1] - e1[1]) - (e2[1] - e1[1]) * (p1[0] - e1[0]);
        const d2 = (e2[0] - e1[0]) * (p2[1] - e1[1]) - (e2[1] - e1[1]) * (p2[0] - e1[0]);
        const t = d1 / (d1 - d2);
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
      };
      let poly = subj;
      for (let i = 0; i < clip.length && poly.length; i++) {
        const e1 = clip[i], e2 = clip[(i + 1) % clip.length];
        const out = [];
        for (let j = 0; j < poly.length; j++) {
          const cur = poly[j], prv = poly[(j + poly.length - 1) % poly.length];
          const cin = inside(cur, e1, e2), pin = inside(prv, e1, e2);
          if (cin) { if (!pin) out.push(inter(prv, cur, e1, e2)); out.push(cur); }
          else if (pin) out.push(inter(prv, cur, e1, e2));
        }
        poly = out;
      }
      return Math.abs(signedArea(poly));
    };

    // ---- pair scan: same-facing, close planes, overlapping footprints ----
    const risks = [];
    const benign = { invis: 0, buried: 0, underFloor: 0, sameColor: 0, transparent: 0 };
    const stage = { faces: 0, parallel: 0, closePlane: 0, overlap: 0 };
    const fmt = (f) => `${f.hex} ${f.name} @(${f.ctr.map((x) => +x.toFixed(1)).join(',')}) n(${f.n.map((x) => +x.toFixed(2)).join(',')})`;
    // a face is "buried" when all 4 corners sit strictly inside the other box
    const buriedIn = (face, other) => {
      const inv = other.inv, h = other.half;
      for (const p of face.quad) {
        const x = p[0], y = p[1], z = p[2];
        const l = [
          inv[0] * x + inv[4] * y + inv[8] * z + inv[12],
          inv[1] * x + inv[5] * y + inv[9] * z + inv[13],
          inv[2] * x + inv[6] * y + inv[10] * z + inv[14],
        ];
        for (let a = 0; a < 3; a++) if (Math.abs(l[a]) > h[a] - 0.02) return false;
      }
      return true;
    };
    for (let i = 0; i < faces.length; i++) {
      const A = faces[i];
      for (let j = i + 1; j < faces.length; j++) {
        const B = faces[j];
        if (A.box === B.box) continue;
        // both faces must be visible from some shot camera
        if (!A.vis || !B.vis) { benign.invis++; continue; }
        // rest-pose props sit far under the floor — ignore their ground contacts
        if ((A.name === 'ground' || B.name === 'ground') &&
            (A.mx[1] < -0.6 || B.mx[1] < -0.6)) { benign.underFloor++; continue; }
        // a face hidden inside the other box never fights (buried interpenetration)
        if (buriedIn(A, B) || buriedIn(B, A)) { benign.buried++; continue; }
        // same-facing normals only (opposite-facing pairs are culled/backfaces)
        const dot = A.n[0] * B.n[0] + A.n[1] * B.n[1] + A.n[2] * B.n[2];
        if (dot < 0.999) continue;
        stage.parallel++;
        const d = Math.abs((A.ctr[0] - B.ctr[0]) * A.n[0] + (A.ctr[1] - B.ctr[1]) * A.n[1] + (A.ctr[2] - B.ctr[2]) * A.n[2]);
        if (d >= GAP) continue;
        stage.closePlane++;
        // project both quads onto the shared plane and measure true overlap
        const n = A.n;
        let u, w;
        if (Math.abs(n[0]) > Math.abs(n[1]) && Math.abs(n[0]) > Math.abs(n[2])) { u = 1; w = 2; }
        else if (Math.abs(n[1]) >= Math.abs(n[2])) { u = 0; w = 2; }
        else { u = 0; w = 1; }
        const area = clipArea(A.quad.map((p) => [p[u], p[w]]), B.quad.map((p) => [p[u], p[w]]));
        if (area < 0.2) continue;
        stage.overlap++;
        const kind = d < 0.02 ? 'COPLANAR' : 'NEAR';
        const sameColor = A.hex === B.hex;
        const isChar = A.name.startsWith('char-') || B.name.startsWith('char-');
        const r = { kind, d: +d.toFixed(3), area: +area.toFixed(1), A: fmt(A), B: fmt(B), sameColor, transparent: A.transparent || B.transparent };
        if (sameColor) { benign.sameColor++; r.kind = 'INFO(' + kind.toLowerCase() + '-same-color)'; }
        else if (A.transparent || B.transparent) { benign.transparent++; r.kind = 'INFO(transparent)'; }
        else if (isChar) { r.kind = 'CHAR-' + kind; }
        risks.push(r);
      }
    }
    const seen = new Set();
    const out = risks.filter((r) => {
      const k = r.kind + r.d + r.A + r.B;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { total: faces.length / 6, risks: out, benign, stage, GAP };
  }, { GAP, SHOW_ALL });

  const errs = report.risks.filter((r) => r.kind.startsWith('COPLANAR') || r.kind.startsWith('NEAR'));
  const chars = report.risks.filter((r) => r.kind.startsWith('CHAR-'));
  console.log(`boxes: ${report.total}   stage: parallel=${report.stage.parallel} closePlane=${report.stage.closePlane} overlap=${report.stage.overlap}`);
  console.log(`benign skipped: invis=${report.benign.invis} buried=${report.benign.buried} under-floor=${report.benign.underFloor} same-color=${report.benign.sameColor} transparent=${report.benign.transparent}`);
  console.log(`risky pairs: ${report.risks.length}   ERRORS: ${errs.length}   CHAR warnings: ${chars.length}`);
  for (const r of report.risks) {
    console.log(`${r.kind.padEnd(26)} d=${String(r.d).padEnd(6)} area=${String(r.area).padEnd(7)} | ${r.A}  <->  ${r.B}`);
  }
  console.log(errs.length ? '\nFAIL: fix every COPLANAR / NEAR pair (Rule 24).' : '\nPASS: no visible same-facing face pair inside the flicker zone.');
  await browser.close();
  server.close();
  process.exitCode = errs.length ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
