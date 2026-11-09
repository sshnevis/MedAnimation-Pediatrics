# Episode Playbook — Repeatable Per-Episode Production Process

This is the self-improvement playbook: every new episode follows the same path, and each
episode's lessons get folded back into this document.

**Current ep03 continuation:** use `scenario/ep03-final-review-prompt.md`, not the
original implementation prompt. The rendered episode already exists; its next
session is a final review, not fresh TTS generation or reconstruction.

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
     - Narrator lines default to the doctor voice; they do not require a visible rig.
     - Source dialogue outranks a conflicting planning-table transcription. Compare
       diacritized TTS byte-for-byte (or with hashes); record any deliberate change.
       Estimated duration is advisory, not permission to cut or accelerate the text.
   - Shot mapping (3-camera grammar, axis discipline).
   - Room spec element-by-element from the reference PNG, verified through actual
     preview comparisons rather than memory. Define concrete acceptance criteria;
     record portrait/voxel adaptation and intentional medical-safety deviations
     instead of promising unsupported pixel-identical or 100% photo matching.
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
   First inventory existing audio. Validation must not trigger paid regeneration;
   preserve approved files and regenerate only explicitly approved affected lines.
   Never print/copy credentials into logs or handoff documentation. On this Windows
   setup resolve Node 24+ through `tools/node24.cmd`, not a previous agent's path.
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
6. **Sound design (mandatory)**: use the SFX library at `tools/Sound pack SFX/`
   (catalog + usage guide: `tools/Sound pack SFX/SOUND-CATALOG.md`). During scene
   construction map timeline moments to sounds (ambience bed per scene, whoosh on shot
   cuts / card pops, UI tones on hook & danger cards, foley synced to on-screen actions);
   anything not baked in is applied in the final edit over `final.mp4`. Follow the
   catalog's mixing levels (ambience −30…−24 dB, whoosh −18…−12 dB, UI −14…−10 dB,
   impacts −10…−6 dB) and never let music/SFX compete with TTS dialogue.
   Measure each source with `ffmpeg volumedetect` before choosing gain, then measure
   the post-gain asset and audio-only mix. Record both mean and peak dBFS and state
   the target metric: ep03 uses mean for ambience and peak for short accents.
   A linear gain such as `1.4` is not a level in dB. Keep episode sound generation
   local and reproducible; use `spawnSync`/`execFileSync` argument arrays without
   a shell. Do not change shared assembly merely to author an episode's sounds.
7. Render + assemble:
   ```
   node tools/render.js            --ep <id>
   node tools/make-hook-cards.js   --ep <id>
   node tools/assemble.js          --ep <id>   # → episodes/<id>/render/final.mp4
   ```
8. Probe and completely decode the encoded final audio/video, inspect hook PNGs,
   and record the artifact hash alongside results. Compare console findings against
   the affected baseline rather than silently suppressing them.
9. Report each acceptance criterion as done / pending review / not done with
   evidence. Separate data, geometry/runtime, visual/medical, encoded-media and
   perceptual listening/artistic gates (QUALITY_RULES Q16). Never label meters or
   error-free decoding as a completed listening review.

### Phase 3 — Retrospective (self-improvement)
After each episode, append lessons learned to this file (below) and, where general, to
`BUGFIX_RULES.md` / `QUALITY_RULES.md`.

### Phase 4 — Handoff and economical follow-up

Create `scenario/epNN-<next-task>-prompt.md` when work continues in another session.
Include the current artifact/status, authoritative files, concrete remaining work,
known baseline findings, exact validation commands and pending human decisions.
Keep the original implementation prompt as history; prominently link the current
continuation to avoid accidental rebuilds or repeat TTS billing.

Before replacing an approved final file, copy it to a backup outside `frames/`.
Do not delete user artifacts or historical evidence during QA. Recompute evidence
for changed artifacts; annotate old findings instead of rewriting their results.

| What actually changed | Minimum rebuild scope |
|---|---|
| Documentation only | Check Markdown paths/consistency; no media rebuild |
| Sound levels/assets/hits only, unchanged duration | Rebuild sound as needed, assemble, probe/decode and listen |
| Hook design/background only | Rebuild hook cards, inspect them, assemble and probe/decode |
| Geometry, pose, camera or visual effect | Targeted preview + deterministic/geometry gates, then full render and assembly |
| Dialogue duration / timing | Revalidate subtitles, cues, sound, frames and hooks; rebuild affected dependencies |
| Shared builder or rig | Also run legacy episode previews and z-fight gates |

For the existing `render.js`, `--from` means render from that frame **to the end**;
it is not a bounded patch-render command. Do not reuse later frames from an old
visual timeline accidentally. Broader engine refactoring and episode scaffolding
belong to separately scoped work, not a final-review cleanup.

## Lessons learned (append per episode)

### From ep01 (childhood diarrhea)
- **TTS**: use ElevenLabs `eleven_v3` for Persian (`eleven_multilingual_v2` does NOT support
  Persian; `eleven_flash_v2_5` also works). One mp3 per line, named `<line-id>.mp3`.
- **Timing**: always derive real timing from TTS audio via `compute-timing.js` (ffprobe);
  never trust scripted advisory durations.
- **Rendering**: deterministic headless render through `window.__seek(t)`; camera near=1 /
  far=300; no coplanar box faces; use the later Rule 24 minimum **≥0.35 world units**
  for visible same-facing overlapping faces (supersedes early ≥0.1 guidance).
  Disable cast/receiveShadow on thin strips.
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
- **Audio concat layout mismatch**: hook cards (re-encoded separately) and `main.mp4` MUST
  have identical audio params (channels/layout/sample rate) — `-c copy` concat silently
  produces a stream many players fail to decode (voices "cut"). assemble.js now forces
  stereo (`-ac 2`) on the mix, the cards, and `anullsrc=cl=stereo` everywhere. Keep this
  invariant if the pipeline changes.
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

### From ep03 (baby sleep) — implementation / sound handoff

Later production status: `episodes/ep03-baby-sleep/PRODUCTION.md` supersedes the
pending render/assembly status in this historical handoff. Final MP4 is encoded
and fully decoded; human artistic/listening acceptance remains separate.

- **Status separation:** source/audio validation and sound-build validation are
  distinct from rendered QA. The current main audio timeline is **153.64 s**
  (19 lines, including lead-in/gaps/final hold); the 0.5 s / 1.0 s hooks would add
  another 1.5 s. Do not claim final rendering, visual acceptance or final listening
  has passed until the coordinator supplies that evidence. The episode-local
  `SCENARIO-CONTRACT.md` records the earlier data/audio handoff, not current
  implementation acceptance; this section records the later sound implementation.
- **Reproducible artifacts:** run
  `tools\node24.cmd episodes/ep03-baby-sleep/build-sound.cjs` from the repo root.
  `tools/node24.cmd` resolves Node 24+ with `tools/resolve-node24.ps1`; do not use
  the old system Node or hardcode another user's agent-version path. The builder
  reads current `scenario.json` / `timing.json`, measures four catalog sources,
  and produces six derived WAVs, two full-length audio-only previews, `sound.json`
  and `sound-report.json`. No TTS regeneration, API credentials or network access
  is needed. All child ffmpeg/ffprobe calls use argument arrays and `shell: false`.
  The shared assembler is unchanged.
- **Inventory:** 10 ambience segments + 19 hits: 10 whooshes, one L04 wiggle/hug,
  five forbidden-item pops (two L11, three L12), and three L19 bullet UI clicks
  at `start + duration * [0.2, 0.4, 0.68]`. There are no hook sounds, impact
  sounds or music in this sound spec. Rebuild sound after any timing/text change.
- **Cue parity:** remove Persian diacritics from **both TTS and cue** before
  `indexOf`; divide that index by **display length**, matching the coordinator.
  Approximate cue time = `line.start + index / display.length * line.duration`.
  L03 entry = `min(cueTime, line.end - 2.8)`; return = entry + **2.5 s** within
  L03. Current L03 entry/return: **14.392308 / 16.892308 s**. L10's `تخت مستقل`
  entry: **69.403333 s**. Whooshes also mark L11's nursery-wide → crib-close cut
  and L13/14/15/16/17/19 room switches. L11 does not restart nursery ambience.
  All sound times are on the main timeline, **excluding** the intro hook.
  Text-position timing is not word alignment: coordinator listening is mandatory.
- **Honest provenance / medical restraint:** clinic reuses ep02 conversation
  murmur at mixer gain **1.4** via a level-conditioned catalog derivative. Nursery
  tone is that same murmur filtered twice at 180 Hz to remove speech detail,
  not music or a claimed nursery field recording. L04's fabric-like wiggle is a
  filtered **Paper Foley Paper Rattle** excerpt, not recorded cloth or a cry.
  The fall has entry/return air whooshes only: no thud, injury, panic stinger or
  first-aid sound. Do not add impacts merely because the source describes a fall.
- **Measured levels, not guessed gains:** raw murmur = **−44.0 dBFS mean**;
  gain 1.4 alone gives approximately **−41.1 dBFS**, not the requested ambience
  range. The builder conditions and normalizes a derivative before applying that
  fixed mix gain. Actual post-gain clinic/nursery means are **−27/−29 dBFS**;
  whoosh / item pop / bullet peaks are **−16/−14/−12 dBFS**; foley peak is
  **−25 dBFS**. Report mean **and** peak for each source and output: transient
  RMS is not interchangeable with peak, nor are these LUFS measurements.
  Keep TTS at unity and confirm perceptual speech dominance during final listening.
- **Assembler parity:** the local audio-preview graph mirrors shared assembly's
  volume → delay → fade → trim order and `amix:normalize=0`. Room changes use
  0.3 s overlapping fades; first/last beds fade over 1 s. Bed `end` is an absolute
  main-timeline time, not a source duration. Assets and previews are 48 kHz stereo;
  preview files stay under `audio/sfx/`, never overwrite render/coordinator output.
- **Evidence and pending gates:** `sound-report.json` records source hashes,
  input hashes, exact filters/child-process commands, cue fractions, cuts, mean
  and peak readings, counts and audio-only checks. The full preview is exactly
  **153.640000 s**, peak **−2.5 dBFS**; sampled dialogue-gap ambience means are
  **−27.2 dBFS** clinic / **−28.5 dBFS** nursery. Coordinator must listen to
  `audio/sfx/mix-preview.wav`, check cue sync against rendered cuts, source-loop
  seams, final crib safety, four subtitle colors, narrator behavior, hook PNGs,
  z-fight/framing gates and final MP4 playback. Only then run/accept
  `tools\node24.cmd tools/assemble.js --ep ep03-baby-sleep` as the final assembly;
  an audio-only pass does **not** complete final render QA.

### Ep03 final production lessons

- **Attachments need a visual test:** a mathematically valid held transform initially
  showed the back of the infant's head. Verify face visibility and hand occlusion in
  the actual mother/baby close-up, not only transform assertions. Cradle palms flatten
  only while carrying; adult hand scale resets on every pose update.
- **Secondary scenes stay opt-in:** `room-inserts.js` preloads only a declared insert
  room before the synchronous boot/render-ready path, then reconstructs room,
  camera, attachment, teaching objects and overlays from the requested frame time.
  Preload errors are rethrown inside timeline construction so the existing boot
  error UI still works. `main.js` and rendering tools did not need changes.
- **Overhead framing needs both complete beds:** portrait aspect clipped the original
  camera. Re-check the full parents' bed, independent crib and gap after changing
  furniture sizes. The finished two-bed composition uses the same coordinates as
  the crib anchor and flashback bed-edge anchor.
- **Test reverse seeks with pixels:** ep03's `visual-qa.cjs` samples 15 teaching states,
  verifies narrator/color/bullet/empty-crib behavior and hashes screenshots after
  forward/backward/random seeks. Callback-only state is not sufficient for inserts.
- **Technical delivery is not artistic/listening acceptance:** the final file is
  1080×1920, nominal 30fps, stereo AAC, 155.163220s, with a full error-free decode.
  Gates passed for ep01/02/03. The old favicon and two nullable wainscot-add console
  errors were reproduced in ep02 and classified, not hidden or fixed out of scope.
  Exact photo matching and full perceptual listening remain human review tasks;
  see `episodes/ep03-baby-sleep/PRODUCTION.md` for the complete acceptance matrix.
