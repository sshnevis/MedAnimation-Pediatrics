# EP03 scenario / audio handoff

## Ownership and status

This task writes only `episodes/ep03-baby-sleep/**` and `config/voices.json`.
No shared engine/tools/library/docs, screenshots, previews, or renders were changed or generated.
The scenario and audio are complete; the rendering coordinator owns the room, rigs,
room switching, timeline effects, subtitle metadata integration, sound design, and visual QA.
**This is a data contract, not a claim that the current engine supports every field.**

## Source and audio evidence

- `scenario/project 3.txt` is authoritative, not the plan's pronunciation table.
- `scenario.json` has exactly L01–L19. L01–L18 copy each source dialogue payload
  without normalization, including every diacritic, punctuation mark, and ZWNJ.
- L19 joins the exact heading on source line 64 and bullet payloads on lines 65–67
  with single spaces; only structural `- ` bullet markers and newlines are excluded.
  Both end-card objects preserve the heading's colon, shadda, and bullet punctuation.
- `validation.json` contains the full source/scenario text comparison and matching
  UTF-8 SHA-256 hashes for every line, plus the source/scenario file hashes.
- Plan-table TTS differs from source on **L06, L07, L08, L09, L10, L11, L12, L13,
  L14, L15, L16, L17, L18**. The scenario deliberately uses source, including
  `سؤال مهم`, `شش ماهگی`, and `حوادث مرتبط با خواب رو افزایش می‌ده`.
- `audio/L01.mp3`–`audio/L19.mp3` were generated with `eleven_v3` using the unchanged
  shared generator. George = doctor/narrator; Sarah = mother; Adam = father
  (`pNInz6obpgDQGcFmaJgB`, distinct from doctor).
- `generation-report.json`: all three distinct voice IDs passed authenticated
  voice-availability checks (HTTP 200), and the ordered TTS → timing → subs →
  artifact-validation steps passed. Credential contents were never logged.
  Final validation also decoded all 19 MP3s with ffmpeg without errors.
- `timing.json`: 19/19 durations measured with ffprobe; total **153.64 s** including
  1.4 s lead-in, 0.45 s gaps, and 7.5 s final hold. Source-verbatim audio is longer
  than the plan's advisory 90–120 s target; do not trim source text to fit it.
- `subtitles.srt`: **41** cues, source dialogue with diacritics removed, split at
  word boundaries, checked against all 19 display strings and measured intervals.
  SRT itself is unstyled; the four colors are a browser-overlay contract below.

## Locations / cast / marks

- Existing `location: "pediatric-visit-room"` remains the primary-room load contract.
- New metadata `locations: { primary: "pediatric-visit-room", nursery: "nursery-bedroom" }`.
- The coordinator must load `staging.inserts.room: "nursery-bedroom"` and its shots
  as a secondary world. Do not look up nursery shots in the primary room and silently
  fall back to `wide-final`. Apply `staging.plan[].room` explicitly on every transition.
- Cast is exactly `doctor`, `mother`, `father`, `baby`; no ep02 `child` and no narrator rig.
- `staging.initial`: doctor/mother keep their existing sit/face marks. Father reuses
  the existing second visitor chair's `childSit` mark; this is only a mark name,
  not a request to load the child character. Baby has `pose: "held", parent: "mother"`.
  Coordinator applies the baby def's held attachment offset, not adult sitting logic.
- Nursery baby placement comes from `staging.inserts.baby`: `cribBaby`, `lying` pose;
  on return to clinic, reattach to mother with `held` pose. Keep exactly one baby visible.
- Primary room must provide `close-mother-baby` and `close-father` in addition to
  unchanged ep02 shot definitions. Nursery provides `flashback-fall`, `nursery-wide`,
  `crib-close`, `nursery-top`; marks include `cribBaby`, `parentsBed`.

## Per-line timeline contract

Content is on `scenario.lines[]`; corresponding `staging.plan[]` effect keys are
boolean activators, following ep02's card pattern. L01 uses its `camera` as the opening
shot; plan covers L02–L19, matching the current opening-line special case.
Each line also has an `action` describing gestures and medical-safety requirements.

| Line | Base room / shot | Activator and required behavior |
|---|---|---|
| L01 | clinic / wide-establishing | Seated opening, mother already holding baby; no walk-in. |
| L02 | clinic / medium-doctor | Reassuring open palm. |
| L03 | clinic / medium-family | `flashbackFall`: cue sentence in line config; 2.5 s nursery/flashback-fall insert, then **return to medium-family within the line**. |
| L04 | clinic / close-mother-baby | Tight hug, alert wiggle/cry-face; baby held. |
| L05 | clinic / medium-doctor | Immediate evaluation; alertness is not reassurance against injury. |
| L06 | clinic / medium-doctor | Gentle questioning tilt. |
| L07 | clinic / medium-family | Small nod. |
| L08 | clinic / medium-doctor | `coSleepCard`: brief corner bed-sharing prohibition, only text `خطر`. |
| L09 | clinic / close-father | Concerned lean-in. |
| L10 | clinic / medium-doctor | `nurseryInsert`: switch at `تخت مستقل` to nursery/nursery-wide; hold nursery through L12. |
| L11 | nursery / crib-close | `forbiddenItems`: pillow, blanket, fractions `[0.2, 0.6]`; immediate crosses + shake-no. Mother is off-screen voice. |
| L12 | nursery / crib-close | `forbiddenItems`: pillow, blanket, plush at fractions `[0.12, 0.4, 0.68]`; pop/cross/remove, end on mattress + fitted sheet only. |
| L13 | clinic / medium-family | Restore held baby; father hand-turn gesture only. |
| L14 | nursery / crib-close | `sleepPosition`: back/check then side/stomach crossed-out silhouettes at fractions `[0.12, 0.45, 0.72]`; real baby stays on back. |
| L15 | clinic / medium-family | Restore held baby; mother counts three points. |
| L16 | nursery / nursery-top | `nurseryTop`: two separate beds + distance arrows, never crib inside parents bed. |
| L17 | clinic / medium-family | Restore held baby; relieved nods. |
| L18 | clinic / close-doctor | Firm warm closing. |
| L19 | nursery / nursery-top | `endCard`: heading + source-verbatim bullets at fractions `[0.2, 0.4, 0.68]`, doctor audio/narrator color; remain through final hold. |

Timing fractions mean `line.start + line.duration * fraction`, using measured timing,
not fixed scene seconds. Cue strings for L03/L10 identify the sentence/phrase boundary;
without word alignment, use a text-position fraction of the measured duration and
verify against audio during coordinator QA. L03 must include entry AND return cuts,
clamping its 2.5 s duration to fit inside L03. End L10 on the nursery, not clinic.
Forbidden-item changes and sleep-position graphics are sequential teaching beats
inside their lines, not permission to pose a sleeping baby on its side/stomach.
Ensure deterministic seek/reset of worlds, attachment/pose, visibility, and overlays.

## Narrator / four subtitle colors: coordinator integration required

The engine inspected for this task does **not** consume `scenario.speakers`:
`src/js/main.js` resolves colors only from character definitions, and
`src/js/timeline.js::talkWindow` directly indexes `rigs[L.speaker].anim`.
Thus L19 will fail without the coordinator's guard; scenario data alone cannot fix it.

Use `scenario.speakers[speakerId].subtitleColor` before the character-color fallback,
and skip talking animation for a missing/null character (or resolve its explicit
character metadata). Still schedule narration audio and subtitle windows normally.
**Do not create/load `library/characters/narrator.json` just to color L19.**
`config/voices.json` has an explicit narrator voice entry because the shared TTS
script indexes the speaker directly; it exactly matches doctor voice/settings.

| Speaker | Character metadata | Subtitle background |
|---|---|---|
| doctor | doctor | `rgba(21, 74, 138, 0.88)` (existing blue) |
| mother | mother | `rgba(70, 74, 80, 0.88)` (existing slate) |
| father | father | `rgba(166, 73, 12, 0.88)` (orange) |
| narrator | null; voice doctor | `rgba(100, 48, 145, 0.88)` (purple) |

Four distinct values are validated in data, **not yet verified in rendered pixels**.
Existing doctor/mother colors were preserved rather than copying the plan's outdated
teal/rose description. Father def should match the orange metadata for fallback use.

## Medical / visual / sound guardrails

- No injury, impact, first aid, or reassurance from alertness in the fall insert.
  Vignette, desaturation, slow motion; unsafe bed-sharing framing throughout.
- No loose blanket, pillow, plush, bumper, or soft item in the final safe crib.
  Forbidden objects appear only as immediately prohibited teaching examples.
  Reference-image bedding does not override the source medical constraints.
- Crib always separate from the parents bed; real infant lies on its back.
- No medication/dose content. Source end-card text is immutable.
- Hooks: intro 0.5 s (`این قسمت` / `خواب ایمن نوزاد`), outro 1.0 s (`ادامه دارد`).
  Suggested future hook background is L16's midpoint, ~113.19 s (~frame 3396 at 30fps);
  coordinator can set `hooks.intro.frame` after the render timeline is settled.
- Coordinator sound design: exam/nursery room tone, whooshes at nursery/flashback
  entry/exit cuts, soft wiggle/item foley, UI tone per end-card bullet; catalog levels,
  always beneath speech. No SFX mix is claimed by this task.

## Reproduce / verify (Node >=24, ffprobe + ffmpeg on PATH)

From the project root, use resolved Node >=24 or `tools/node24.cmd`:

```text
tools/node24.cmd episodes/ep03-baby-sleep/prepare-scenario.cjs
tools/node24.cmd episodes/ep03-baby-sleep/validate.cjs --artifacts
```

`prepare-scenario.cjs` reproducibly authors source-verbatim dialogue; it does not call
TTS. `validate.cjs --artifacts` checks UTF-8 equality, speaker/shot/staging/voice wiring,
all MP3 durations and error-free decoding, timing sources, full subtitle reconstruction,
and cue intervals.
It writes detailed evidence to `validation.json`.

`generate-audio.cjs` reads `api.txt` programmatically, checks voice availability,
passes the credential only in the generator child environment, redacts output, and
runs the shared generation/timing/subtitle tools in order. It refuses to regenerate
when any MP3 exists to prevent accidental repeat billing. **Audio already exists;
do not rerun generation merely to validate.** It never renders or captures screenshots.

## Plan acceptance checklist at this handoff

| Plan criterion | Status / evidence |
|---|---|
| 19 correct source-verbatim lines | Done; `validation.json`, 19 byte-equality/hash comparisons. |
| father/baby defs and working poses | Coordinator-owned; not implemented in this write scope. |
| Nursery/reference match and two-bed overhead | Coordinator-owned; no visual validation performed. |
| Reuse clinic shots / axis discipline | Declared; primary JSON untouched, final framing unverified. |
| Required timeline effects | All flags/content declared; shared implementation pending coordinator. |
| Medical constraints | Enforced in data/actions; rendered behavior still requires QA. |
| Timing + subtitles; four colors | Audio/timing/41 cues done; four color values declared, engine integration pending. |
| Z-fight gate PASS | Not run; no shared geometry changes or rendering in this task. |
| Sound design | Coordinator-owned; not mixed. |
| Final render + hooks | Not run; prohibited by this task's scope. |
| Shared README/playbook updates | Not changed; outside allowed write paths. This handoff is episode-local. |
