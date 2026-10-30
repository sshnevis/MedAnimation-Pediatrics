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
- `src/js/blocking.js` `buildShots()`: the `roomDef.shots` merge block sits after
  `return shots;` (dead code) — room-level shot overrides never applied. Fix in ep02.
- Camera-axis discipline: hold doctor on one side / family on the other across all shots;
  never cut across the axis without an intermediate framing.

### From ep02 (child fever)
- (to be filled after implementation)
