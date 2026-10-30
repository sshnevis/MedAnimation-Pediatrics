# Plan v3 — Room upgrade, camera language, and video hooks

Reference image: `scenario/project 1.png` (voxel pediatric visit room).
Execute as **three separate tasks, in order 1 → 2 → 3**. Task 1 and Task 2 both end in a
browser/preview verification; a full re-render happens after Task 2, and Task 3 operates at
assemble time on the rendered output.

Follow `BUGFIX_RULES.md` (z-fighting, near/far plane, shadow rules) for every geometry change.
Keep everything data-driven (JSON assets drive `world.js`; camera marks derive from
`assets/room/visit-room.json` → `src/js/blocking.js`). Do not break the deterministic render
mode (`window.__seek` in `src/js/main.js`).

---

## Task 1 — Room v3: bigger room, image-faithful props, rearrangement, light door

### Goal

Enlarge the room so every item visible in the reference image fits comfortably, restyle the
props that differ from the image, rearrange the layout to match the image, and change the door
from dark brown to **light brown**. Then sync the scenario docs to the new room.

### 1.1 Room shell — `assets/room/visit-room.json`

- `size`: `[110, 90]` → **`[138, 108]`** (both divisible by the floor tile size 6, so the
  checker pattern stays symmetric; half-extents become X ±69, Z ±54).
- `wallHeight`: keep `36`.
- `door`: `x: 6`, `width: 16`, `height: 30`, **`color: "#b08968"`** (light warm brown — this is
  the whole door panel, so the inner face seen when the door is open is light too, as
  requested). Door frame color in `src/js/world.js` uses `P.woodDark` (`#6d4c41`); lighten the
  frame to `#8d6e63` so it still reads against the lighter door. Door handle: change
  `#ffd54f` (yellow) → `#cfd8dc` (silver, matches the image).
- `window` (left wall): enlarge to `width: 36`, `height: 18`, `y: 18` (image shows a large
  multi-pane window). Keep greenery, clouds, curtains, sill cactus.
- Palette: warm the floor slightly toward the image's white/light-gray checkers:
  `floorA: "#e0e5e7"`, `floorB: "#c3cbcf"`. Walls unchanged.
- **No full ceiling** — all cameras look down into the room from +Z (dollhouse view); a ceiling
  would block the wide shots. Skip the ceiling light panel from the image (optional: only add a
  suspended panel if a preview proves it never enters any frame — default is to skip).

### 1.2 Layout — furniture table (matches the image arrangement)

Back wall (z = −54), left → right:
clock `[-48, 27]` · welcomePoster `[-26, 24]` · **door x=6** · foodPosters
`[24, 24] / [33, 24] / [42, 24] / [51, 24]` · stetho `[60, 25]`.

Floor items:

| Item | pos [x, z] | Notes |
|---|---|---|
| desk | `[-30, -16]` | size `[24, 10, 13]`, restyle per 1.3 |
| officeChair | `[-30, -30]` | doctor seated here |
| bookshelf (L) | `[-64, 2]` | rotY 1.5708, against left wall (image: left) |
| sideTable | `[-48, 18]` | tissue box + cactus (image: front-left) |
| rug | `[12, 14]` | size `[48, 30]` |
| chair (mother) | `[18, 12]` | rotY facing the doctor |
| chair (child) | `[5, 15]` | rotY facing the doctor |
| bookshelf (R) — **new** | `[56, 28]` | rotY π so books face the room; image bottom-right shelf |
| examBed | `[52, -20]` | **rotY 1.5708** — long axis along the right wall, as in the image |
| stool | `[36, -8]` | between bed and family zone |
| plant | `[62, 6]` | right side |
| whiteboard | `[68.2, -12]` | rotY −1.5708, right wall |

### 1.3 Prop improvements to match the image ("if needed" list)

- **Desk** (`world.js` case `desk`): image shows a wooden top on a white/cream body. Change
  legs + drawer unit from wood tones to `P.white` / `#eceff1`; keep the wooden top and the
  monitor/keyboard/papers/books/pen tray/lamp.
- **Exam bed** (`world.js` case `examBed`): image shows a teal mattress with white sheet and
  **drawers under the base**. Add: teal pad on top of the white mattress (teal slab clearly
  proud of the mattress per Rule 1: ≥ 0.1 clearance), and two drawer fronts + knobs on the
  base's room-facing side (proud of the base face by ≥ 0.1, silver knobs like the desk).
  Keep rail, pillow, step stool.
- Chairs, stool, bookshelf, side table, rug, plants, posters, whiteboard, stethoscope already
  match the image — no changes beyond position.

### 1.4 Blocking marks — `assets/room/visit-room.json` → `blocking`

```
doctorSit   [-30, -30]     doctorFace  [12, 13]
motherStart [6, -62]       childStart  [2, -60]     (outside the door, z beyond −54)
motherSit   [18, 12]       childSit    [5, 15]
familyFace  [-30, -30]
tray [-6, 2]   water [-28, -16]   warn [-16, -18]   heart [5, 15]
```

### 1.5 Downstream sync

- `src/js/main.js`: sun shadow camera bounds `left/right/top/bottom` ±80 → **±100**,
  `far` 200 → 250 (bigger room). Camera `far` 300 is still enough (widest shot ≈ 210 units to
  the farthest corner) — verify after Task 2 sets final shot positions.
- `src/js/timeline.js`: walk distances grow (~75 units door→chair). Retune
  `WALK_MOTHER` (4.0 → ≈ 4.4) and `WALK_CHILD` (3.9 → ≈ 4.3) and confirm the walk-in still
  finishes before L02 starts (check `timing.json` L01.end / L02.start).
- `assets/room/FLOORPLAN.md`: rewrite for v3 (size, ASCII plan, blocking table, camera
  grammar placeholder — Task 2 finalizes the camera section).
- `assets/room/visit-room.json` `description`: update to v3 wording.
- `scenario.json`: the `action` texts stay valid (they reference door/desk/chairs/posters
  generically); no dialogue changes in this task.
- `assets/props/props.json`: unchanged (tray/water/warn/heart positions come from blocking
  marks).

### 1.6 Verify (Task 1 acceptance)

1. `node tools/serve.js` → open `http://127.0.0.1:8090/src/index.html`, play once:
   - every image item present: big window + greenery, welcome poster, light-brown door
     (inner face light when open), 4 food posters, stethoscope, whiteboard, 2 bookshelves,
     desk with white body + wood top, black office chair, 2 teal chairs on teal rug, exam bed
     with teal pad + drawers along the right wall, stool, side table with tissue box + cactus,
     plants, clock, checkered floor;
   - mother + child walk in and sit naturally, doctor seated behind desk, nothing intersects
     (desk/chairs/rug/walk path), door swing has no flicker;
   - no z-fighting anywhere (watch baseboards, drawer fronts, teal pad, rug edge).
2. `node tools/preview-shots.js` → check `render/preview/*.png` for framing sanity (shots are
   retuned in Task 2, so here only check for clipping through walls/furniture).

---

## Task 2 — Camera: pull back, fewer moves, static holds

### Goal

The current close shots fill the whole frame with a face (see `render/frames/f_00900.png`) and
the camera changes position on almost every line. New grammar: medium/wide framing only, the
camera stays **static during a shot**, and consecutive lines can share one held angle.

### 2.1 Shot table — `src/js/blocking.js` `buildShots()`

All positions derive from marks (`D` = doctorSit, `Mo`/`Ch` = family sits). dolly = 0 makes the
shot fully static (`setShot` lerps toward `pos + (target−pos)·dolly`; with 0 there is no move).

| Shot | pos | target | dolly | Used for |
|---|---|---|---|---|
| `wide-door` | `[8, 40, 158]` | `[6, 12, -12]` | 0.03 | L01 opening (only slow push-in in the film) |
| `over-doctor` | `[D.x-10, 26, D.z+36]` | `[midX, 10, midZ]` | 0 | L02, L08 |
| `medium-doctor` | `[D.x-24, 23, D.z+50]` | `[D.x, 12, D.z]` | 0 | **L03 + L04 held** (one angle, two lines) |
| `medium-doctor-2` | `[D.x+18, 22, D.z+46]` | `[D.x, 13, D.z]` | 0 | L05, L07 |
| `child` | `[Ch.x-10, 19, Ch.z+42]` | `[Ch.x, 11, Ch.z]` | 0 | L06 (pulled-back medium; heart stacks above child) |
| `wide-final` | `[8, 34, 148]` | midpoint of D and family, y 11 | 0 | L09 |

- **Delete `close-doctor` and `over-doctor-2`** entirely (and their uses). No shot may frame a
  head closer than ~45% of frame height; subjects should sit at roughly ⅓–½ of frame height.
- Keep the tiny handheld sway in `main.js` (`Math.sin` offsets) — it gives life without moving
  the camera position.

### 2.2 Cut plan — `src/js/timeline.js` `plan[]`

```
L01 wide-door · L02 over-doctor · L03 medium-doctor · L04 medium-doctor (HOLD, no cut)
L05 medium-doctor-2 · L06 child · L07 medium-doctor-2 · L08 over-doctor · L09 wide-final
```

Implementation: track the current shot name in `buildTimeline`; call `setShot` only when the
shot name changes (prevents the dolly/position reset when holding across lines). With dolly 0
the camera holds perfectly still for the whole shot; the end-card drift (`py += 6, pz += 5`
over 6.6 s) stays as is.

### 2.3 Verify (Task 2 acceptance)

1. `node tools/preview-shots.js` → every shot: subject ≤ ~55% of frame height, family/doctor
   never shot through each other, heart/tray/posters visible in their shots, nothing clipped.
2. Full preview play: camera visibly calmer; at most 8 cuts total; L03–L04 is one continuous
   held angle.
3. **Re-render**: `node tools/render.js` then `node tools/assemble.js` → `render/final.mp4`;
   spot-check frames at each line start.

---

## Task 3 — Video hooks: 0.5 s intro title card + ~1 s "ادامه دارد" outro card

### Goal

The produced video must open with a **0.5 s blurred mid-scenario shot** carrying the episode
title, and end with a **~1 s blurred mid-scenario shot** carrying "ادامه دارد", then stop.
Implemented at assemble time (ffmpeg + pre-rendered card PNGs) so the audio pipeline, timing
files, and engine timeline stay untouched and the Persian text renders correctly (browser
shapes RTL properly; ffmpeg `drawtext` does not).

### 3.1 Data — `scenario.json`

Add a `hooks` block (data-driven, per-episode):

```json
"hooks": {
  "intro": { "duration": 0.5, "kicker": "این قسمت",
             "title": "نحوه برخورد با اسهال کودکان", "frameAt": 0.42 },
  "outro": { "duration": 1.0, "title": "ادامه دارد", "frameAt": 0.42 }
}
```

`frameAt` = fraction of the main video to grab the blurred background frame from
("شات از وسط سناریو").

### 3.2 New tool — `tools/make-hook-cards.js` (puppeteer, same style as `render.js`)

1. Start `tools/serve.js` server on a port, open a 1080×1920 page.
2. Pick the source frame: list `render/frames/f_*.png`, take
   `files[Math.floor(frameAt * files.length)]`.
3. Render each card as HTML: background image with `transform: scale(1.15)` +
   `filter: blur(16px)` (scale hides blurred edge vignette), dark veil `rgba(0,0,0,0.35)`,
   text in **Vazirmatn** via `@font-face` from `/src/lib/fonts/Vazirmatn-*.woff2`:
   - **intro**: kicker "این قسمت" (Regular ~52 px, soft teal `#4db6ac` chip or plain) above
     the title (Bold ~84 px, white, centered), block centered horizontally and positioned
     ~36–42 % from the top ("تقریبا وسط رو به بالای تصویر");
   - **outro**: "ادامه دارد" (Bold ~76 px, white) centered at ~46 % height.
4. Screenshot → `render/hook-intro.png`, `render/hook-outro.png`.

### 3.3 Assemble — `tools/assemble.js`

1. Encode the main video exactly as today but to **`render/main.mp4`** (frames + audio mix).
2. Build each card segment: `ffmpeg -loop 1 -t <dur> -i hook-*.png -f lavfi -t <dur>
   -i anullsrc=r=44100:cl=stereo` → libx264 `-crf 18 -preset medium -pix_fmt yuv420p -r FPS`
   + aac, so all three segments share codec parameters.
3. Concat (concat demuxer or `filter_complex concat=n=3:v=1:a=1`) → **`render/final.mp4`** =
   intro 0.5 s + main + outro 1.0 s (silent cards).

### 3.4 Docs + verify (Task 3 acceptance)

- README: note the hook step (`node tools/make-hook-cards.js` before assemble) in the pipeline.
- Checks: the two hook PNGs show correctly **shaped Persian text** over a blurred scene frame;
  `ffprobe render/final.mp4` duration ≈ `timing.total + 1.5`; first 0.5 s = title card,
  last 1.0 s = "ادامه دارد" card; main video audio/subtitles untouched.

---

## Execution order & final checklist

1. **Task 1** (room) → preview check.
2. **Task 2** (camera) → preview check → full `node tools/render.js` + `node tools/assemble.js`.
3. **Task 3** (hooks) → `node tools/make-hook-cards.js` + assemble → final `render/final.mp4`
   with intro/outro hooks.
4. Final review pass of `final.mp4`: all image items visible in the wide shots, door light
   brown, calm camera, hooks at both ends.
