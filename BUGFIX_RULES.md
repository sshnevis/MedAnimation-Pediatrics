# Voxel Animation — Bug-Fix Rules

Rules learned from real bugs fixed in this project (z-fighting flicker, reversed animation,
shadow artifacts). Follow them whenever adding or editing voxel geometry, shots, or poses.

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
