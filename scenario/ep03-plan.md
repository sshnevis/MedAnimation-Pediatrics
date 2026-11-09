# Episode 3 Plan — «خواب ایمن نوزاد» (Safe Infant Sleep)

> Planning document produced before implementation. The implementation session must follow this
> document exactly. Sources of truth:
> - `scenario/project 3.txt` — dialogue (already diacritized) + final medical corrections + ending visual suggestion
> - `scenario/project 3.png` — visual reference for the nursery room (crib, dresser, night light, plant)
> - Existing engine: `src/js/*`, `library/*`, `episodes/ep02-child-fever/scenario.json` (schema reference)

---

## 1. Episode identity

| Field | Value |
|---|---|
| id | `ep03-baby-sleep` |
| title | خواب ایمن نوزاد |
| locations | ① `pediatric-visit-room` (EXISTING ep02 room, reused for scenes 1–2 and the exam-room dialogue of scenes 3–4) ② `nursery-bedroom` (NEW room JSON, built to match `project 3.png` plus parents' bed — see §4) |
| characters | `doctor`, `mother` (reuse); `father` (NEW character JSON); `baby` (NEW character JSON, 2-month-old boy) — the ep01/ep02 `child` does NOT appear in this episode |
| props | `sleep-props` (NEW pack: crib bedding items — mattress, fitted sheet, pillow, small blanket, plush toy; the pillow/blanket/plush are used ONLY in the "forbidden items" visual, see §5 medical safety) |
| aspect / resolution | 9:16, 1080×1920, 30 FPS (same as ep01/ep02) |
| target duration | ~90–120 s (driven by real TTS durations, not estimates) |

## 2. Line breakdown (L01…L18)

Rules:
- `display` = clean subtitle text (diacritics stripped).
- `tts` = diacritized text copied **verbatim** from `scenario/project 3.txt` (its first block, the 4-scene dialogue).
- Scene boundaries from the source (صحنه اول…چهارم) map to shot/staging groups below.
- The final «نوشته پایانی» bullet list is NOT a dialogue line — it is the endCard (§5); the doctor voice reads it (see §7, decision D2).

| id | speaker | display (subtitle) | tts (verbatim) | shot | staging notes |
|---|---|---|---|---|---|
| L01 | mother | سلام آقای دکتر! یه اتفاق خیلی بد افتاده! | سَلام آقای دُکتر! یه اتفاق خیلی بد افتاده! | `wide-establishing` | Family enters already seated holding baby (no walk-in — same time-saving pattern as ep02); mother holds baby to chest, agitated lean forward |
| L02 | doctor | سلام. آروم باشید، چی شده؟ | سَلام. آروم باشید، چی شده؟ | `medium-doctor` | Calm, reassuring open-palm gesture; eyebrows relaxed |
| L03 | father | دیشب پسرمون کنار خودمون روی تخت خوابیده بود. ما هم خسته بودیم و خوابمون برد. یهو با صدای افتادنش از خواب پریدیم! نوزاد از تخت افتاده بود پایین! | دیشب پِسَرمون کنار خودمون روی تخت خوابیده بود. ما هم خسته بودیم و خوابمون بُرد. یِهو با صدای افتادنش از خواب پَریدیم! نوزاد از تخت افتاده بود پایین! | `medium-family` → `flashback-fall` → `medium-family` | Father distressed, hands tense. Mid-line, cut to the stylized flashback insert (§5.1, ~2–3 s), then back. Decision D1 |
| L04 | mother | خیلی ترسیدیم دکتر! وقتی بغلش کردیم گریه می‌کرد و هوشیار بود. | خیلی تَرسیدیم دُکتر! وقتی بَغلش کردیم گریه می‌کرد و هوشیار بود. | `close-mother-baby` | Mother hugs baby tighter on «بغلش»; baby wiggles in her arms (alert, moving) |
| L05 | doctor | می‌فهمم چقدر نگران شدید. اما هوشیار بودن به‌تنهایی آسیب رو رد نمی‌کنه. باید همین الان از نظر آسیب احتمالی، به‌خصوص ضربه به سر، بررسی بشه. | می‌فهمم چقدر نگران شدید. امّا هوشیار بودن به‌تنهایی آسیب رو رَد نمی‌کنه. باید همین الان از نظر آسیب احتمالی، به‌خصوص ضربه به سر، بررسی بشه. | `medium-doctor` | Serious but calm; small emphatic gesture on «ضربه به سر»; leans forward on «همین الان». Key medical beat — no trivializing |
| L06 | doctor | یه سؤال مهم؛ کوچولوتون همیشه کنار خودتون می‌خوابه؟ | یه سؤال مُهم؛ کوچولوتون هَمیشه کَنار خودتون می‌خوابِه؟ | `medium-doctor` | Scene 2 starts; questioning tilt of head, gentle tone (not accusatory) |
| L07 | mother | بله دکتر، از وقتی به دنیا اومده، توی تخت خودمون می‌خوابه. | بله دُکتر، اَز وقتی به دنیا اومده، توی تخت خودمون می‌خوابه. | `medium-family` | Small nod; slightly embarrassed posture |
| L08 | doctor | ببینید، خوابیدن نوزاد در تخت والدین خطر خفگی و حوادث مرتبط با خواب رو افزایش می‌ده. حتی وقتی خیلی مراقب باشید، ممکنه یک لحظه غفلت خطرناک باشه! | ببینید، خوابیدن نوزاد در تخت والدین خَطَرِ خِفگی و حوادثِ مَربوط با خواب رو اِضافِه می‌ده. حَتی وقتی خیلی مَراقِب باشید، مُمکِنِه یك لحظه غِفلت خَطرناک باشِه! | `medium-doctor` | The episode's central warning; deliberate slow hand gesture; brief pause before «حتی وقتی»; serious face. Optional `coSleepCard` mini-card, see §5.2 |
| L09 | father | پس جای خواب ایمنش کجاست؟ | پَس جای خوابِ اِیمَنِش کجاست؟ | `close-father` | Worried, leaning in — hands the episode to scene 3 |
| L10 | doctor | بهترین کار اینه که تا حداقل شش ماهگی، نوزاد توی اتاق شما، اما در تخت مستقل خودش بخوابه. بهتره این کار تا یک‌سالگی هم ادامه پیدا کنه. | بهترین کار اینه که تا حداقل شیش ماهگی، نوزاد توی اتاق شما، امّا در تخت مُستقل خودش بخوابِه. بِهتِرِه این کار تا یك‌سالگی هَم اِدامه پیدا کُنِه. | `medium-doctor` → `nursery-wide` | Scene 3 starts. On «تخت مستقل», cut to the nursery room: crib beside parents' bed, baby lying on back in crib (the scenario stage direction: doctor points to the crib image) |
| L11 | mother | داخل تختش چی بذاریم؟ بالش و پتوی کوچیک چطور؟ | داخل تختش چی بذاریم؟ بالش و پَتوی کوچیک چُطور؟ | `crib-close` (voiced over nursery insert) | Keep the nursery insert during mother's off-screen question — pillow/blanket appear one by one in the crib, then shake-no animation |
| L12 | doctor | هیچ‌کدوم! تشک باید صاف و سفت باشه و فقط یک ملافه‌ی کش‌دار داشته باشه. بالش، پتو، عروسک و هر وسیله‌ی نرم و اضافی هم کاملاً ممنوعه. | هیچ‌کدوم! تَشک باید صاف و سِفت باشِه و فَقط یك مَلافه‌ی کِش‌دار داشته باشِه. بالش، پتو، عروسک و هَر وسیله‌ی نَرم و اِضافی هَم کاملاً مَمنوعِه. | `crib-close` | Each forbidden item (pillow, blanket, plush) pops into the crib then gets crossed out / slides out, staggered across the line duration (same sequential-item pattern as ep02's dangerCard) |
| L13 | father | حتی موقع خواب به پهلو یا روی شکم هم نذاریم؟ | حَتی مَوقع خواب بِه پِهلو یا روی شِکم هَم نَذاریم؟ | `medium-family` (exam room) | Back to exam room; father mimics turning gesture with hand |
| L14 | doctor | دقیقاً! همیشه نوزاد رو به پشت بخوابونید؛ نه به پهلو و نه روی شکم. | دقیقاً! هَمیشه نوزاد رو بِه پُشت بخوابونید؛ نَه بِه پِهلو و نَه روی شِکم. | `crib-close` | Back to crib insert: baby shown on back; small check mark; quick side/stomach silhouettes crossed out (§5.3) |
| L15 | mother | پس تخت جدا، تشک سفت و خوابیدن به پشت! درست متوجه شدم؟ | پَس تخت جُدا، تَشک سِفت و خوابیدن بِه پُشت! دُرُست مِتوجِه شُدم؟ | `medium-family` | Scene 4; mother counts the points on her fingers, hopeful face |
| L16 | doctor | آفرین! و یادتون باشه، تخت نوزاد باید نزدیک تخت شما باشه، نه داخل تخت شما! | آفرین! و یادتون باشِه، تخت نوزاد باید نَزدیک تخت شما باشِه، نَه داخل تخت شما! | `nursery-top` | THE key visual (scenario's explicit ending suggestion): overhead/top view of the bedroom — parents' bed and the separate crib side by side; small arrows/distance cues between them |
| L17 | father | حتماً از امشب رعایت می‌کنیم. واقعاً نمی‌دونستیم این موضوع این‌قدر مهمه. | حَتماً اَز اِمشب رِعایت می‌کُنیم. واقعاً نمی‌دونُستیم این مَوضوع این‌قَد مُهِمِه. | `medium-family` | Father relieved; both parents nod |
| L18 | doctor | خواب ایمن فقط برای راحتی نوزاد نیست؛ برای حفظ جونشه. پس این چند نکته‌ی ساده رو جدی بگیرید! | خوابِ اِیمَن فَقط بَرای راحتی نوزاد نیسْت؛ بَرای حِفظِ جونشِه. پَس این چَند نُکته‌ی سادِه رو جِدّی بَگیرید! | `close-doctor` | Warm, firm closing; slight smile on «جونش» |
| endCard | — | (written card, §5.4) | doctor voice reads: «خواب ایمن نوزاد را جدی بگیریم: همیشه به پشت بخوابانید. در تخت مستقل و در اتاق والدین بخوابانید. از بالش، پتو و وسایل نرم استفاده نکنید.» | `endCard` | Full-frame card over nursery-top backdrop; 3 bullet items appear sequentially; added as a real dialogue line `L19` (speaker `narrator`, doctor voice) so timing/subtitles stay data-driven |

Notes:
- L03/L12/L14 have mid-line shot changes; timeline must cut on sentence boundaries within the line's real TTS duration (fractions of `timing.json`, same technique as ep02's L11 insert).
- The baby never speaks; it only animates (wiggle, cry-face, sleep breathing in crib).

## 3. Shot system (3-camera grammar + nursery shots)

Exam-room shots reuse the ep02 `pediatric-visit-room.json` `shots{}` definitions unchanged:
`wide-establishing`, `medium-doctor`, `medium-family`, `close-mother`, `close-doctor`. Add:

| shot | room | framing |
|---|---|---|
| `close-mother-baby` | exam room | Tighter two-shot: mother head-and-shoulders with baby bundle in arms (baby visible in her arms) |
| `close-father` | exam room | Head-and-shoulders of father (NEW rig), static |
| `flashback-fall` | nursery | Stylized insert: parents' bed edge, baby at the edge, slow motion drop with a soft vignette/desaturation flag; ~2–3 s |
| `nursery-wide` | nursery | Eye-level view of the crib beside the parents' bed (per PNG: crib center, dresser left, night-light table right) |
| `crib-close` | nursery | Insert of the crib interior: mattress + fitted sheet, baby on back; items pop/cross out here |
| `nursery-top` | nursery | High overhead view showing parents' bed + crib side by side (the «نزدیک، نه داخل» message) |

Axis discipline: exam-room shots keep doctor one side / family the other as in ep02. Nursery insert shots are self-contained (no cross-cutting mid-axis).

## 4. NEW room: `library/room/nursery-bedroom.json` — match `project 3.png` (+ parents' bed)

Build with the existing room JSON schema (`size`, `wallHeight`, `palette`, `window`, `furniture[]`, `blocking{}`, `shots{}`). Enumerated elements from the reference PNG:

**Shell**
- Warm gray-green walls with white chair-rail molding bands; light wood plank floor; cream rug (bottom-left of PNG); white curtain on the right edge (window light source from the right in the PNG — keep key light consistent with QUALITY_RULES lighting recipe).

**Furniture (left → right per PNG)**
- Second bed partially visible at far left (parents' bed — extend it into a full bed so the `nursery-top` shot can show both beds; this is the scenario's ending requirement, decision D4).
- White/wood dresser with two drawers (knobs, cutout handles) + folded blanket and plush on top + potted plant (white ribbed pot, green leaves).
- **Crib (NEW furniture type in `world.js`)**: white frame, wooden natural-color slats all around, flat firm mattress + white fitted sheet, baby lying on its back. No pillow/blanket/plush inside except during the L12 forbidden-item gag.
- Round wooden side table + birdcage-style night light (warm glow — emissive material + point light), white round stool leg visible.
- Wall: framed thermometer/growth gauge poster above the crib (simple frame + tick marks, no readable numbers needed).

**Blocking marks**: `cribBaby` (baby lying in crib), `parentsBed` (parents' bed position for `nursery-top`), `dresserFace`, `nightstandFace`.

**Palette**: sampled from PNG — warm greys/greens, white furniture frames, natural oak wood, cream textiles, warm amber night-light glow.

**Verification loop (mandatory)**: `node tools/preview-shots.js --ep ep03-baby-sleep` stills compared against `project 3.png` panel-by-panel, iterated until layout/palette/furniture match; then the z-fight gate (`tools/node24.cmd tools/zfight-diag.js --ep ep03-baby-sleep` → PASS) before render.

## 5. New visual/timeline effect flags (in `src/js/timeline.js`)

Following the existing per-line flag pattern (`foods`/`warning`/`dangerCard`…):

1. **`flashbackFall`** (L03): brief vignette + desaturation + slow-motion baby-drop animation at the parents' bed edge. No injury depicted — the baby lands off-frame/at mattress level, then cut back. Non-graphic, non-frightening (target audience is parents; keep tone educational, like ep02's danger card).
2. **`coSleepCard`** (L08, optional if the line runs long enough): small corner graphic — parents' bed with baby, red prohibition ring; no extra text beyond «خطر».
3. **`forbiddenItems`** (L12): sequential pop + cross-out of pillow → blanket → plush inside the crib-close insert.
4. **`sleepPosition`** (L14): baby on back with green check; crossed-out side/stomach silhouettes.
5. **`nurseryTop`** (L16): the overhead two-beds shot with a subtle arrow from crib to parents' bed («نزدیک، نه داخل»).
6. **`endCard`** (L19): title «خواب ایمن نوزاد را جدی بگیریم» + 3 bullets appearing sequentially over nursery-top backdrop: همیشه به پشت بخوابانید / در تخت مستقل و در اتاق والدین بخوابانید / از بالش، پتو و وسایل نرم استفاده نکنید.

**Medical-safety constraints (from the source's correction list — must be respected):**
- Never imply co-sleeping is acceptable "if careful"; the danger framing stays (L08).
- The fall (flashback) must not turn into first-aid instruction or show injury; the message is «هوشیار بودن ≠ رد شدن آسیب» → immediate medical evaluation.
- Forbidden items shown only to be crossed out; end-card wording must stay verbatim from the source bullet list.
- No dosage/medication content at all in this episode (n/a, but keep the rule active).

## 6. NEW characters

1. **`library/characters/father.json`** — reuse the adult rig pattern from `mother.json`/`doctor.json`: male adult proportions, short dark hair, distinct outfit color (e.g., dark blue/green shirt vs mother's palette), `subtitleColor` distinct from doctor (teal) and mother (rose). Subtitle color proposal: **orange**.
2. **`library/characters/baby.json`** — NEW much smaller proportions (oversized head, tiny limbs, no walking): two poses needed:
   - `held` — bundle in mother's arms (parented offset attach + slight wiggle/cry animation during L03–L04).
   - `lying` — on its back in the crib (gentle sleep-breathing scale animation on the torso).
   Engine note: `buildCharacter` needs a baby scale variant; the held/lying pose hooks go through `characters.js` per-frame pose functions (episode-agnostic: any character def with `poses: {held, lying}`).
3. Voice: `father` needs a new entry in `config/voices.json` (Decision D3) — new male ElevenLabs voice ID; `baby` has no voice.

## 7. TTS

- Model: ElevenLabs `eleven_v3` (Persian-capable — playbook lesson; NOT `eleven_multilingual_v2`).
- Voices: `doctor`, `mother` unchanged from ep02 config; `father` = new male voice (D3); `narrator`/endCard line L19 uses the doctor voice (D2 default).
- Key: `F:\Animation\api.txt` → `ELEVENLABS_API_KEY`; output `episodes/ep03-baby-sleep/audio/L01.mp3 … L19.mp3`.

## 8. Pipeline runbook (exact order)

```
# 0. author episodes/ep03-baby-sleep/scenario.json (schema = ep02's, per §2–§5)
set ELEVENLABS_API_KEY=<key from F:\Animation\api.txt>
node tools/generate-voice-elevenlabs.js --ep ep03-baby-sleep
node tools/compute-timing.js             --ep ep03-baby-sleep
node tools/build-subtitles.js            --ep ep03-baby-sleep
node tools/preview-shots.js              --ep ep03-baby-sleep   # iterate vs project 3.png
node tools/node24.cmd tools/zfight-diag.js --ep ep03-baby-sleep # must PASS before render
node tools/render.js                     --ep ep03-baby-sleep
node tools/make-hook-cards.js            --ep ep03-baby-sleep
node tools/assemble.js                   --ep ep03-baby-sleep   # → render/final.mp4
```

Sound design (mandatory, per playbook step 6): ambience bed for exam room (reuse ep02 ambience choices), softer nursery ambience (night-light room tone); whoosh on all shot cuts into/out of the nursery inserts and flashback; soft foley for baby wiggle/crib items; UI tone on end-card bullets; respect catalog mixing levels (TTS always dominant). Catalog: `tools/Sound pack SFX/SOUND-CATALOG.md`.

Hook cards: intro hook (kicker «این قسمت», title «خواب ایمن نوزاد», mid-film frame — suggested: `nursery-top` two-beds shot), outro «ادامه دارد».

## 9. Decisions taken by default (override any before implementation)

| # | Decision | Default taken | Alternatives |
|---|---|---|---|
| D1 | L03 fall flashback | Yes — brief stylized insert (~2–3 s) | Dialogue-only in exam room |
| D2 | Final summary card | Voiced — doctor voice reads the 3 bullets as L19 | Silent card (needs a timed silent gap) |
| D3 | Father voice | New male ElevenLabs voice entry in `config/voices.json` | Reuse existing voice variant (not recommended) |
| D4 | Nursery parents' bed | Included — required for the L16 overhead message shot | Crib only, strict-PNG |

## 10. Acceptance checklist

- [ ] `scenario.json` contains all 19 lines (L01…L18 + endCard L19) with correct speakers and verbatim diacritized `tts`
- [ ] `father.json` + `baby.json` character defs; baby has working `held` and `lying` poses
- [ ] New room `nursery-bedroom.json` matches `project 3.png` (verified via preview stills); parents' bed + crib side by side visible in `nursery-top`
- [ ] Exam-room scenes reuse `pediatric-visit-room` shots unchanged; axis discipline kept
- [ ] `flashbackFall`, `forbiddenItems`, `sleepPosition`, `nurseryTop`, `endCard` flags implemented; forbidden items only appear to be crossed out
- [ ] Medical-safety constraints §5 respected
- [ ] `timing.json` + `subtitles.srt` generated; 4 distinct subtitle colors (doctor/mother/father/narrator)
- [ ] Z-fight gate prints PASS
- [ ] Sound design applied per catalog mixing levels; TTS dominant
- [ ] Render 1080×1920 30fps; hook intro/outro; `final.mp4` assembled
- [ ] Docs updated (`docs/EPISODE-PLAYBOOK.md` lessons, README episode list)
