# Visual Quality Rules — learned from matching `scenario/project 1.png`

Rules distilled while iterating the v3 visit-room render toward the reference image
(2026-10-30 session). Apply these to **every new scenario** (2, 3, …) from the start —
they were the difference between a flat "amateur" render and a bright, professional one.

Process rule that produced them: render `tools/preview-shots.js`, compare side-by-side
with the reference, fix, re-render — repeat until the shot matches. Never judge lighting
from one pass; do at least one "look again and self-correct" cycle.

---

## Rule Q1 — Lighting decides quality more than modeling

The single biggest quality gap was light, not geometry.

- Base recipe (`src/js/main.js`): strong neutral hemisphere (sky `#ffffff`, ground
  `#e8eef0`, intensity ≈ 1.45) + `AmbientLight('#ffffff', 0.25)` + warm sun
  (`#fff6e8`, 1.7) + a **shadowless front fill** `DirectionalLight('#f4f8fb', 0.85)`
  from the camera side. Walls must read near-white, never mid-gray.
- Signs your lighting is wrong (all were true before the fix): gray-looking white walls,
  hard-edged shadows thrown across walls, dark overall exposure, colors that look muted.
- New scenario = new palette? Re-check exposure with a preview shot before building props.

## Rule Q2 — Nothing on a wall may cast a shadow

Wall décor (posters, clock, whiteboard, stethoscope, wall hooks) casting the sun's shadow
across the wall instantly reads cheap and dirty. The reference has clean walls.

- After building any wall-mounted group: `g.traverse((o) => { o.castShadow = false; });`
- Shadows belong on the floor and under furniture only.

## Rule Q3 — Wall art must face the camera's wall, with its width along the wall

A poster built with width along the depth axis shows as an edge-on sliver (the food
posters were invisible for this reason even after being "added").

- For a back-wall poster: `boxMesh(width, height, thin)` — width spans the wall's X.
- Position: `g.position.set(x, height, -D/2 + 1.0)`; décor details sit proud at
  small z (≈ 0.9–1.3), not ±5.
- Print labels ON the poster: `textSprite(label, { bg: 'rgba(0,0,0,0)' })` — floating
  white pill sprites over a colored poster look like UI, not art.

## Rule Q4 — Clothing must read at a glance (layer colors)

The doctor's white coat was invisible because lapels/collar were built in the shirt
(teal) color — the character read as "man in scrubs" in every shot.

- For layered clothing (coat over shirt, jacket, scarf), outer layer pieces
  (collar, lapels, cuffs) use the OUTER layer color; only a narrow inner strip
  (the scrub V, shirt front) shows the under-layer.
- Check every character in at least one close-up and one wide shot: does the outfit
  match the reference at both scales?

## Rule Q5 — Match the reference palette exactly, including the "boring" surfaces

Floor checkers, ground plane around the building, wall trim — these set the overall tone.
The outdoor ground plane (`#b9c6cb` → `#ccd5d8`) sits in the foreground of dollhouse
shots; a dark band there darkens the whole frame.

- Palette lives in `library/room/*.json` — change JSON, not code.
- Every scenario gets its own room JSON with its own palette; copy the values from the
  reference image, don't approximate from memory.

## Rule Q6 — Iterate against the reference, not against memory

- Loop: `./tools/node24.cmd tools/preview-shots.js` → open `render/preview/*.png` →
  compare with `scenario/*.png` → list concrete diffs → fix → repeat.
- Look for: poster orientation, shadows on walls, character clothing layers, exposure,
  anything edge-on, anything missing entirely.
- Stop when a side-by-side of the wide shot and the reference is indistinguishable in
  palette/mood, not when "close enough" in geometry.

## Rule Q7 — Character faces need contrast in close-ups

Eyes/brows in near-black with white highlights, warm skin (`#f0c8a0`), clearly darker
hair block — this is what makes close-up shots (doctor, mother, child) look intentional.
When adding a new character, verify its close-up shot first; wide shots hide flat faces.

---

# Window & palette session (ep02) — added 2026-10-31

## Rule Q8 — A window must show a place, not a colored rectangle

A window that renders as a flat sky-colored panel reads as "no image inside"
(the user's exact complaint on ep02). Every room window gets a real outdoor
scene, built deep in the wall tunnel:

- Layered backdrop: sky + green horizon strip, sun disc with glow, voxel trees
  with multi-block layered crowns, low bushes, 3-part clouds.
- Glass tint near-transparent (opacity ≈ 0.14) so the scenery actually reads;
  white frame border + cross mullions; half-lowered roller blind; one bunched
  curtain panel on a rod; leafy plant on the sill (reference project 2.png).
- Window position is part of composition: it belongs near a wall corner and
  must be fully in frame in the opening wide shot — reframe the establishing
  camera if the opening clips it.

## Rule Q9 — Saturated accent colors get muted when they sit in large groups

The bookshelf's five book colors (pure red/blue/green/yellow/purple) fought
with the window light and looked toy-like. Group-filled props (book rows,
drawer fronts, tile patterns) use darkened, desaturated versions of the same
hues (`#a35d52 #52708a #5f7d63 #b3a06e #7a6591`). Rule of thumb: pure
saturated hues are for small focal accents only, never for repeated fills.

## Rule Q10 — New builder features are opt-in; never silently restyle approved rooms

Shared-library builders (`world.js`) serve every episode. When adding a new
detail (white frame, blind, single curtain), gate it behind a JSON key and
default to the previously approved look:

- `window.frame` (default `P.metal`), `window.blind: true` (off by default),
  `window.curtainSide` (unset = legacy symmetric pair).
- After touching any shared builder, re-render previews for **all** episodes
  that use it and compare against their approved shots.

## Rule Q11 — A visible window must also be a light source (ep02, 2026-10-31)

A curtained "light-catching" window that contributes no light reads as set
decoration. When a room JSON declares a side window, `main.js` adds a cool
directional wash from the window's side into the room:

- `DirectionalLight('#ddf2ff', 0.75)` positioned beyond the window wall,
  aimed at the room's mid/far side, `castShadow = false` so it lifts surfaces
  without fighting the sun's shadows (extends the Q1 recipe; gated on
  `roomDef.window.side === 'left'` so rooms without a side window are untouched).
- Verify with a preview still: the wall/floor nearest the window should read
  slightly cooler and brighter than the far side, but not enough to gray the
  near-white walls (Q1).
