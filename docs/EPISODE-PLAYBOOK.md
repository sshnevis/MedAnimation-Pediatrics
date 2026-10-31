# Episode Playbook — Repeatable Per-Episode Production Process

This is the self-improvement playbook: every new episode follows the same path, and each
episode's lessons get folded back into this document.

## The repeatable path

### Phase 0 — Source materials (user provides)
- Scenario text (`scenario/project N.txt`) — dialogue, preferably already diacritized for TTS.
- Visual reference (`scenario/project N.png`) — room/characters/cards reference.
- Direction guideline (`scenario/project N-todo.md`) — camera grammar, staging, cards.

### Phase 1 — Planning (a separate planning task; produces the implementation prompt)
1. Read all source files plus the ep01 `scenario.json` as the schema reference.
2. Produce `scenario/epNN-plan.md` containing:
   - Episode id/title, characters, room, target duration.
   - **Line breakdown table**: id (`L01…`), speaker, `display` (clean subtitle text),
     `tts` (diacritized, **verbatim** from the source file), shot name, staging notes.
     - Resolve speaker-label typos in the source (e.g. ep02's `مادر/دُکتُر` → doctor).
     - Narrator lines default to the doctor voice.
   - Shot mapping (3-camera grammar, axis discipline).
   - Room spec element-by-element from the reference PNG (the implementation session must
     verify 100% match via preview stills, not memory).
   - New engine features (shots / timeline flags / props / furniture types) — keep minimal
     and episode-agnostic.
   - Medical-safety constraints when applicable (never render dosage amounts; warning cards
     must not imply unsafe waiting).
   - Pipeline runbook + acceptance checklist.
3. Produce `scenario/epNN-implementation-prompt.md` — a self-contained prompt listing the
   files to read first, the work items, the runbook, and the required final report format.
4. Give the prompt to the user; implementation runs in a **separate task**.

### Phase 2 — Implementation (separate task)
1. Author `episodes/<id>/scenario.json` (schema = ep01's).
2. Build/extend room + props JSON in `library/`.
3. Extend `src/js/blocking.js` shots (or room `shots{}` override), `src/js/timeline.js` flags,
   `src/js/world.js` furniture types — minimally.
4. TTS + timing + subtitles:
   ```
   set ELEVENLABS_API_KEY=<key from api.txt>
   node tools/generate-voice-elevenlabs.js --ep <id>
   node tools/compute-timing.js             --ep <id>
   node tools/build-subtitles.js            --ep <id>
   ```
5. **Preview loop (mandatory)**: `node tools/preview-shots.js --ep <id>` → compare stills
   against the reference PNG → iterate room/props/shots until they match. QUALITY_RULES:
   always iterate against the reference image, never memory.
5b. **Z-fight gate (mandatory)**: `./tools/node24.cmd tools/zfight-diag.js --ep <id>` must
   print **PASS** (0 COPLANAR/NEAR pairs) before rendering — BUGFIX_RULES Rule 24. Run it
   again after ANY change to shared builders (`src/js/world.js`), for every episode that
   uses them.
6. Render + assemble:
   ```
   node tools/render.js            --ep <id>
   node tools/make-hook-cards.js   --ep <id>
   node tools/assemble.js          --ep <id>   # → episodes/<id>/render/final.mp4
   ```
7. Report the acceptance checklist as done/not-done with evidence.

### Phase 3 — Retrospective (self-improvement)
After each episode, append lessons learned to this file (below) and, where general, to
`BUGFIX_RULES.md` / `QUALITY_RULES.md`.

## Lessons learned (append per episode)

### From ep01 (childhood diarrhea)
- **TTS**: use ElevenLabs `eleven_v3` for Persian (`eleven_multilingual_v2` does NOT support
  Persian; `eleven_flash_v2_5` also works). One mp3 per line, named `<line-id>.mp3`.
- **Timing**: always derive real timing from TTS audio via `compute-timing.js` (ffprobe);
  never trust scripted advisory durations.
- **Rendering**: deterministic headless render through `window.__seek(t)`; camera near=1 /
  far=300; no coplanar box faces (≥0.1 clearance); disable cast/receiveShadow on thin strips.
- **Visual QA**: iterate `preview-shots` stills against the reference PNG; poster labels are
  baked via `textSprite`; keep close-up face contrast.
- **Subtitles**: per-speaker colors come from `library/characters/<id>.json` `subtitleColor`.
- **Structure**: shared library (`library/`) + per-episode folders (`episodes/<id>/`) means a
  new episode should require **no engine-code changes** ideally; when engine changes are
  needed, keep them episode-agnostic and driven by data flags.

### Known issues to watch
- ~~`src/js/blocking.js` `buildShots()`: the `roomDef.shots` merge block sits after
  `return shots;` (dead code)~~ — FIXED in ep02.
- Camera-axis discipline: hold doctor on one side / family on the other across all shots;
  never cut across the axis without an intermediate framing.

### From ep02 (child fever)
- **buildShots dead-code fix**: `return {…}` followed by unreachable merge code was replaced
  with `const shots = {…}` + merge + return. Room JSON `shots{}` now works — declare ALL
  episode shots there instead of editing blocking.js per episode.
- **Card flags pattern**: full-frame graphic cards (danger/infant/dose) are DOM overlays;
  the plan entry carries a boolean flag and the card *content* lives on the scenario line —
  do not duplicate config in staging.plan.
- **Card config lookup bug**: reading card config from the plan flag (boolean `true`) does
  not throw on property access (primitive boxing) — it silently produces empty card text.
  Always resolve config via `scenario.lines.find(x => x.id === p.id)`.
- **Guard optional prop packs**: world.js built the explainer tray/water/warning/heart
  unconditionally and crashed when a pack (fever-props) omitted them. Every prop family is
  now guarded; new episodes can ship minimal prop packs.
- **Close-up distances**: at fov 52 vertical, a head-and-shoulders needs ~35–40 units of
  camera-to-subject distance; 15–20 units fills the frame with the torso (took 3 iterations).
- **Room shots in JSON**: static camera coordinates in the room JSON iterate exactly like
  ep01's code-derived shots and keep the engine untouched per episode.
- **api.txt format**: the ElevenLabs key sits on line 2 (line 1 is the label
  `elevenlabs.io`); strip CR/LF before exporting ELEVENLABS_API_KEY.
- **Serve-root gotcha**: `serve.js` rejects paths when `root` uses forward slashes on
  Windows (`path.join` normalizes to backslashes → `startsWith` fails → 403). Always pass
  the resolver's `ROOT` (backslash form), not a hand-built forward-slash path.
- **Camera facing vs. seat facing (L02 iteration)**: the family sits facing the doctor
  (−Z), so a camera parked on +Z in front of them captures the mother's back — the
  first `family-two-shot` attempt failed this way. Family shots with faces visible go
  on the doctor's side of the axis; verify character facing before choosing a camera
  position, and check the preview still (a back-of-head reads immediately).
- **Desk-prop scale**: props popping onto the desk at scale 1 read oversized next to a
  seated character (the medicine insert took user markup twice). World-space desk
  inserts pop at **0.5** (`timeline.js pop(..., 0.5)`); size new desk props against a
  seated character in a preview still before showing the user.
- **Iterative prop resizing**: the desk monitor needed two "bigger + further out"
  rounds (6×4 → 8×5.4 → 12×8, edge z 0.5 → 5.6). When a user marks a prop in a
  screenshot, apply their markup literally (units matter to them) and re-render the
  exact frames they referenced before replying.

### Hook-card rules (ep02 fix — apply to every episode)
- **`page.setContent()` is a null-origin page**: root-relative URLs (`/episodes/...`,
  `/src/lib/fonts/...`) cannot resolve there, and cross-origin font/image fetches from a
  null origin are blocked without CORS. Symptom: hook card renders **black with a fallback
  font** (exactly what ep02's first cards looked like vs ep01's fixed ones).
  Fix (now in `make-hook-cards.js`): embed the background frame and the Vazirmatn woff2
  files as **`data:` URLs** — the card HTML is fully self-contained, no server/CORS.
- **Never trust a hook card without opening the PNG**: after `make-hook-cards.js`, view
  `render/hook-intro.png` / `hook-outro.png` — verify (a) blurred in-scene background is
  visible, (b) text is shaped in Vazirmatn (not Tahoma fallback). Then run assemble.
- **Hook durations**: intro 0.5 s, outro **1.0 s** (`hooks.outro.duration` in
  scenario.json — verify the value, don't assume; the user wants the outro at 1 s).
