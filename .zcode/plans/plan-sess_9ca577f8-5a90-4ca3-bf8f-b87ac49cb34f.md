# Plan: Plan Episode 2 ("نحوه برخورد با تب در کودکان") and prepare the implementation prompt

## Context

Episode 1 (`episodes/ep01-childhood-diarrhea`) is complete: a browser-based Three.js voxel engine (`src/js/`) with a shared library (`library/characters|room|props`), per-episode data (`episodes/<id>/scenario.json` + `audio/` + generated `timing.json`/`subtitles.srt`), TTS via ElevenLabs (`tools/generate-voice-elevenlabs.js`, key in `F:\Animation\api.txt`, model `eleven_v3` — Persian-capable), and render/assemble pipeline. Episode 2 must follow the same architecture. The scenario text is diacritized Persian in `scenario/project 2.txt`; shot/camera direction guidelines are in `scenario/project 2-todo.md`; visual reference is `scenario/project 2.png` (exam room with doctor, mother in magenta hijab, boy in red).

**This task is planning-only**: produce the documented plan artifacts + the implementation prompt. The actual build happens in a separate task using that prompt.

## Deliverables of this task

### 1. `scenario/ep02-plan.md` — full planning document (English, per language rule)
Contains:
- **Episode id**: `ep02-child-fever`, title "نحوه برخورد با تب در کودکان".
- **Line breakdown** (16 lines, `L01…L16`), each with `speaker`, `display` (subtitle text), `tts` (diacritized text copied verbatim from `project 2.txt`), `camera` shot name, planned staging/action per the سکانس ۱–۱۶ table in `project 2-todo.md` (timings are advisory; real timing comes from TTS via `compute-timing.js`).
- **Shot mapping** to the 3-camera grammar in the guideline: `wide-establishing` (Camera A, slow push-in), `medium-doctor` (Camera B), `medium-family` (Camera C), `close-mother` (L12 antibiotic question), `insert-medicine` (syrup bottle + dropper, L11 and L16), graphic-card inserts for L14/L15/L16.
- **Room built 100% to match `scenario/project 2.png`** (explicit user requirement): create a dedicated room definition `library/room/pediatric-visit-room.json` (ep02 uses it; ep01 keeps its room untouched). The implementation task must reconstruct the PNG faithfully, panel by panel:
  - Light warm walls with gray tile wainscot band; wooden door (right side in establishing frame), large window with bright daylight + greenery outside (left), white curtains.
  - Wooden doctor desk (front-left of doctor) with monitor, papers, desk items; black office chair.
  - Teal/turquoise examination bed (right background) and teal storage cabinets/side tables with white drawers.
  - Wooden bookshelf with colored books + potted plants (left), small stool.
  - Wall décor exactly as PNG: teddy-bear poster with Persian label «سلامت کودکان», framed heart/medical posters, growth-chart poster with giraffe, wall clock.
  - Teal visitor chair for mother + child (child in red sitting beside mother).
  - Blocking marks for doctorSit, motherSit, childSit, face marks; cameras A/B/C placement per the guideline (axis discipline: doctor one side, family the other, in all shots).
  - Iteration loop: use `tools/preview-shots.js` stills compared against `project 2.png` (per QUALITY_RULES) until framing/palette/decor match; follow BUGFIX_RULES (no coplanar faces, near/far planes, shadow rules).
- **New engine features required** (minimal, episode-agnostic):
  - New named shots in `src/js/blocking.js` `buildShots()` — including fixing the latent bug where `roomDef.shots` overrides are dead code (merge block sits after `return`), so shots can come from the room JSON.
  - New per-line effect flags in `src/js/timeline.js`: `dangerCard` (L14 — full-frame warning card listing: استفراغ مکرر / سردرد / بی‌حالی / خواب‌آلودگی / کاهش ادرار / تنفس نامنظم, items appearing sequentially with icons), `infantCard` (L15 — red-bordered alert card «کودک زیر ۲ ماه با تب: ارزیابی فوری پزشکی»), `doseCard` (L16 — acetaminophen bottle + «اطلاعات بیشتر در کپشن»), matching the numbered cards in `project 2.png` (cards 11, 13, 14, 15).
  - New prop pack `library/props/fever-props.json`: amber medicine bottle labeled استامینوفن, dropper, water cup, pill/suppository shapes (no fake dosage shown — per medical-safety notes in the guideline), as seen in PNG panels 11 and 16.
  - Reuse existing `doctor`, `mother`, `child` character definitions (they already match the PNG: white coat + mustache doctor, magenta hijab mother, red-shirt boy); adjust only if preview comparison shows mismatch.
- **TTS plan**: `tts` fields use the diacritized text from `project 2.txt`; speaker split — note line «فَفعلاً لازِم نیسْت…» is doctor (the `مادر/دُکتُر` label is a typo in the source); final line «دوزِ استامینوفن در کَپشِن ذِکر شُده است» is narrator → use doctor voice unless a narrator voice is added. Generate with `node tools/generate-voice-elevenlabs.js --ep ep02-child-fever` (key from `api.txt` via `ELEVENLABS_API_KEY`).
- **Pipeline runbook** (exact command order from README): voice → compute-timing → build-subtitles → preview-shots → render → make-hook-cards → assemble.

### 2. `scenario/ep02-implementation-prompt.md` + chat prompt — the prompt the user will paste into the next task
A complete, self-contained implementation prompt that instructs the next session to: read the three source files + `ep02-plan.md` + README/QUALITY_RULES/BUGFIX_RULES, author `episodes/ep02-child-fever/scenario.json` following the ep01 schema exactly, build the `pediatric-visit-room` matching `project 2.png` with a preview-shots iteration loop, extend blocking/timeline/props per plan, generate TTS + timing + subtitles, render 9:16, hook cards, assemble `final.mp4`, and update docs.

### 3. Documentation / self-improvement
- Create `docs/EPISODE-PLAYBOOK.md`: the repeatable per-episode process (source files → plan → scenario.json → room/props → TTS → timing → preview loop against reference image → render → assemble), incorporating ep01 lessons (BUGFIX_RULES, QUALITY_RULES, eleven_v3 for Persian, preview-shots iteration against reference image).
- Fix/annotate the `buildShots` dead-code bug location in the plan so the implementation task addresses it.

## Verification (for the planning task)
- Plan document cross-checked line-by-line against `project 2.txt` (all dialogue present, diacritics preserved) and against the 16-سکانس direction table in `project 2-todo.md`.
- Room requirements enumerated element-by-element from `project 2.png` so the implementation task can verify 100% match via preview stills.
- Prompt references only files/tools that exist in the repo (verified via exploration).

## Out of scope (next task)
Actual scenario.json authoring, room/props construction, code changes, TTS generation, and rendering — done in the separate implementation task using the produced prompt.