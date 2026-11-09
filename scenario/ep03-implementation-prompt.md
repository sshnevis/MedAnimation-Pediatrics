# Implementation Prompt — Episode 3 (paste this into the new task)

The text below is the original implementation prompt, preserved as history.
**Episode 3 has now been implemented and rendered. For continuation use
`scenario/ep03-final-review-prompt.md`; do not rerun initial construction or paid
TTS generation merely because this historical prompt requests them.**
See `episodes/ep03-baby-sleep/PRODUCTION.md` for the current delivery status.

---

Implement Episode 3 of our medical voxel animation series: **«خواب ایمن نوزاد»** (Safe Infant Sleep).

**Read these first, in order, before writing any code:**
1. `scenario/ep03-plan.md` — the approved plan you MUST follow exactly (line breakdown L01–L19 with verbatim diacritized `tts` text, shot mapping, nursery room spec, new effect flags, new characters, medical-safety constraints, runbook, acceptance checklist, and §9 default decisions).
2. `scenario/project 3.txt` — source dialogue (already diacritized) + final medical corrections + ending visual suggestion.
3. `scenario/project 3.png` — visual reference for the nursery room.
4. `episodes/ep02-child-fever/scenario.json` — the exact scenario.json schema to follow.
5. `README.md`, `QUALITY_RULES.md`, `BUGFIX_RULES.md`, `docs/EPISODE-PLAYBOOK.md`.

**Work items:**

1. **Scenario**: author `episodes/ep03-baby-sleep/scenario.json` following the ep02 schema exactly — 19 lines per plan §2 (L01…L18 dialogue + L19 endCard narration in the doctor voice); `display` = clean subtitle text, `tts` = diacritized text copied verbatim from `project 3.txt`; hooks (intro/outro), staging with per-line flags, endCard bullets verbatim from the source's «نوشته پایانی».
2. **Characters**:
   - `library/characters/father.json` — new adult male (reuse the existing adult rig pattern; distinct outfit + orange subtitle color).
   - `library/characters/baby.json` — new 2-month-old infant (much smaller proportions, oversized head, no walking); must support a `held` pose (in mother's arms, with wiggle/cry animation) and a `lying` pose (on its back in the crib, gentle sleep-breathing). Implement episode-agnostically in `src/js/characters.js` / `src/js/voxel.js` (pose hooks driven by character-def fields, like existing pose presets).
3. **Room (user requirement — 100% match to `project 3.png` + parents' bed)**: create `library/room/nursery-bedroom.json` reconstructing the reference PNG element by element (warm gray-green walls with white molding bands, wood floor, cream rug, curtain/right window light, parents' bed at far left extended to full size, white/oak dresser with drawers + blanket + plush + potted plant on top, NEW crib furniture type — white frame with wooden slats, firm flat mattress + fitted sheet, baby lying on back — round side table with birdcage night light (warm emissive + point light), framed gauge poster above the crib). Add `nursery` shots per plan §3: `close-mother-baby`, `close-father`, `flashback-fall`, `nursery-wide`, `crib-close`, `nursery-top`. Exam-room scenes reuse the existing `pediatric-visit-room.json` shots unchanged.
4. **Props**: `library/props/sleep-props.json` — mattress, fitted sheet, pillow, small blanket, plush toy (pillow/blanket/plush used ONLY in the crossed-out forbidden-items gag).
5. **Engine (minimal, episode-agnostic)**: add the per-line flags in `src/js/timeline.js` per plan §5 (`flashbackFall`, `coSleepCard` optional, `forbiddenItems`, `sleepPosition`, `nurseryTop`, `endCard`), and any new furniture types needed by the room JSON in `src/js/world.js` (crib, night light, full parents' bed variant). No changes to `audio.js`, `main.js`, subtitle system, or render tooling.
6. **Voices**: add a `father` entry to `config/voices.json` with a suitable male Persian-capable ElevenLabs voice (model `eleven_v3`; NOT `eleven_multilingual_v2`). L19 (narrator) uses the doctor voice.
7. **Medical safety (plan §5 — hard constraints)**: co-sleeping is never framed as acceptable; the fall flashback shows no injury and no first-aid content (message: alertness ≠ no injury → immediate evaluation); forbidden items appear only to be crossed out; end-card wording verbatim from the source.
8. **Run the pipeline** (exact order):
   ```
   set ELEVENLABS_API_KEY=<key from F:\Animation\api.txt>
   node tools/generate-voice-elevenlabs.js --ep ep03-baby-sleep
   node tools/compute-timing.js             --ep ep03-baby-sleep
   node tools/build-subtitles.js            --ep ep03-baby-sleep
   node tools/preview-shots.js              --ep ep03-baby-sleep
   node tools/node24.cmd tools/zfight-diag.js --ep ep03-baby-sleep   # must PASS
   node tools/render.js                     --ep ep03-baby-sleep
   node tools/make-hook-cards.js            --ep ep03-baby-sleep
   node tools/assemble.js                   --ep ep03-baby-sleep
   ```
9. **Quality loop (mandatory)**: after building the nursery room and before full render, run `preview-shots` and compare stills against `project 3.png`; iterate layout/palette/decor/framing until they match. Apply BUGFIX_RULES (no coplanar faces ≥0.1 clearance, camera near/far, shadow rules) and QUALITY_RULES (lighting recipe, poster labels via textSprite, close-up face contrast). Do not rely on memory — compare against the PNG. Run the z-fight gate after ANY change to `src/js/world.js` (it is shared with ep01/ep02 — re-check those episodes still PASS too).
10. **Sound design (mandatory)**: exam-room ambience (reuse ep02 choices), soft nursery room tone; whoosh on cuts into/out of nursery inserts and the flashback; foley for baby wiggle and crib-item pops; UI tone on end-card bullets; follow `tools/Sound pack SFX/SOUND-CATALOG.md` mixing levels; TTS always dominant.
11. **Docs**: update `docs/EPISODE-PLAYBOOK.md` with lessons learned, and the README episode list.

**Deliverable**: `episodes/ep03-baby-sleep/render/final.mp4` (1080×1920, 9:16, 30 FPS, hook intro/outro, 4 per-speaker subtitle colors) plus all intermediate artifacts (`scenario.json`, `audio/L01…L19.mp3`, `timing.json`, `subtitles.srt`). Report the acceptance checklist from `scenario/ep03-plan.md` §10 as done/not-done with evidence at the end.
