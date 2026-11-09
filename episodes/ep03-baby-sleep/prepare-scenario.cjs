'use strict';

// Source text, not the plan's pronunciation table, is authoritative for every TTS byte.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'scenario/project 3.txt'), 'utf8');
const dialogue = [...source.matchAll(/^\*\*(مادر|دکتر|پدر):\*\* (.+)$/gm)];
assert.equal(dialogue.length, 18);
const endMatch = source.match(/^\*\*نوشته پایانی:\*\*\r?\n([^\r\n]+)\r?\n- ([^\r\n]+)\r?\n- ([^\r\n]+)\r?\n- ([^\r\n]+)/m);
assert.ok(endMatch);
const endText = endMatch.slice(1);
const speakerIds = { 'مادر': 'mother', 'دکتر': 'doctor', 'پدر': 'father' };
const clean = text => text.replace(/[\u064B-\u065F\u0670]/g, '');
const cameras = [
  'wide-establishing', 'medium-doctor', 'medium-family', 'close-mother-baby',
  'medium-doctor', 'medium-doctor', 'medium-family', 'medium-doctor',
  'close-father', 'medium-doctor', 'crib-close', 'crib-close', 'medium-family',
  'crib-close', 'medium-family', 'nursery-top', 'medium-family', 'close-doctor',
];
const actions = [
  'Family already seated at t=0; mother holds the two-month-old baby against her chest, leaning forward anxiously. Father sits in the second visitor chair. No walk-in.',
  'Doctor offers a calm open palm, relaxed eyebrows, and reassuring eye contact.',
  'Father speaks with tense hands. On the fall sentence, insert a 2–3 second desaturated nursery flashback, then return to medium-family. Baby drops out of frame at the parents-bed edge; show no impact, injury, or first aid. Bed-sharing is unsafe.',
  'Mother hugs baby closer on «بغلش»; baby is held throughout, gently wiggles with an alert cry-face. Alertness and crying must not imply absence of injury.',
  'Doctor is serious but calm, leaning forward on «همین الان» and emphasizing possible head injury. Immediate medical evaluation, not watchful waiting.',
  'Scene 2: doctor tilts his head with a gentle, non-accusatory question.',
  'Mother gives a small nod with a slightly embarrassed posture; baby remains held.',
  'Doctor deliberately warns about bed-sharing; pause naturally before «حتی وقتی». Brief corner prohibition card only; never imply that careful bed-sharing is safe.',
  'Father leans in, worried; static head-and-shoulders framing from the established family side of the axis.',
  'Scene 3: doctor points toward the crib illustration. On «تخت مستقل», cut from the exam room to nursery-wide and hold. Baby is on its back in a separate bare crib beside, never inside, the parents bed.',
  'Mother asks off-screen over crib-close. Pillow then blanket appear only as immediately crossed-out teaching graphics with a shake-no; do not stage an acceptable furnished crib.',
  'Over crib-close, pillow, blanket, and plush pop in sequentially, immediately crossed out, then removed. The baby stays on its back. End on only a firm flat mattress and fitted sheet.',
  'Return to the exam room; father makes a small turning gesture with his hand, never physically turning the baby.',
  'Return to crib-close: baby remains on its back with a green check. Crossed-out side/stomach silhouettes are separate teaching graphics, not poses of the real baby.',
  'Scene 4: back in exam room, mother counts three points on her fingers, hopeful; baby is held.',
  'Overhead nursery-top shows the full parents bed beside the separate crib. Subtle distance arrows emphasize near, not inside. Baby lies on its back in the bare crib.',
  'Return to exam room: father is relieved; both parents nod. Mother holds baby.',
  'Static close-doctor: warm but firm conclusion, slight smile on «جونشه».',
];
const lines = dialogue.map((match, i) => ({
  id: 'L' + String(i + 1).padStart(2, '0'),
  speaker: speakerIds[match[1]],
  display: clean(match[2]),
  tts: match[2],
  camera: cameras[i],
  action: actions[i],
}));
lines[2].flashbackFall = {
  room: 'nursery-bedroom', shot: 'flashback-fall', returnShot: 'medium-family',
  cue: 'یِهو با صدای افتادنش از خواب پَریدیم!', duration: 2.5,
  vignette: true, desaturate: true, slowMotion: true,
  showImpact: false, showInjury: false, firstAid: false, bedSharingUnsafe: true,
};
lines[7].coSleepCard = { text: 'خطر', prohibition: true, graphic: 'parents-bed-with-baby' };
lines[9].nurseryInsert = {
  room: 'nursery-bedroom', shot: 'nursery-wide', cue: 'تخت مستقل', holdThrough: 'L12',
  babyPose: 'lying', babyAt: 'cribBaby',
};
lines[10].forbiddenItems = {
  items: ['pillow', 'blanket'], fractions: [0.2, 0.6],
  crossOutImmediately: true, shakeNo: true, removeAfter: true,
};
lines[11].forbiddenItems = {
  items: ['pillow', 'blanket', 'plush'], fractions: [0.12, 0.4, 0.68],
  crossOutImmediately: true, removeAfter: true, finalContents: ['mattress', 'fittedSheet'],
};
lines[13].sleepPosition = {
  correct: 'back', check: true, forbidden: ['side', 'stomach'],
  silhouettesOnly: true, fractions: [0.12, 0.45, 0.72],
};
lines[15].nurseryTop = {
  parentsBed: 'parentsBed', cribBaby: 'cribBaby', arrows: true, separateBeds: true,
};
lines.push({
  id: 'L19', speaker: 'narrator', display: clean(endText.join(' ')),
  tts: endText.join(' '), camera: 'nursery-top',
  action: 'Doctor voice reads the exact source end-card heading and three bullets. Narrator is subtitle-only, not a character rig. Full-frame card over nursery-top; bullets appear sequentially and remain through the closing hold.',
  endCard: { title: endText[0], items: endText.slice(1), fractions: [0.2, 0.4, 0.68] },
});
const nurseryLines = new Set(['L11', 'L12', 'L14', 'L16', 'L19']);
const flags = ['flashbackFall', 'coSleepCard', 'nurseryInsert', 'forbiddenItems', 'sleepPosition', 'nurseryTop', 'endCard'];
const scenario = {
  id: 'ep03-baby-sleep', title: 'خواب ایمن نوزاد',
  subtitle: 'تخت مستقل، تشک سفت و خوابیدن به پشت', language: 'fa',
  location: 'pediatric-visit-room-ep03',
  locations: { primary: 'pediatric-visit-room-ep03', nursery: 'nursery-bedroom' },
  characters: ['doctor', 'mother', 'father', 'baby'], props: ['sleep-props'],
  speakers: {
    doctor: { label: 'دکتر', character: 'doctor', subtitleColor: 'rgba(21, 74, 138, 0.88)' },
    mother: { label: 'مادر', character: 'mother', subtitleColor: 'rgba(70, 74, 80, 0.88)' },
    father: { label: 'پدر', character: 'father', subtitleColor: 'rgba(166, 73, 12, 0.88)' },
    narrator: { label: 'راوی', character: null, voice: 'doctor', subtitleColor: 'rgba(100, 48, 145, 0.88)' },
  },
  hooks: {
    intro: { duration: 0.5, kicker: 'این قسمت', title: 'خواب ایمن نوزاد', frame: 3396, frameAt: 0.42 },
    outro: { duration: 1.0, title: 'ادامه دارد', frameAt: 0.42 },
  },
  lines,
  staging: {
    _comment: 'Effect content lives on scenario lines; plan entries activate it. Secondary-room switching and metadata-only narrator require coordinator engine support; see SCENARIO-CONTRACT.md. Existing childSit is only a visitor-chair mark reused by father, not a child character.',
    shots: {
      'close-mother-baby': { pos: [-8, 26, -8], target: [20, 17, 16], dolly: 0 },
      'close-father': { pos: [-12, 22, -33], target: [24, 16, -8], dolly: 0 },
    },
    initial: [
      { char: 'doctor', at: 'doctorSit', sit: true, face: 'doctorFace' },
      { char: 'mother', at: 'motherSit', sit: true, face: 'familyFace' },
      { char: 'father', at: 'childSit', sit: true, face: 'familyFace' },
      { char: 'baby', at: 'motherSit', pose: 'held', parent: 'mother' },
    ],
    inserts: {
      room: 'nursery-bedroom',
      shots: ['flashback-fall', 'nursery-wide', 'crib-close', 'nursery-top'],
      baby: { char: 'baby', at: 'cribBaby', pose: 'lying', returnParent: 'mother', returnPose: 'held' },
    },
    plan: lines.slice(1).map(line => {
      const entry = { id: line.id, shot: line.camera, room: nurseryLines.has(line.id) ? 'nursery-bedroom' : 'pediatric-visit-room' };
      for (const flag of flags) if (line[flag]) entry[flag] = true;
      return entry;
    }),
    ending: { leadIn: 7.5, camPush: { py: 0, pz: 0, dur: 6.4 }, fadeOut: 0.85 },
  },
  endCard: { title: endText[0], items: endText.slice(1) },
};
fs.writeFileSync(path.join(__dirname, 'scenario.json'), JSON.stringify(scenario, null, 2) + '\n');
console.log('scenario.json: 18 source-verbatim dialogue lines + source-verbatim end-card L19');
