'use strict';

// Run from any directory with Node 24+. Only episode sound artifacts are written.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'audio/sfx');
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const round = n => Number(n.toFixed(6));
const commands = [];
function run(exe, args) {
  commands.push({ executable: exe, args });
  const result = spawnSync(exe, args, { cwd: ROOT, encoding: 'utf8', shell: false,
    timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(exe + ': ' + (result.error || result.stderr));
  return result.stdout + result.stderr;
}
function measure(file, filters = '') {
  const log = run('ffmpeg', ['-hide_banner', '-nostdin', '-i', rel(file), '-af',
    [filters, 'volumedetect'].filter(Boolean).join(','), '-f', 'null', '-']);
  const mean = /mean_volume: ([\d.-]+) dB/.exec(log);
  const peak = /max_volume: ([\d.-]+) dB/.exec(log);
  assert(mean && peak, 'Missing loudness measurement: ' + file);
  return { meanDbfs: Number(mean[1]), peakDbfs: Number(peak[1]) };
}
function probe(file) {
  return JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=sample_rate,channels', '-of', 'json', rel(file)]));
}
function encode(source, file, filter, duration) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', rel(source),
    '-af', filter, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', '-threads', '1'];
  if (duration) args.push('-t', String(duration));
  run('ffmpeg', args.concat(rel(file)));
}
const timing = read('timing.json');
const scenario = read('scenario.json');
const lines = Object.fromEntries(scenario.lines.map(l => [l.id, l]));
const times = Object.fromEntries(timing.lines.map(l => [l.id, l]));
assert.equal(timing.lines.length, 19);
assert(timing.lines.every(l => l.source === 'measured'));
fs.mkdirSync(OUT, { recursive: true });
const pack = path.join(ROOT, 'tools/Sound pack SFX');
const gobird = path.join(pack, 'GoBird Masterclass SFX Pack/GoBird Masterclass SFX Pack');
const sources = {
  murmur: path.join(pack, 'Background noise sounds/freesound_community-conversation-25675.mp3'),
  whoosh: path.join(gobird, 'DSGNWhsh_Short Whip, Short Whoosh 3_Ocular Sounds_Quick Whips_The Complete Whooshes Collection.wav'),
  fabric: path.join(gobird, 'Paper Foley Paper Rattle.wav'),
  ui: path.join(pack, 'Ui Sound Effects/Ui Click Digital 03.wav'),
};
const sourceMeasurements = Object.fromEntries(Object.entries(sources).map(([key, file]) =>
  [key, { file: rel(file), sha256: hash(file), ...measure(file), probe: probe(file) }]));
const assets = {};
function asset(key, sourceKey, filename, filter, target, metric, mixGain = 1, duration) {
  const file = path.join(OUT, filename);
  encode(sources[sourceKey], file, filter, duration);
  const before = measure(file);
  const field = metric === 'mean' ? 'meanDbfs' : 'peakDbfs';
  const gainDb = 20 * Math.log10(mixGain);
  const correctionDb = target - gainDb - before[field];
  // Re-encode from the catalog source, never from a previous generated asset.
  encode(sources[sourceKey], file, filter + ',volume=' + correctionDb + 'dB', duration);
  const actual = measure(file);
  const mixed = measure(file, 'volume=' + mixGain);
  assert(Math.abs(mixed[field] - target) <= 0.2, key + ' target mismatch');
  assert(mixed.peakDbfs <= -6, key + ' has excessive peak');
  assets[key] = { file: rel(file), source: sourceKey, filter: filter + ',volume=' + correctionDb + 'dB',
    mixGain, target: { metric: metric + ' dBFS', value: target }, beforeNormalization: before,
    fileLevels: actual, actualMixLevels: mixed, sha256: hash(file), probe: probe(file) };
  return assets[key];
}
// Limit the high-crest-factor crowd recording before mean-level matching. The
// clinic's assembler gain remains the ep02-approved 1.4, not a guessed dB value.
const bedFilter = 'highpass=f=90,volume=32dB,alimiter=limit=0.0625:attack=5:release=100:level=false';
asset('clinic', 'murmur', 'clinic-murmur.wav', bedFilter, -27, 'mean', 1.4);
// This is filtered catalog murmur, not music, synthetic silence, or a claimed
// field recording of a nursery. Remove intelligible speech-band detail.
asset('nursery', 'murmur', 'nursery-room-tone.wav',
  'highpass=f=70,lowpass=f=180:p=2,lowpass=f=180:p=2,volume=48dB,alimiter=limit=0.0625:attack=10:release=150:level=false',
  -29, 'mean');
asset('whoosh', 'whoosh', 'transition-whoosh.wav',
  'atrim=0:0.34,asetpts=PTS-STARTPTS,highpass=f=180,lowpass=f=6500,afade=t=in:d=0.008,afade=t=out:st=0.25:d=0.09',
  -16, 'peak', 1, 0.34);
asset('fabric', 'fabric', 'wiggle-fabric.wav',
  'atrim=start=0.1:end=0.7,asetpts=PTS-STARTPTS,highpass=f=150,lowpass=f=2200,afade=t=in:d=0.025,afade=t=out:st=0.45:d=0.15',
  -25, 'peak', 1, 0.6);
asset('pop', 'ui', 'forbidden-pop.wav',
  'atrim=0:0.16,asetpts=PTS-STARTPTS,lowpass=f=4500,afade=t=in:d=0.004,afade=t=out:st=0.10:d=0.06',
  -14, 'peak', 1, 0.16);
asset('bullet', 'ui', 'bullet-ui.wav',
  'atrim=0:0.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.004,afade=t=out:st=0.13:d=0.07',
  -12, 'peak', 1, 0.2);

const strip = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
const cueEvidence = [];
function cueAt(id, cue) {
  const text = strip(lines[id].tts || lines[id].display);
  const cleanCue = strip(cue);
  const index = text.indexOf(cleanCue);
  assert(index >= 0, id + ' cue missing from diacritic-stripped TTS');
  // Match coordinator: index in stripped TTS / DISPLAY length (not TTS length).
  const fraction = index / lines[id].display.length;
  const at = times[id].start + fraction * times[id].duration;
  cueEvidence.push({ id, cue, strippedCue: cleanCue, textIndex: index,
    displayLength: lines[id].display.length, fraction, unclampedAt: round(at) });
  return at;
}
const flashStart = Math.min(cueAt('L03', lines.L03.flashbackFall.cue), times.L03.end - 2.8);
const flashEnd = flashStart + lines.L03.flashbackFall.duration;
assert.equal(lines.L03.flashbackFall.duration, 2.5);
assert(flashStart >= times.L03.start && flashEnd <= times.L03.end);
const nurseryStart = cueAt('L10', lines.L10.nurseryInsert.cue);
const cuts = [
  { at: flashStart, line: 'L03', room: 'nursery', shot: 'flashback-fall', reason: 'flashback entry at text cue, clamped to end - 2.8' },
  { at: flashEnd, line: 'L03', room: 'clinic', shot: 'medium-family', reason: 'flashback return after 2.5 seconds' },
  { at: nurseryStart, line: 'L10', room: 'nursery', shot: 'nursery-wide', reason: 'تخت مستقل cue' },
  { at: times.L11.start, line: 'L11', room: 'nursery', shot: 'crib-close', reason: 'nursery-wide to crib-close' },
  ...['L13', 'L14', 'L15', 'L16', 'L17', 'L19'].map(id => ({ at: times[id].start, line: id,
    room: ['L14', 'L16', 'L19'].includes(id) ? 'nursery' : 'clinic', shot: lines[id].camera,
    reason: 'nursery insert entry/return' })),
].map(c => ({ ...c, at: round(c.at) }));
const hits = cuts.map(c => ({ at: c.at, file: assets.whoosh.file, gain: 1,
  line: c.line, purpose: c.reason, category: 'whoosh' }));
hits.push({ at: round(cueAt('L04', 'بغلش')), file: assets.fabric.file, gain: 1,
  line: 'L04', purpose: 'held baby wiggle/hug; softened Paper Foley excerpt, not recorded cloth', category: 'foley' });
for (const id of ['L11', 'L12']) {
  const config = lines[id].forbiddenItems;
  assert.equal(config.items.length, config.fractions.length);
  config.items.forEach((item, i) => hits.push({
    at: round(times[id].start + times[id].duration * config.fractions[i]),
    file: assets.pop.file, gain: 1, line: id, item, fraction: config.fractions[i],
    purpose: 'immediately crossed-out forbidden item', category: 'pop',
  }));
}
assert.deepEqual(lines.L19.endCard.fractions, [0.2, 0.4, 0.68]);
lines.L19.endCard.fractions.forEach((fraction, i) => hits.push({
  at: round(times.L19.start + times.L19.duration * fraction), file: assets.bullet.file,
  gain: 1, line: 'L19', bullet: i + 1, fraction, purpose: 'end-card bullet', category: 'UI',
}));
hits.sort((a, b) => a.at - b.at);
// Extend both beds by 150ms either side of each room switch; apply matching fades
// through the existing assembler's delay -> fade -> trim chain. The L11 shot
// switch needs a whoosh but must not restart nursery ambience.
const switches = cuts.filter((c, i) => i === 0 || c.room !== cuts[i - 1].room);
const rooms = [{ at: 0, room: 'clinic' }, ...switches, { at: timing.total, room: null }];
const beds = rooms.slice(0, -1).map((c, i) => {
  const a = assets[c.room];
  return { file: a.file, gain: a.mixGain, loop: true,
    start: round(Math.max(0, c.at - (i ? 0.15 : 0))),
    end: round(Math.min(timing.total, rooms[i + 1].at + 0.15)),
    fadeIn: i ? 0.3 : 1, fadeOut: i === rooms.length - 2 ? 1 : 0.3, room: c.room };
});
assert.equal(cuts.length, 10);
assert.equal(hits.length, 19);
assert.equal(beds.length, 10);
assert(hits.every(h => h.at >= 0 && h.at < timing.total));
const spec = {
  _comment: 'Generated by build-sound.cjs. Paths are repo-relative; seconds are MAIN timeline (exclude 0.5s intro). Shared assemble.js unchanged. Targets: ambience mean dBFS; accents peak dBFS. See sound-report.json for measurements and provenance.',
  beds, hits,
};
fs.writeFileSync(path.join(__dirname, 'sound.json'), JSON.stringify(spec, null, 2) + '\n');

// Mirror assemble.js's exact graph in an audio-only preview. No render/ writes,
// no video QA claims, and no TTS generation or paid network calls.
function mix(includeVoices, includeSfx, output) {
  const inputs = [], filters = [], labels = [];
  let n = 0;
  if (includeVoices) for (const l of timing.lines) {
    inputs.push('-i', rel(path.join(__dirname, 'audio', l.id + '.mp3')));
    filters.push('[' + n + ':a]adelay=' + Math.round(l.start * 1000) + ':all=1[d' + n + ']');
    labels.push('[d' + n++ + ']');
  }
  if (includeSfx) for (const ev of [...beds, ...hits]) {
    if (ev.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', ev.file);
    const start = ev.start || ev.at || 0;
    let f = '[' + n + ':a]volume=' + ev.gain + ',adelay=' + Math.round(start * 1000) + ':all=1';
    if (ev.fadeIn) f += ',afade=t=in:st=' + start + ':d=' + ev.fadeIn;
    if (ev.end && ev.fadeOut) f += ',afade=t=out:st=' + (ev.end - ev.fadeOut) + ':d=' + ev.fadeOut;
    if (ev.end) f += ',atrim=0:' + ev.end;
    filters.push(f + '[s' + n + ']'); labels.push('[s' + n++ + ']');
  }
  filters.push(labels.join('') + 'amix=inputs=' + labels.length + ':normalize=0,apad[out]');
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', ...inputs,
    '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2',
    '-t', String(timing.total), '-c:a', 'pcm_s24le', rel(output)]);
  return { file: rel(output), sha256: hash(output), ...measure(output), probe: probe(output) };
}
const voices = timing.lines.map(l => ({ id: l.id,
  ...measure(path.join(__dirname, 'audio', l.id + '.mp3')) }));
const preview = mix(true, true, path.join(OUT, 'mix-preview.wav'));
const sfxPreview = mix(false, true, path.join(OUT, 'sfx-preview.wav'));
assert(preview.peakDbfs < -0.1, 'Audio preview clips; do not assemble');
assert(Math.abs(Number(preview.probe.format.duration) - timing.total) < 0.001);
const gaps = [
  { room: 'clinic', start: 25.65, end: 25.95 },
  { room: 'nursery', start: 79.76, end: 80.06 },
].map(g => ({ ...g, ...measure(path.join(OUT, 'sfx-preview.wav'),
  'atrim=start=' + g.start + ':end=' + g.end + ',asetpts=PTS-STARTPTS') }));
const report = {
  episode: scenario.id, status: 'sound artifacts built and audio-only validation passed',
  mainTimelineDurationSeconds: timing.total, finalRenderQA: 'PENDING: coordinator must listen against rendered cuts, verify cue approximations, hooks and final encode',
  toolchain: { node: process.version, executable: process.execPath,
    ffmpeg: run('ffmpeg', ['-version']).split(/\r?\n/)[0] },
  inputs: { scenarioSha256: hash(path.join(__dirname, 'scenario.json')),
    timingSha256: hash(path.join(__dirname, 'timing.json')) },
  counts: { catalogSources: 4, derivedAssets: 6, beds: beds.length, hits: hits.length,
    whooshes: 10, foley: 1, forbiddenPops: 5, bulletUI: 3, audioOnlyPreviews: 2,
    wavFiles: 8, hookSounds: 0 },
  levelPolicy: { ambience: 'mean/RMS dBFS -30..-24, excluding fades; clinic -27 with gain 1.4, nursery -29',
    whoosh: 'peak dBFS -18..-12 (target -16)', UI: 'peak dBFS -14..-10 (pops -14, bullets -12)',
    foley: 'peak dBFS -25, lower than UI',
    clinicConditioning: 'Raw ep02 murmur mean -44 dBFS would be -41.1 at gain 1.4. Catalog-derived level-conditioned WAV preserves source identity and mixer gain 1.4 while meeting the ambience mean target.',
    speechPriority: 'Voices unchanged at unity. Transient accents are brief, ambience is quiet. Audio-only peak check passed; perceptual TTS dominance and audiovisual sync require coordinator listening.',
    fades: 'Room-switch crossfades 0.3s; outer fades 1s. Catalog source >60s loops without synthetic content; verify wrap audibility during coordinator listening.' },
  sources: sourceMeasurements, assets, cueEvidence, cuts,
  timingFormula: 'start + (indexOf(stripDiacritics(cue)) in stripDiacritics(tts) / display.length) * duration; L03 min(result, end - 2.8), return +2.5; fractional beats start + duration * fraction',
  voices, previews: { mix: preview, sfxOnly: sfxPreview }, measuredAmbienceGaps: gaps,
  safety: { music: false, impactSounds: false, fallAccents: 'entry/return short air whooshes only',
    fabricatedFieldRecordings: false, nurseryProvenance: 'double-lowpass-filtered catalog murmur',
    fabricProvenance: 'softened Paper Foley Paper Rattle excerpt used as fabric-like wiggle texture' },
  validation: { targetLevels: 'passed', timelineBounds: 'passed', mainDuration: 'passed',
    audioGraphCompatibility: 'same bed/hit filter order and normalize=0 as shared assemble.js',
    decodeAndPeak: 'passed for generated previews', finalRenderQA: 'not performed' },
  reproduce: ['tools\\node24.cmd episodes/ep03-baby-sleep/build-sound.cjs',
    'tools\\node24.cmd tools/assemble.js --ep ep03-baby-sleep (coordinator, after frames/hooks QA)'],
  commands,
};
fs.writeFileSync(path.join(__dirname, 'sound-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ counts: report.counts, mixPeakDbfs: preview.peakDbfs,
  duration: preview.probe.format.duration, finalRenderQA: 'pending coordinator' }, null, 2));
