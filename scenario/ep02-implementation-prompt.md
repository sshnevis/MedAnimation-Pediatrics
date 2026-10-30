# Implementation Prompt — Episode 2 (paste this into the new task)

The text below is the prompt to give the implementation session. It is self-contained.

---

Implement Episode 2 of our medical voxel animation series: **"نحوه برخورد با تب در کودکان"**.

**Read these first, in order, before writing any code:**
1. `scenario/ep02-plan.md` — the approved plan you MUST follow exactly (line breakdown L01–L16 with verbatim diacritized `tts` text, shot mapping, room spec, new effect flags, medical-safety constraints, runbook, acceptance checklist).
2. `scenario/project 2.txt` — source dialogue (diacritized).
3. `scenario/project 2-todo.md` — cinematography/staging guideline (سکانس ۱–۱۶).
4. `scenario/project 2.png` — visual reference.
5. `episodes/ep01-childhood-diarrhea/scenario.json` — the exact scenario.json schema to follow.
6. `README.md`, `QUALITY_RULES.md`, `BUGFIX_RULES.md`.

**Work items:**

1. **Scenario**: author `episodes/ep02-child-fever/scenario.json` following the ep01 schema exactly — 16 lines (L01…L16) per the plan's §2 table; `display` = clean subtitle text, `tts` = diacritized text copied verbatim from `project 2.txt`; hooks (intro/outro), staging, ending, endCard. Family is already seated at t=0 (no door/walk-in animation — the guideline explicitly allows this).
2. **Room (user requirement — 100% match to `project 2.png`)**: create `library/room/pediatric-visit-room.json` reconstructing the reference PNG element by element (warm walls + gray tile wainscot, wooden door, left window with daylight/greenery/white curtain, wooden desk with monitor and papers, black office chair, teal exam bed, teal cabinets with white drawers, wooden bookshelf with colored books + plants, teddy-bear poster «سلامت کودکان», framed heart posters, giraffe growth chart, wall clock, teal visitor chair for mother+child). Use the existing room JSON schema; palette sampled from the PNG. Doctor behind desk, mother+child on visitor chair facing him.
3. **Engine (minimal, episode-agnostic)**:
   - Fix the `buildShots()` dead-code bug in `src/js/blocking.js` (the `roomDef.shots` merge block sits after `return shots;` and never runs) so room JSON can define shots; then define the shots from plan §3 (`wide-establishing` with slow push-in, `medium-doctor`, `medium-family`, `medium-family-close`, `close-mother`, `close-doctor`, `insert-medicine`) in the room JSON. Respect camera-axis discipline: doctor on one side, family on the other, in every shot.
   - Add per-line flags in `src/js/timeline.js` following the existing `foods`/`warning`/`heart` pattern: `dangerCard` (L14 — sequential items with icons), `infantCard` (L15 — red-border alert card), `doseCard` (L16), optional `medicineInsert` (L09/L11).
   - Add `library/props/fever-props.json` (amber acetaminophen bottle, dropper, water cup, pill/suppository shapes) and any new furniture types needed in `src/js/world.js`.
   - **Medical safety: never render a dosage amount on any bottle or card.**
4. **TTS**: use the diacritized `tts` text. Set `ELEVENLABS_API_KEY` from `F:\Animation\api.txt` and run the pipeline below. Note: L13 is the doctor (source's `مادر/دُکتُر` label is a typo); L16 is narrator → use doctor voice.
5. **Run the pipeline** (exact order):
   ```
   node tools/generate-voice-elevenlabs.js --ep ep02-child-fever
   node tools/compute-timing.js             --ep ep02-child-fever
   node tools/build-subtitles.js            --ep ep02-child-fever
   node tools/preview-shots.js              --ep ep02-child-fever
   node tools/render.js                     --ep ep02-child-fever
   node tools/make-hook-cards.js            --ep ep02-child-fever
   node tools/assemble.js                   --ep ep02-child-fever
   ```
6. **Quality loop (mandatory)**: after building the room and before full render, run `preview-shots` and compare stills against `project 2.png`; iterate layout/palette/decor/framing until they match. Apply BUGFIX_RULES (no coplanar faces ≥0.1 clearance, camera near/far, shadow rules) and QUALITY_RULES (lighting recipe, poster labels via textSprite, close-up face contrast). Do not rely on memory — compare against the PNG.
7. **Docs**: update `docs/EPISODE-PLAYBOOK.md` with any deviations/lessons learned from this episode (self-improvement log), and the README episode list if applicable.

**Deliverable**: `episodes/ep02-child-fever/render/final.mp4` (1080×1920, 9:16, 30 FPS, hook intro/outro, per-speaker colored subtitles) plus all intermediate artifacts (`scenario.json`, `audio/L01…L16.mp3`, `timing.json`, `subtitles.srt`). Report the acceptance checklist from `scenario/ep02-plan.md` §9 as done/not-done with evidence at the end.
