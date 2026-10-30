# Medical Voxel Animation — Doctor Visit Explainer

Voxel (Minecraft-style) 3D explainer videos built with **HTML5 + Three.js + GSAP**,
voiced with **TTS**, subtitled in Persian, and rendered to **vertical MP4 (1080×1920, 9:16 Reels)**.

Current episode: **ep01 — Childhood diarrhea nutrition consultation** (`scenario.json`),
~57 seconds, 9 dialogue lines between a doctor, a mother, and her 5-year-old son.

---

## Current status (end of first working session)

| Piece | State |
|---|---|
| Scenario (dialogue + diacritized TTS text) | ✅ `scenario.json` |
| Reusable character definitions (JSON) | ✅ `assets/characters/{doctor,mother,child}.json` |
| Reusable room definition | ✅ `assets/room/visit-room.json` |
| Reusable explainer props (foods, heart, ORS…) | ✅ `assets/props/props.json` |
| 3D scene (voxel room, characters, props, shadows) | ✅ renders and verified in browser |
| GSAP master timeline (walk-in, sitting, talking, camera shots, subtitles, end card) | ✅ working, seekable |
| Vertical 9:16 format | ✅ canvas + renderer switched to portrait; shot framing needs fine-tuning |
| Estimated timing (no audio yet) | ✅ `timing.json` (56.7s total), `subtitles.srt` (15 cues) |
| Voice audio | ⬜ not generated yet — needs ElevenLabs key **or** free Edge TTS |
| Final MP4 render | ⬜ needs ffmpeg + Node 18+ (see "Next steps") |

**Preview (verified working):** run `node tools/serve.js` then open
<http://127.0.0.1:8090/src/index.html> — press ▶ پخش. It plays silently until voice
files exist in `audio/`.

---

## Pipeline (4 steps)

```
scenario.json ──► voices (audio/L01..L09.mp3) ──► timing.json + subtitles.srt
                                                      │
        GSAP timeline (browser preview) ◄─────────────┘
                      │
        tools/render.js  (headless Chrome, frame-by-frame PNGs)
                      │
        tools/make-hook-cards.js  (blurred mid-frame + Persian title/outro PNGs)
                      │
        tools/assemble.js (ffmpeg: intro + main + outro → render/final.mp4)
```

Everything is driven by data files, so a **new episode = new `scenario.json`**
(same characters/room) plus optionally new entries in the asset JSONs.

### 1) Generate voices (pick one)

**Option A — ElevenLabs (production quality, Persian supported by `eleven_flash_v2_5` and `eleven_v3`):**
1. Put voice IDs in `config/voices.json` → `elevenlabs.voices.*` (from elevenlabs.io → Voices).
2. `set ELEVENLABS_API_KEY=sk_...` (Git Bash: `export ELEVENLABS_API_KEY=sk_...`)
3. `node tools/generate-voice-elevenlabs.js`

Note: do **not** use `eleven_multilingual_v2` — it does not include Persian.

**Option B — free Microsoft Edge neural voices (draft quality):**
```
pip install edge-tts
python tools/generate-voice-edge.py
```
Voice/pitch per speaker (child gets +40Hz pitch) is in `config/voices.json` → `edge`.

### 2) Recompute timing + subtitles (after audio exists)
```
node tools/compute-timing.js     # measures real MP3 durations via ffprobe, falls back to estimates
node tools/build-subtitles.js    # writes subtitles.srt
```

### 3) Preview
```
node tools/serve.js              # http://127.0.0.1:8090/src/index.html
```

### 4) Render + assemble the MP4
```
npm install                      # puppeteer (requires Node 18+)
node tools/render.js             # writes render/frames/*.png (deterministic seeks)
node tools/make-hook-cards.js    # blurred mid-scenario frame + Persian intro/outro cards
node tools/assemble.js           # mixes audio, encodes main.mp4, concats hooks → final.mp4
```

Hook cards are driven by `scenario.json` → `hooks` (intro 0.5 s title card, outro ~1 s
«ادامه دارد»). Text is shaped in the browser with Vazirmatn; assemble wraps the cards
as silent clips around the main video.
Subtitles are already baked into the captured frames (HTML overlay), and
`subtitles.srt` is provided separately for platforms.

Requirements: **ffmpeg** on PATH (`winget install Gyan.FFmpeg`) and **Node ≥ 18**
for puppeteer (the current shell has Node 12 — install newer Node or run the render
step from an updated terminal).

---

## File map

```
scenario.json            dialogue: display text, diacritized tts text, camera shot, action notes
timing.json              (generated) per-line start/end; source: "measured" | "estimated"
subtitles.srt            (generated)
audio/L*.mp3             (generated) one file per dialogue line
assets/characters/*.json voxel character definitions: proportions, colors, features (hijab, coat…)
assets/room/*.json       room layout: size, palette, door/window, furniture list
assets/props/*.json      explainer props: food tray items, heart, warning sign, labels
config/voices.json       TTS voice settings for ElevenLabs and Edge
src/index.html           stage, subtitle box, end card, HUD, start overlay
src/css/style.css        portrait-first styling (vmin-based sizes for 9:16)
src/js/voxel.js          box/limb/label builders + buildCharacter(def)
src/js/characters.js     per-frame pose updates (pure functions of timeline time)
src/js/world.js          room + furniture + props builders; clock/heart per-frame updates
src/js/timeline.js       SHOTS camera table + master GSAP timeline (blocking, subtitles, audio)
src/js/audio.js          per-line audio playback (silent in render mode)
src/js/main.js           boot: load JSONs, scene, lights, rigs, UI, render loop, ?render=1 mode
tools/serve.js           zero-dependency static server (also used by render.js)
tools/compute-timing.js  durations → timing.json
tools/build-subtitles.js timing + scenario → subtitles.srt
tools/generate-voice-elevenlabs.js / generate-voice-edge.py
tools/render.js          puppeteer frame capture (1080×1920 viewport)
tools/assemble.js        ffmpeg audio mix + MP4 encode
```

## Adjusting the look

- **Floor plan / entry / sit marks:** `assets/room/visit-room.json` → `blocking`
  (also documented in `assets/room/FLOORPLAN.md`). Room is **110×90**.
- **Cameras:** derived from those marks in `src/js/blocking.js` → `buildShots()`.
- **Who does what / when:** the `plan` array in `src/js/timeline.js`.
- **Characters:** `assets/characters/*.json`.
- **Format:** `ASPECT` in `src/js/main.js` (`9/16`) and viewport in `tools/render.js`.
- **Preview frames:** `node tools/preview-shots.js` → `render/preview/*.png`.

## Current session notes

- Voices generated with ElevenLabs `eleven_v3` (George / Sarah / Jessica) → `audio/L01..L09.mp3`.
- Timing ~63s includes a settle pause after L01 so walk-in finishes before mother speaks.
- Next: you confirm framing in the browser, then we install ffmpeg and assemble MP4.
