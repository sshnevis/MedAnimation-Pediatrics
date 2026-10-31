# Medical Voxel Animation — Doctor Visit Explainer

Voxel (Minecraft-style) 3D explainer videos built with **HTML5 + Three.js + GSAP**,
voiced with **TTS**, subtitled in Persian, and rendered to **vertical MP4 (1080×1920, 9:16 Reels)**.

This is a **multi-episode** project: one shared asset **library** (characters, rooms,
props) reused by every **episode** under `episodes/`. Complete episodes:

- **Episode 1** — `ep01-childhood-diarrhea` (~63 s, 9 dialogue lines between a doctor,
  a mother, and her 5-year-old son) → `episodes/ep01-childhood-diarrhea/render/final.mp4`.
- **Episode 2** — `ep02-child-fever` «نحوه برخورد با تب در کودکان» (~97 s, 16 dialogue
  lines, same cast) → `episodes/ep02-child-fever/render/final.mp4`.

> **Starting a new episode?** Follow `docs/EPISODE-PLAYBOOK.md` — the repeatable
> per-episode process (planning artifacts → implementation prompt → pipeline → QA loop
> → retrospective).

---

## Project structure

```
library/                          ← SHARED across all episodes
  characters/<id>.json            voxel character definitions (label, subtitleColor, parts, colors, features)
  room/<id>.json                  room layout: size, palette, door/window, furniture, blocking marks
  room/FLOORPLAN.md               floor-plan documentation
  props/<pack>.json               explainer prop packs (foods, heart, ORS, warning…)

episodes/<ep-id>/                 ← one folder per episode
  scenario.json                   the episode: title, cast/room/props wiring, dialogue
                                  (display + diacritized tts), hooks, endCard, staging
  timing.json                     (generated) per-line start/end
  subtitles.srt                   (generated)
  audio/L*.mp3                    (generated) one file per dialogue line
  render/                         (generated) frames, preview stills, main.mp4, final.mp4, hook cards

src/                              ← engine (episode-agnostic)
  js/voxel.js                     box/limb/label builders + buildCharacter(def)
  js/characters.js                per-frame pose updates (pure functions of timeline time)
  js/world.js                     room + furniture + prop builders; clock/heart per-frame updates
  js/blocking.js                  marksFromRoom() + buildShots() (room JSON may override shots)
  js/timeline.js                  master GSAP timeline — driven by scenario.json → "staging"
  js/audio.js                     per-line audio playback (silent in render mode)
  js/main.js                      boot: ?ep=<id> → load episode + library, scene, lights, UI, render loop

tools/                            ← pipeline (all accept --ep <episode-id>, or EP env var)
config/voices.json                TTS voice settings (ElevenLabs + Edge), keyed by speaker id
docs/EPISODE-PLAYBOOK.md          the repeatable per-episode production process + lessons log
scenario/                         source materials (project N.txt/.png/.md) + per-episode
                                  planning artifacts (epNN-plan.md, epNN-implementation-prompt.md)
```

### How an episode wires itself to the library

`episodes/<ep>/scenario.json` declares:

- `"location": "visit-room"` → loads `library/room/visit-room.json`
- `"characters": ["doctor", "mother", "child"]` → loads each `library/characters/<id>.json`
- `"props": ["explainer-props"]` → loads + merges `library/props/<pack>.json`

…and a `"staging"` section describing the choreography (all optional; sensible
defaults apply when omitted):

- `initial` — start position / sit / facing per character (mark names from the room)
- `openDoor`, `walkIn` (per character: dest mark, start, duration), `faceAfterWalk`, `wave`
- `plan` — per dialogue line: camera `shot` (from `blocking.js` / room `shots`) plus
  effect flags the engine knows: `foods`, `warning`, `heart`, `nod`
- `ending` — end-card lead-in, camera push, fade timing

Per line, `"settleAfter"` (seconds) adds a pause after that line — e.g. after an
opening line whose walk-in must finish before the next line starts.

## Adding episode N (recipe)

0. **Plan first** (per `docs/EPISODE-PLAYBOOK.md`): read the source materials in
   `scenario/project N.*`, write `scenario/epNN-plan.md` (line breakdown with verbatim
   diacritized `tts`, shot mapping, room spec vs. reference PNG, new engine features,
   runbook, acceptance checklist) and `scenario/epNN-implementation-prompt.md`, then run
   the implementation as a separate task using that prompt.
1. `episodes/epNN-<slug>/scenario.json` — copy ep01 as template: new `id`, `title`,
   `subtitle`, `hooks`, `endCard`, `lines` (display + diacritized `tts`), and a new
   `staging` plan. Reuse the same `location`/`characters`/`props` if the episode
   reuses the room and cast — **no library changes needed**.
2. New room? Add `library/room/<id>.json` (copy visit-room.json; optionally give it
   its own `shots` map for custom cameras). New character? Add
   `library/characters/<id>.json`. New objects? Add a prop pack
   `library/props/<pack>.json` — geometry for a new prop id means one new `case`
   in `world.js`'s food/prop builder switch.
3. Voice per speaker lives in `config/voices.json` (shared; add a key for any new speaker).
4. Pipeline (from the repo root):
   ```
   node tools/generate-voice-elevenlabs.js --ep epNN-<slug>     # then set ELEVENLABS_API_KEY
   node tools/compute-timing.js --ep epNN-<slug>
   node tools/build-subtitles.js --ep epNN-<slug>
   node tools/preview-shots.js   --ep epNN-<slug>               # framing check
   node tools/render.js          --ep epNN-<slug>
   node tools/make-hook-cards.js --ep epNN-<slug>
   node tools/assemble.js        --ep epNN-<slug>               # → episodes/<ep>/render/final.mp4
   ```
5. Preview in browser: `node tools/serve.js` →
   `http://127.0.0.1:8090/src/index.html?ep=epNN-<slug>` (or just run `Run.bat`).
6. **Z-fight gate (mandatory before rendering)**:
   `./tools/node24.cmd tools/zfight-diag.js --ep epNN-<slug>` must print **PASS**
   (BUGFIX_RULES Rule 24). Fix every COPLANAR/NEAR pair it lists, or the video
   will show the crawling/jumping "پرش تصویر" artifacts again.

## Pipeline (4 steps)

```
scenario.json ──► voices (episodes/<ep>/audio/L01..Lnn.mp3) ──► timing.json + subtitles.srt
                                                                      │
        GSAP timeline (browser preview) ◄─────────────────────────────┘
                      │
        tools/render.js  (headless Chrome, frame-by-frame PNGs)
                      │
        tools/make-hook-cards.js  (blurred mid-frame + Persian title/outro PNGs)
                      │
        tools/assemble.js (ffmpeg: intro + main + outro → episodes/<ep>/render/final.mp4)
```

Everything is driven by data files, so a **new episode = new `scenario.json`**
(same characters/room) plus optionally new entries in the library.

### 1) Generate voices (pick one)

**Option A — ElevenLabs (production quality, Persian supported by `eleven_flash_v2_5` and `eleven_v3`):**
1. Put voice IDs in `config/voices.json` → `elevenlabs.voices.*` (from elevenlabs.io → Voices).
2. `set ELEVENLABS_API_KEY=sk_...` (Git Bash: `export ELEVENLABS_API_KEY=sk_...`)
3. `node tools/generate-voice-elevenlabs.js --ep <ep>`

Note: do **not** use `eleven_multilingual_v2` — it does not include Persian.

**Option B — free Microsoft Edge neural voices (draft quality):**
```
pip install edge-tts
python tools/generate-voice-edge.py --ep <ep>
```
Voice/pitch per speaker (child gets +40Hz pitch) is in `config/voices.json` → `edge`.

### 2) Recompute timing + subtitles (after audio exists)
```
node tools/compute-timing.js --ep <ep>     # measures real MP3 durations via ffprobe, falls back to estimates
node tools/build-subtitles.js --ep <ep>    # writes episodes/<ep>/subtitles.srt
```

### 3) Preview
```
node tools/serve.js              # http://127.0.0.1:8090/src/index.html?ep=<ep>
```

### 4) Render + assemble the MP4
```
npm install                      # puppeteer (requires Node 18+)
node tools/render.js --ep <ep>             # writes episodes/<ep>/render/frames/*.png (deterministic seeks)
node tools/make-hook-cards.js --ep <ep>    # blurred mid-scenario frame + Persian intro/outro cards
node tools/assemble.js --ep <ep>           # mixes audio, encodes main.mp4, concats hooks → final.mp4
```

Hook cards are driven by `scenario.json` → `hooks` (intro 0.5 s title card, outro ~1 s
«ادامه دارد»). `hooks.intro.frame` picks the background frame by absolute frame
number; `frameAt` (0..1 of the film) is the fallback. Text is shaped in the browser
with Vazirmatn; assemble wraps the cards as silent clips around the main video.
Subtitles are already baked into the captured frames (HTML overlay), and
`subtitles.srt` is provided separately for platforms.

Requirements: **ffmpeg** on PATH (`winget install Gyan.FFmpeg`) and **Node ≥ 18**
for puppeteer (the current shell has Node 12 — install newer Node or run the render
step from an updated terminal; `Run.bat`/`tools/node24.cmd` handle this).

## Adjusting the look

- **Floor plan / entry / sit marks:** `library/room/visit-room.json` → `blocking`
  (also documented in `library/room/FLOORPLAN.md`). Room is **110×90**.
- **Cameras:** derived from those marks in `src/js/blocking.js` → `buildShots()`;
  a room JSON may override/add via its `shots` section.
- **Who does what / when:** the `staging.plan` array in `episodes/<ep>/scenario.json`.
- **Characters:** `library/characters/*.json` (subtitle color: `subtitleColor`).
- **Format:** `ASPECT` in `src/js/main.js` (`9/16`) and viewport in `tools/render.js`.

## Episode 1 notes

- Voices generated with ElevenLabs `eleven_v3` (George / Sarah / Jessica) →
  `episodes/ep01-childhood-diarrhea/audio/L01..L09.mp3`.
- Timing ~63s includes a 1.9 s settle after L01 (`settleAfter`) so the walk-in
  finishes before the mother speaks.

## Episode 2 notes

- `ep02-child-fever` — «نحوه برخورد با تب در کودکان» (~97 s, 16 dialogue lines,
  same cast: doctor / mother / child). New room
  `library/room/pediatric-visit-room.json` rebuilt 1:1 against
  `scenario/project 2.png` (warm walls + gray tile wainscot, left window with
  white curtain, teal cabinets with white drawers, giraffe growth chart, wall
  clock, teddy poster «سلامت کودکان»).
- New prop pack `library/props/fever-props.json` (amber acetaminophen bottle +
  dropper + water cup + pill/suppository). **Medical safety: no dosage amount is
  rendered anywhere** — the L16 line points to the caption.
- New episode-agnostic timeline flags: `medicineInsert` (world-space desk insert),
  `dangerCard` / `infantCard` / `doseCard` (full-frame DOM cards; danger items
  appear sequentially). Card *config* lives on the scenario **line**, the plan
  entry carries a boolean flag.
- `blocking.js buildShots()` now applies the room JSON `shots` override (the
  dead-code merge after `return` was fixed); ep02's shots are declared entirely
  in the room JSON. User-directed shot reworks: L02 uses `family-two-shot`
  (mother+child from the doctor's side of the axis) and L12's `close-mother` is
  an over-the-family angle (backs to camera, doctor facing lens).
- Rooms with a side window (`window.side === "left"`) get a cool directional
  window-light wash in `main.js` (`#ddf2ff`, 0.75, no castShadow).
- The medicine insert pops at **0.5 scale** and the desk monitor is 12×8 at the
  desk's outer edge (user markup) — size desk props against a seated character.
- L13 speaker label in the source (`مادر/دُکتُر`) was a typo — it is the doctor.
  L16 (narrator) is voiced with the doctor voice.
