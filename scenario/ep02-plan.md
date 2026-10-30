# Episode 2 Plan — "نحوه برخورد با تب در کودکان" (Managing Fever in Children)

> Planning document produced before implementation. The implementation session must follow this
> document exactly. Sources of truth:
> - `scenario/project 2.txt` — dialogue (diacritized) + draft diacritization request
> - `scenario/project 2-todo.md` — cinematography / staging guideline (سکانس ۱–۱۶ table)
> - `scenario/project 2.png` — visual reference: room, characters, shot framing, graphic cards
> - Existing engine: `src/js/*`, `library/*`, `episodes/ep01-childhood-diarrhea/scenario.json` (schema reference)

---

## 1. Episode identity

| Field | Value |
|---|---|
| id | `ep02-child-fever` |
| title | نحوه برخورد با تب در کودکان |
| location | `pediatric-visit-room` (NEW room JSON, built 100% to match `project 2.png`) |
| characters | `doctor`, `mother`, `child` (reuse ep01 definitions; adjust only if preview shows mismatch) |
| props | `fever-props` (NEW pack) |
| aspect / resolution | 9:16, 1080×1920, 30 FPS (same as ep01) |
| target duration | ~120–150 s (driven by real TTS durations, not the advisory timings) |

## 2. Line breakdown (L01…L16)

Rules:
- `display` = clean subtitle text (what appears on screen).
- `tts` = diacritized text, copied **verbatim** from `scenario/project 2.txt` (first block, lines 2–34).
- Advisory timings from the سکانس table are indicative only; `tools/compute-timing.js` produces the real timing from TTS audio.
- Speaker note: the source labels L13 as `مادر/دُکتُر` — this is a typo; **L13 is the doctor**.
- L16 («دوزِ استامینوفِن در کَپشِن ذِکر شُده اَست.») is a narrator line; use the doctor voice for TTS unless a narrator voice is added to `config/voices.json`.

| id | speaker | display (subtitle) | tts (diacritized, verbatim) | shot | staging notes (from guideline) |
|---|---|---|---|---|---|
| L01 | doctor | سلام، خوش اومدین. | سَلام، خُوش اومَدین. | `wide-establishing` | Camera A, slow push-in then hold; doctor raises head, smiles; mother nods; child sits calmly looking at doctor |
| L02 | mother | سلام آقای دکتر، بچه‌ام تب داره. | سَلام آقای دُکتُر، بَچه‌ام تَب دارِه. | `medium-family` | Mother looks at doctor; on «بچه‌ام» hand moves gently toward child; mild worry, not panic; child head slightly down, glances at mother once |
| L03 | doctor | چند روزه که تب داره؟ | چَند رُوزِه که تَب دارِه؟ | `medium-doctor` | Head tilts toward mother, hands on desk, eyebrows raised on question |
| L04 | mother | از همین امروز. | اَز هَمین اِمروز. | `medium-family` | Small head nod; slight hand raise on «امروز» then down; child glances at doctor |
| L05 | doctor | اینکه بیشتر از چند روز تب داشته باشه، خیلی مهمه. برای پایین آوردن تب چه کارهایی انجام دادین؟ | اینکه بیشتر اَز چَند رُوز تَب داشتِه باشِه، خیلی مُهِمِه. بَرای پایین آوردَنِ تَب چِه کارهایی اَنجام دادین؟ | `medium-doctor` | Slow explanatory hand gesture; pause on «خیلی مهمه»; lean forward; hold gaze awaiting answer. No zooming |
| L06 | mother | پاشویه کردم و از مایعات به مقدار کافی استفاده کردم. | پاشویه کَردَم و اَز مایعات بِه مِقدارِ کافی اِستِفادِه کَردَم. | `medium-family` | Small hand motion on «پاشویه»; palm raises on «مایعات»; ends looking at doctor; child calm |
| L07 | doctor | آیا کل روز تب داره؟ | آیا کُلِّ رُوز تَب دارِه؟ | `medium-doctor` | Head tilt, thoughtful expression, ~0.5 s hold after the question |
| L08 | mother | بله. | بَله. | `medium-family-close` | Single confirming nod; mild worry retained. Shot slightly tighter than L06 |
| L09 | doctor | پس باید از داروی ضد تب مانند استامینوفن استفاده کنین. | پَس بایَد اَز داروی ضِدِّ تَب مانَندِ استامینوفِن اِستِفادِه کُنین. | `medium-doctor` | Hand rises; small precise gesture on «استامینوفن»; calm confident face. Optional: small medicine-bottle graphic in frame corner |
| L10 | mother | چه مدت و به چه صورت؟ | چِه مُدَت و بِه چِه صُورَت؟ | `medium-family` | Leans forward slightly, head tilts toward doctor, hands resting |
| L11 | doctor | از قطره یا شربت استفاده کنین؛ اگر نتونست بخوره، از شیاف هم می‌تونین استفاده کنین. | اَز قَطره یا شَربَت اِستِفادِه کُنین؛ اَگَر نَتَوانست بِخُورِه، اَز شیاف هَم می‌تونین اِستِفادِه کُنین. | `medium-doctor` → `insert-medicine` → back | Hand gesture on قطره/شربت; cut to medicine insert mid-line; return to doctor |
| L12 | mother | آیا لازم است از آنتی بیوتیک استفاده کنم؟ | آیا لازِم اَست اَز آنتی‌بیوتیک اِستِفادِه کُنَم؟ | `close-mother` | Key educational beat; questioning face; head forward on «آنتی‌بیوتیک»; camera holds static |
| L13 | doctor | فعلا لازم نیست، چون ممکن است تب به خاطر بیماری ویروسی باشه. اگر بعد از دو روز با وجود دادن داروی ضد تب، همچنان تب داشت، مجدداً به پزشک مراجعه کنین. | فَفعلاً لازِم نیسْت، چون مُمکِن اَست تَب بِه خاطِرِ بیماریِ ویروسی باشِه. اَگَر بَعَد اَز دو رُوز با وُجودِ دادنِ داروی ضِدِّ تَب، هَمچُنان تَب داشت، مُجَدَّداً بِه پِزِشک مُراجِعِه کُنین. | `medium-doctor` | Negation gesture at start; hand rests on «ویروسی»; small emphatic gesture on the 2-day advice; serious but calm. Optional text: «آنتی‌بیوتیک فقط در صورت تشخیص و تجویز پزشک» |
| L14 | doctor | همچنین حتماً به علائم خطر همراه تب دقت کنین؛ مانند استفراغ زیاد یا پر تکرار، سردرد، بی حالی، خواب آلودگی، کاهش ادرار و تنفس نامنظم. | هَمچنین حَتماً بِه عَلامت‌‌های خَطَرِ هَمراهِ تَب دِقَّت کُنین: مانَندِ اِستِفراغِ زیاد یا پُر تِکرار، سَردَرد، بی‌حالی، خواب‌آلودگی، کاهشِ ادرار، و تَنَفُّسِ نامُنَظَّم. | `medium-doctor` → `dangerCard` | Hand raises; serious face on «علائم خطر»; then full-frame warning card with items appearing sequentially (see §5) |
| L15 | doctor | همچنین به این نکته باید توجه شود که اگر سن کودک زیر دو ماه بود، حتماً به صورت فوری به پزشک مراجعه کنین. | هَمچنین بِه این نُکته بایَد توجّه شَوَد که اَر صورتی که سِنِّ کودَک زیرِ دو ماه بود، حَتماً بِه صُورَتِ فوری بِه پِزِشک مُراجِعِه کُنید. | `close-doctor` → `infantCard` | Index finger rises gently; serious calm face; red-bordered alert card (see §5) |
| L16 | narrator | دوز استامینوفن در کپشن ذکر شده است. | دوزِ استامینوفِن در کَپشِن ذِکر شُده اَست. | `insert-medicine` → `doseCard` | Very slow push toward medicine bottle; final caption card «اطلاعات بیشتر در کپشن» + channel mark |

`sentence-split note`: L14 is one TTS line but the guideline splits the danger-list into its own sentence. Keep it as a single line (L14) for TTS and timing simplicity; the danger card items animate sequentially within the line duration.

## 3. Shot system (3-camera grammar)

Add these named shots (in `blocking.js buildShots()` or, preferably, via the fixed `roomDef.shots` override — see §6). Camera-axis discipline: doctor always on one side of frame, family on the other; never jump the axis.

| shot | guideline camera | framing |
|---|---|---|
| `wide-establishing` | Camera A | Whole room, all three characters, slightly above eye level, slow push-in (dolly) then hold |
| `medium-doctor` | Camera B | Doctor waist-up, from the family side; background slightly soft; static |
| `medium-family` | Camera C | Mother + child together, from the doctor side; static |
| `medium-family-close` | Camera C variant | Slightly tighter two-shot (for L08) |
| `close-mother` | — | Head-and-shoulders, static (L12) |
| `close-doctor` | — | Head-and-shoulders, static (L15 start) |
| `insert-medicine` | — | Desk/table insert: medicine bottle + dropper (+ water cup), very slow push (L11, L16) |
| `dangerCard` / `infantCard` / `doseCard` | — | Full-frame graphic cards (see §5), not world-space shots |

## 4. NEW room: `library/room/pediatric-visit-room.json` — match `project 2.png` 100%

This is an explicit user requirement. Reconstruct the exam room from the PNG panel-by-panel using the
existing room JSON schema (same keys as `library/room/visit-room.json`: `size`, `wallHeight`, `palette`,
`door`, `window`, `furniture[]`, `blocking{}`, plus `shots{}`). Enumerated elements from the reference:

**Shell**
- Light warm walls, gray tile wainscot band along the lower wall (as in PNG panel 1).
- Wooden door (right side of establishing frame) — reuse door mechanics (`doorPivot`) but no open-door animation needed (family already seated at L01; per guideline time-saving option).
- Large window on the left with bright daylight, greenery outside, glass tint, white curtain.

**Furniture**
- Wooden doctor desk (doctor behind it, front-left), with monitor, papers/folder, small desk items.
- Black office chair (doctor).
- Teal/turquoise examination bed in the right background.
- Teal storage cabinets / side tables with white drawers (as in PNG panels 1–2).
- Wooden bookshelf with colored books + potted plants on/next to it (left), small stool.
- Teal visitor chair(s) where mother + child sit (child in red beside mother).

**Wall décor (exact per PNG)**
- Teddy-bear poster with Persian label «سلامت کودکان» (bake label via `textSprite`, per QUALITY_RULES Q-rules on posters).
- Framed heart/medical posters (small frames, upper wall).
- Growth-chart poster with giraffe (near exam bed).
- Wall clock.

**Lighting**
- Key natural light from the left window + soft ceiling fill (follow QUALITY_RULES lighting recipe; keep close-up face contrast rule in mind).

**Blocking marks**
- `doctorSit`, `doctorFace`, `motherSit`, `childSit`, `familyFace` — doctor behind desk facing family; mother and child seated on visitor chair facing doctor. Family is already seated at t=0 (no door/walk-in needed — guideline explicitly allows this to save time).

**Palette**
- Exact palette values in the room JSON (QUALITY_RULES Q rule: colors come from the JSON, not ad-hoc). Sample from the PNG: warm wood tones, teal/turquoise furniture, white/gray trim, warm light walls.

**Verification loop (mandatory)**
- After building the room, run `node tools/preview-shots.js --ep ep02-child-fever` and compare stills against `project 2.png` (QUALITY_RULES: iterate against the reference image, not memory). Iterate until layout, palette, furniture, and décor match. Respect BUGFIX_RULES (no coplanar faces, camera near/far, shadow rules).

## 5. New timeline effect flags (in `src/js/timeline.js`)

Per-line boolean flags in `staging.plan`, same pattern as ep01's `foods`/`warning`/`heart`/`nod`:

- `dangerCard` (L14): full-frame warning card — title «علائم هشدار همراه تب», red warning header, items appearing sequentially (staggered fractions of the line duration, like ep01's `foods` pop timing): استفراغ مکرر / سردرد شدید یا غیرمعمول / بی‌حالی یا خواب‌آلودگی غیرعادی / کاهش ادرار / تنفس غیرطبیعی — each with a simple icon. Matches PNG card 14.
- `infantCard` (L15): light background card with red alert border: «اگر سن کودک زیر دو ماه بود، حتماً به صورت فوری به پزشک مراجعه کنید.» + infant icon. Matches PNG card 15.
- `doseCard` (L16): amber acetaminophen bottle render + text «اطلاعات بیشتر در کپشن» + channel mark. Matches PNG panel 16.
- `medicineInsert` (L09/L11 optional): small bottle/dropper graphic at frame corner (PNG card 11), no dosage shown.

Medical-safety constraints (from the guideline — must be respected):
- Never display a dosage amount on any bottle or card.
- The danger card must not imply it is always safe to wait 2 days when these signs are present.
- The infant card should convey immediate (فوری) medical evaluation for infants under 2 months.

## 6. Engine changes (minimal, episode-agnostic)

1. **`src/js/blocking.js` — fix the `buildShots()` dead-code bug**: the `roomDef.shots` merge block currently sits after `return shots;` and never runs. Move it before the return so room JSON can define/override named shots. Then define all §3 shots in `pediatric-visit-room.json` `shots{}` (preferred) or as fallbacks in code.
2. **`src/js/timeline.js`** — add the §5 flags (`dangerCard`, `infantCard`, `doseCard`, optional `medicineInsert`) following the existing flag-implementation pattern.
3. **`src/js/world.js`** — add any new furniture types needed by the room JSON (e.g., growth-chart poster, wall clock likely already exist; cabinets with white drawers may need a new type or reuse `sideTable`/`cabinet` variants).
4. No changes to `audio.js`, `main.js` boot flow, subtitle system, or render tooling.

## 7. TTS

- Voice config: `config/voices.json` (ElevenLabs, `eleven_v3` — the Persian-capable model; do NOT use `eleven_multilingual_v2`).
- Key: `F:\Animation\api.txt` → set as env `ELEVENLABS_API_KEY` when running.
- Command: `node tools/generate-voice-elevenlabs.js --ep ep02-child-fever` → writes `episodes/ep02-child-fever/audio/L01.mp3 … L16.mp3`.
- `tts` text = diacritized lines in §2, verbatim from `project 2.txt`.

## 8. Pipeline runbook (exact order)

```
# 0. author episodes/ep02-child-fever/scenario.json (schema = ep01's, §2–§5 above)
set ELEVENLABS_API_KEY=<key from F:\Animation\api.txt>
node tools/generate-voice-elevenlabs.js --ep ep02-child-fever
node tools/compute-timing.js             --ep ep02-child-fever
node tools/build-subtitles.js            --ep ep02-child-fever
node tools/preview-shots.js              --ep ep02-child-fever   # iterate vs project 2.png
node tools/render.js                     --ep ep02-child-fever
node tools/make-hook-cards.js            --ep ep02-child-fever
node tools/assemble.js                   --ep ep02-child-fever   # → episodes/ep02-child-fever/render/final.mp4
```

Hook cards: intro hook per the intro-hook pattern from ep01 (kicker «این قسمت», title «نحوه برخورد با تب در کودکان», frame from a mid-film still); outro «ادامه دارد».

## 9. Acceptance checklist

- [ ] `scenario.json` contains all 16 lines with correct speakers and verbatim diacritized `tts`
- [ ] New room `pediatric-visit-room.json` matches `project 2.png` (verified via preview stills)
- [ ] Shots follow the A/B/C axis grammar; no axis jumps
- [ ] `dangerCard`, `infantCard`, `doseCard` implemented; items sequential; no dosage shown anywhere
- [ ] `timing.json` + `subtitles.srt` generated; per-speaker subtitle colors correct
- [ ] Render 1080×1920 30fps; hook intro/outro; final.mp4 assembled
- [ ] Docs updated (`docs/EPISODE-PLAYBOOK.md`, README episode list if any)
