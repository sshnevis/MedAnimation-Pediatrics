# Voxel Animation — Bug-Fix Rules

Rules learned from real bugs fixed in this project (z-fighting flicker, reversed animation,
shadow artifacts). Follow them whenever adding or editing voxel geometry, shots, or poses.

> Companion doc: `QUALITY_RULES.md` — visual-quality rules (lighting, wall shadows, poster
> orientation, clothing layers, palette, reference-iteration process). Apply both docs.

## Rule 1 — Never let two box faces share the same plane (z-fighting)

Two coplanar faces (same plane, overlapping area) make the depth buffer flip between them
every frame → flickering ("پرش تصویر").

- When stacking decorative slabs (seams, stripes, hems, drape strips, socks), size or place
  them so their faces sit **clear of** the parent face — never flush with it.
  - Flush case we hit: the pant-leg seam stripe's outer face was exactly on the leg's outer
    face → nudged 0.05 out (`voxel.js` seam).
  - Equal-width case: the sock was exactly as wide as the shoe below it (both 4.3) → equal
    side faces fought at the ankle. Make the upper layer strictly wider/outer (sock = leg + 0.5).
- When a thin detail crosses a surface, make it **fully proud** of that surface, not 0.05
  poking through (the lanyard was only 0.05 in front of the collar front).
- Decorative flat pieces (rug diamond, window sky/glass) must not touch the plane they sit
  on: lift them (rug diamond bottom was exactly at the rug's top face → raised).
- Prefer face-to-face clearance of **≥ 0.1 units**; 0.05 is only safe with a large camera
  near plane (see Rule 4).
- Audit tool: scan the scene for faces with (nearly) equal planes and overlapping extents,
  same or opposite normals, before shipping a new asset composition.

## Rule 2 — Match the camera near plane to the actual shot distances

`PerspectiveCamera(fov, aspect, 0.1, 500)` destroyed depth precision for shots that sit
40–145 units away → even non-coplanar gaps of 0.05 flickered at distance.

- Set `near` to the closest distance any geometry ever gets to any camera (here: ≥ 1,
  currently `near=1, far=300`). Never leave a default-tiny near plane "just in case".
- Keep `far` as tight as the scene allows (room + ground ≈ 300).

## Rule 3 — Thin shadow-casting/receiving strips flicker even without coplanar faces

A rotated strap 0.5 units wide that both casts and receives shadows strobes as the camera
or the wearing character moves (the doctor's lanyard at the collar).

- For thin decorative straps/strips (< ~1 unit thick), disable both:
  `mesh.castShadow = false; mesh.receiveShadow = false;`
- Don't let a strap end exactly at another surface's plane (the lanyard ended exactly at the
  head's bottom plane, y=24, and its rotated corners poked into the head). End it below the
  covering piece (collar top = 23.9 → strap ends at 23.4).
- Keep `sun.shadow.normalBias ≈ 0.5–0.6` (with a small negative `bias` around -0.0002) —
  plain bias alone leaves crawling stripe acne on box faces (seen under the door and on
  the collar).

## Rule 4 — Break coincidental plane-sharing between separate world pieces

Two independently placed boxes can end up face-to-face in the same plane (the door frame
front face and the back-wall baseboard front face were both at z = -D/2 + 0.5).

- After placing a wall-mounted piece, compare its face planes against neighboring strips
  (baseboards, trims, curtains) and nudge at least one by ≥ 0.05.
- Anything that lies on the floor (door panel) should be lifted a hair (0.05–0.06) off the
  floor plane, or its swinging/shadow strobes at the contact line.

## Rule 5 — Limb raise/sign convention for waves

`limbMesh` boxes hang along **-Y** from the shoulder/hip pivot. For the **right** arm
(placed at +X):

- `rotation.z = +angle` raises the arm up-and-outward (correct wave).
- `rotation.z = -angle` folds it up-and-inward across the head, so the flap reads as the
  hand moving backwards.

Before mirroring a pose between left/right limbs, derive the expected direction from
`Rz(θ)·(0,-1) = (sinθ, -cosθ)` instead of flipping the sign by intuition.

## Checklist for new geometry / shots

1. No two faces coplanar (same plane + overlap, either normal direction).
2. Thin details fully proud of, or clearly sunken into, the surface they decorate.
3. Camera near/far matched to real shot distances.
4. Thin straps: shadows off, ends tucked under the covering piece.
5. New world piece: check its face planes against neighbors, and off the floor plane.
6. New limb pose: verify raise direction from the rotation math, not by symmetry.

---

# Furniture & Prop Sizing Rules (v3 lessons)

Rules learned from the visit-room seating and explainer-tray fixes. These apply to
scenarios 2, 3 and beyond — check them when designing any new room, chair, desk, or
tray of props.

## Rule 6 — Furniture must be sized to the bodies that use it (seat/armrest fit)

A chair whose seat is narrower than the seated character's body reads as broken:
the armrests end up buried inside the torso/arms (seen with mother + child on the
guest chairs — seat was 8 wide while the character torso is 8 and arms reach ±7.2).

- Before building a seat, read the character part dims from the character JSON
  (`torso` width, `arm` shoulder offsets) and make the seat wider than the body.
- Armrests go **outside the arms**: armrest center X ≥ max arm outer edge
  (here ±7.1 for arms spanning to ±7.2). Never place armrests inside the torso width.
- Legs stay under the seat corners; spread them when the seat widens.
- Keep seat-top height (`y=9`) and the `sitY` math in `voxel.js` in sync — if a seat
  height changes, update `sitY`.

## Rule 7 — When furniture widens, re-check spacing and blocking marks

Widening one piece invalidates its neighbors. After any size change:

- Re-measure center-to-center distance between side-by-side pieces (two chairs were
  13.3 apart while each became ~15.7 wide → they overlapped). Required distance >
  combined half-widths.
- Move the pieces apart in the room JSON **and** update every dependent blocking
  mark in the same change (`motherSit`, `childSit`, `heart`, …), including the
  fallback defaults in `blocking.js`. Marks and furniture must never drift apart.

## Rule 8 — Items on a shared tray/desk must not intersect

Explainer foods on the tray overlapped because spacing (4.8) was smaller than the
widest dish (kate-mast plate 10.4). Also, labels above items collided.

- For each item, take its **widest bounding-box half-width** (plates, sachets,
  overhanging parts — not just the main body) and sum the half-widths of each
  neighboring pair; spacing must exceed that sum. Add margin ≥ 1.
- Widen the tray/desk itself so the outermost items still fit with margin.
- Check the label sprites the same way — text labels need horizontal clearance too.
- After widening, re-check the shot that frames the group: the vertical Reels FOV
  is narrow, so a wider group may clip at the edges (tray scale was 0.7 for L03;
  verify outer items are not cut off, adjust scale or the tray mark if they are).

## Rule 9 — One source of truth for sizes

Sizes live in asset JSON (`visit-room.json`, `props.json`, `characters.json`); code
(`world.js`) reads them and scales all sub-parts automatically. When a size must
change, change the JSON, not hard-coded numbers in `world.js` — except layout-only
values (item offsets on a tray) which live next to the builder code.

## Rule 10 — User visual feedback is the acceptance test

Every correction the user sends as an annotated screenshot (chair/armrest overlap,
food tray collisions) is a mandatory rule for all future scenarios. When a new
scene is built, proactively self-audit against these rules **before** showing it:
body-vs-furniture fit, neighbor spacing, tray item clearance, label readability.

---

# Session fixes — v3 review round (characters & wall decor)

Rules distilled from the seated-character and poster review pass. All were the same
root cause (coplanar faces) found one screenshot at a time; apply them up front.

## Rule 11 — Limb end caps: details at a limb's tip must extend past the flat end

`limbMesh` boxes end in a flat cap (legs at y=-12, arms at y=-12). Any part mounted
at the tip whose bottom face is coplanar with that cap fights it — invisible while
standing, but glaring when the limb rotates (seated legs point the cap at the
camera; hanging hands flicker from below).

- The **sole** ended exactly at the leg's cap (both y=-12), and its bottom was also
  exactly at the floor plane (y=0) → extend the sole 0.05 below the cap
  (`sole.position.y = -P.leg[1] + 0.3`). This fixes cap-fight AND floor-fight at once.
- The **shoe's back face** was exactly on the leg's back face plane (z=-2) → shift
  the shoe forward (z 0.6 → 0.7).
- The **hand** box ended exactly at the arm's cap (both y=-12) → extend the hand
  0.05 past it (`hand.position.y = -11.05`).

Whenever adding a part at a limb tip, list the tip's 6 planes and make the new part
strictly outside them (or strictly inside, fully hidden) — never flush.

## Rule 12 — Front-mounted details must stand proud of their covering surface

A pin/badge mounted on a scarf/fold is invisible as a fight until the camera gets
close: the hijab pin's front face was exactly on the hijab fold's front face
(z=4.9) → flicker at the corner of the face. Fix: mount it 0.25 proud
(`pin.position.z = 4.95`) so it reads as sitting ON the fabric.

Similarly the lanyard strap's back face was exactly on the coat collar's front
face (z=2.15) → flicker at the neck. Fix: strap sits at `torso/2 + 0.5` so its
back face clears both the collar (2.15) and the scrub V (2.25).

For every small detail on the torso/head, compute the covering piece's front-face
z and push the detail's back face at least 0.1 past it (Rule 1 margin applies).

## Rule 13 — Rows of wall items: spacing must exceed item width

Adjacent food-poster frames were 9.5 wide but placed 9 apart → 0.5 overlap, and
since all sit on the same wall plane their front faces were coplanar in the
overlap → flickering vertical seam between posters.

- For any row (posters, shelves, windows), `spacing ≥ item width + gap` (gap ≥ 0.5).
- The row's total extent must still fit the wall with margin (posters now span
  x 19.25..58.75 on a wall ending at 69).
- Same logic as tray items (Rule 8) but for wall planes — check BOTH the front
  faces (coplanar overlap) and side faces (touching planes).

## Checklist additions

7. Limb-tip parts strictly outside (or strictly inside) the limb's 6 cap planes.
8. Front-mounted details (pins, badges, straps) ≥ 0.1 proud of their covering face.
9. Wall-item rows: spacing ≥ width + 0.5 gap; verify total extent fits the wall.

---

# Episode-1 polish session (sitting, wall-referencing shots, tray framing)

Lessons from the user's three-part polish pass: tidier room, bigger chairs with
fixed child sit height, and the L03 food-wall shot. Apply to scenarios 2, 3+.

## Rule 14 — Seat height is a world-space constant; sit offset must be scale-aware

`sitY` was `8 − 12×scale`, which put the scaled character's hips at `8×scale`
world units — the child (scale 0.62) sank ~3 units *below* the seat while the
mother (0.95) only looked slightly low. Hips must land on the seat **in world
space, for every character scale**.

- `sitY = seatTop − 12 × scale` (seat top is the same physical number for
  everyone, e.g. `9`). Never multiply the seat height by the character scale.
- If any seat height changes (guest chairs, office chair, exam-bed sitting),
  update the `sitY` constant in `voxel.js` in the same change.
- Keep all seat tops equal across furniture the characters sit on (guest chair
  and office chair both end at y=9) so one constant serves all.

## Rule 15 — Knee-less sitting pose

Characters have a single leg segment (no knee), so a seated pose is a
compromise — use the proven values instead of re-deriving:

- Legs `rotation.x ≈ −1.45` rad: thighs nearly horizontal, feet just below hip
  level. Never past `−π/2` (feet tip upward) and never shallower (legs clip
  through the seat front edge).
- Slight outward spread: `legL.rotation.z = −0.07`, `legR.rotation.z = +0.07`.
- Arms rest forward on the lap (`rotation.x ≈ −0.55` + small idle sway) instead
  of hanging straight down.
- **Reset every pose axis in every branch** of `applyPose` — a `rotation.z` set
  while sitting persisted into walking/standing until explicitly zeroed.

## Rule 16 — When dialogue references wall items, cut to a shot of the wall

L03 named the four foods while the camera framed the doctor — the posters the
line was about were entirely outside the frame.

- Any line that enumerates on-screen objects (posters, whiteboard, shelf
  items) gets a dedicated shot framing those objects, even if the speaker
  stays off-frame for that line.
- Compose so the referenced objects fill the middle band of the 9:16 frame;
  verify by seeking to the line's midpoint and screenshotting.
- A supporting prop (the floating tray) must not occlude the referenced
  content: shrink it (`tray.scale 0.7`) and float it below the object row.

## Rule 17 — 9:16 safe band: keep key visuals above the subtitle box

The subtitle box covers roughly the **lower third** of the vertical frame for
almost the entire runtime.

- Pop-in props must float high enough that their visuals (and label sprites)
  clear the subtitle's top edge — the L03 tray rises to y=9, not lower.
- Check each new prop shot while the subtitle is visible; a prop hidden
  behind the subtitle is a failed shot.

## Rule 18 — Measure prop-to-camera distance; near props balloon

A tray 40–70 units from the camera filled half the frame width and collided
visually with the wall content behind it.

- For every new shot, compute camera→prop distance; if the prop is meant as a
  supporting element, push it out or scale it down until it reads secondary
  (the food-wall shot sits ~77 units from the tray).
- Small floating text labels multiply the problem: scale label sprites down
  (`×0.6` on the tray) so neighbors don't overlap.

## Rule 19 — GSAP cannot write Three.js `Object3D.scale` directly

`tl.set(obj, { scale: 0.7 })` throws `Cannot assign to read only property
'scale'` — `scale` is a `Vector3`, not a plain property.

- Tween the components (`scale.x/y/z`) or use
  `tl.call(() => obj.scale.setScalar(0.7), null, at)`.
- `pop()` already tweens components — reuse it instead of fresh `tl.set`
  scale shortcuts.

## Rule 20 — Room layout tidiness (reference-image discipline)

When a reference image is given, layout tidiness is part of acceptance:

- Wall furniture flush to its wall (bookshelf depth fully inside the baseboard
  line), rotations axis-aligned (no decorative 0.15-rad tilts unless asked).
- Companion pieces grouped logically: stool beside the exam bed, side table in
  the camera-foreground corner, plant anchoring the far corner.
- After any furniture move, re-check that blocking marks still sit on the
  moved pieces (Rule 7) and that no camera shot now clips the moved piece.

## Checklist additions

10. sitY = seatTop − 12×scale; all seat tops equal; scale never multiplies
    seat height.
11. Sit pose: legs −1.45 rad + 0.07 spread, arms on lap, all pose axes reset
    in every branch.
12. Every dialogue line that names objects: verify a shot shows those objects
    at the line's midpoint.
13. Key pop-in props clear the subtitle box (upper ⅔ of frame).
14. Supporting props scaled/distant enough to not occlude the referenced
    subject; label sprites non-overlapping.
15. GSAP: never `tl.set(obj, {scale})` on an Object3D — components or
    setScalar via `tl.call`.

---

# Wall-depth & window session (ep02 rebuild)

Lessons from rebuilding the ep02 window (user-reported "پرش تصویر" flicker +
"no picture inside the window" + "walls are paper-thin"). Apply to every room
with a window from now on.

## Rule 21 — A backdrop panel flush with its wall z-fights; recess openings into real wall depth

The window's sky panel was a box whose back face sat exactly on the wall's
inner face (both z=0) — coplanar over the whole opening → full-opening
flicker, invisible in any single still frame.

- Rooms have `wallThickness` (default 5). A window is a **tunnel**: the wall is
  built as 4 segments around the opening (below sill / above head / two
  flanks), scenery sits deep at the outer face, glass mid-tunnel, blind /
  curtain / sill near the inner face. Nothing is coplanar with anything.
- The wainscot band and its cap rail are segmented around the opening too —
  a proud band crossing a cut opening reads as broken.
- After building any wall-mounted assembly, list which of its faces touch the
  wall's inner-face plane and push each strictly off it (Rule 1 margin).

## Rule 22 — An opening frame is a border, never a slab

The rebuilt window's frame was first made as one solid box spanning the whole
opening (width+2.4 × height+2.4) — once the scenery moved *inside* the wall,
the slab hid it completely and the window went blank. Caught only because the
preview loop was re-run.

- Window/door frames are built as 4 bars (top/bottom/left/right) around the
  opening. If any part of the assembly is a full-size panel, ask what is
  behind it — a solid panel in front of scenery is a bug.
- When a fix changes the layering order (what is in front of what), re-render
  the affected shots and re-check them — do not trust the previous pass.

## Checklist additions

16. Openings cut through `wallThickness` walls: scenery deep, glass mid,
    dressing near the inner face; no face flush with any wall face.
17. Frames around openings are borders (4 bars), not slabs; re-render after
    any layering-order change.

