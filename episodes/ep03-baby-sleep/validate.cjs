'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const source = read('scenario/project 3.txt');
const scenario = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenario.json'), 'utf8'));
const cfg = json('config/voices.json').elevenlabs;
const dialogue = [...source.matchAll(/^\*\*(مادر|دکتر|پدر):\*\* (.+)$/gm)];
const ending = source.match(/^\*\*نوشته پایانی:\*\*\r?\n([^\r\n]+)\r?\n- ([^\r\n]+)\r?\n- ([^\r\n]+)\r?\n- ([^\r\n]+)/m).slice(1);
const speakers = { 'مادر': 'mother', 'دکتر': 'doctor', 'پدر': 'father' };
const clean = text => text.replace(/[\u064B-\u065F\u0670]/g, '');
const plan = read('scenario/ep03-plan.md');
assert.equal(scenario.lines.length, 19);
assert.equal(cfg.model_id, 'eleven_v3');
assert.notEqual(cfg.voices.father.voice_id, cfg.voices.doctor.voice_id);
assert.equal(cfg.voices.narrator.voice_id, cfg.voices.doctor.voice_id);
assert.deepEqual(cfg.voices.narrator.settings, cfg.voices.doctor.settings);
assert.equal(scenario.characters.includes('narrator'), false);
assert.equal(scenario.characters.includes('child'), false);
assert.equal(new Set(Object.values(scenario.speakers).map(s => s.subtitleColor)).size, 4);
assert.equal(scenario.staging.inserts.room, 'nursery-bedroom');
assert.equal(scenario.locations.nursery, 'nursery-bedroom');
assert.equal(scenario.hooks.intro.duration, 0.5);
assert.equal(scenario.hooks.outro.duration, 1);
const expectedShots = ['wide-establishing', 'medium-doctor', 'medium-family', 'close-mother-baby', 'medium-doctor', 'medium-doctor', 'medium-family', 'medium-doctor', 'close-father', 'medium-doctor', 'crib-close', 'crib-close', 'medium-family', 'crib-close', 'medium-family', 'nursery-top', 'medium-family', 'close-doctor', 'nursery-top'];
assert.deepEqual(scenario.lines.map(l => l.camera), expectedShots);
const requiredFlags = { L03: ['flashbackFall'], L08: ['coSleepCard'], L10: ['nurseryInsert'], L11: ['forbiddenItems'], L12: ['forbiddenItems'], L14: ['sleepPosition'], L16: ['nurseryTop'], L19: ['endCard'] };
assert.equal(scenario.staging.plan.length, 18);
for (const line of scenario.lines.slice(1)) {
  const entry = scenario.staging.plan.find(p => p.id === line.id);
  assert.equal(entry.shot, line.camera);
  for (const flag of requiredFlags[line.id] || []) {
    assert.equal(entry[flag], true);
    assert.equal(typeof line[flag], 'object');
  }
}
assert.equal(scenario.lines[2].flashbackFall.showInjury, false);
assert.equal(scenario.lines[2].flashbackFall.showImpact, false);
assert.equal(scenario.lines[2].flashbackFall.firstAid, false);
for (const i of [10, 11]) assert.equal(scenario.lines[i].forbiddenItems.crossOutImmediately, true);
assert.equal(scenario.lines[13].sleepPosition.silhouettesOnly, true);
assert.equal(scenario.lines[15].nurseryTop.separateBeds, true);
assert.deepEqual(scenario.endCard, { title: ending[0], items: ending.slice(1) });
assert.equal(scenario.lines[18].endCard.title, ending[0]);
assert.deepEqual(scenario.lines[18].endCard.items, ending.slice(1));
const comparisons = scenario.lines.map((line, i) => {
  const expected = i < 18 ? dialogue[i][2] : ending.join(' ');
  assert.equal(line.id, 'L' + String(i + 1).padStart(2, '0'));
  assert.equal(line.speaker, i < 18 ? speakers[dialogue[i][1]] : 'narrator');
  assert.ok(Buffer.from(line.tts, 'utf8').equals(Buffer.from(expected, 'utf8')), line.id + ' must be source-verbatim UTF-8');
  assert.equal(line.display, clean(expected));
  const planRow = plan.split(/\r?\n/).find(row => row.startsWith('| ' + line.id + ' |'));
  const planTts = planRow ? planRow.split('|')[4].trim() : null;
  return {
    id: line.id, speaker: line.speaker,
    sourceLines: i < 18 ? [source.slice(0, dialogue[i].index).split('\n').length] : [64, 65, 66, 67],
    comparison: i < 18 ? 'Exact dialogue payload after source speaker label; no normalization' : 'Exact heading + three bullet payloads joined with single spaces; structural bullet markers excluded',
    sourceText: expected, scenarioTts: line.tts, equal: true,
    utf8Bytes: Buffer.byteLength(expected), sourceSha256: hash(expected), ttsSha256: hash(line.tts),
    planTableDiffers: planTts === null ? null : planTts !== expected,
  };
});
const report = {
  source: 'scenario/project 3.txt', sourceSha256: hash(source),
  scenarioSha256: hash(fs.readFileSync(path.join(__dirname, 'scenario.json'))),
  comparisonMethod: 'UTF-8 byte equality; punctuation, diacritics, Arabic/Persian letters and ZWNJ are preserved',
  passed: true, comparedLines: comparisons.length,
  planDialogueDifferences: comparisons.filter(c => c.planTableDiffers).map(c => c.id),
  comparisons,
};
if (process.argv.includes('--artifacts')) {
  const timing = JSON.parse(fs.readFileSync(path.join(__dirname, 'timing.json'), 'utf8'));
  const srt = fs.readFileSync(path.join(__dirname, 'subtitles.srt'), 'utf8');
  const cues = srt.trim().split(/\r?\n\r?\n/).map(block => {
    const [index, range, ...text] = block.split(/\r?\n/);
    const parse = value => {
      const [h, m, s, ms] = value.split(/[:,]/).map(Number);
      return h * 3600 + m * 60 + s + ms / 1000;
    };
    const [start, end] = range.split(' --> ').map(parse);
    return { index: Number(index), start, end, text: text.join(' ') };
  });
  assert.equal(timing.lines.length, 19);
  let previousEnd = 0;
  cues.forEach((cue, i) => {
    assert.equal(cue.index, i + 1);
    assert.ok(cue.start >= previousEnd - 0.011);
    assert.ok(cue.end > cue.start);
    assert.ok(cue.text.length <= 48);
    previousEnd = cue.end;
  });
  const durations = [];
  for (const [i, line] of scenario.lines.entries()) {
    const measured = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(__dirname, 'audio', line.id + '.mp3')], { encoding: 'utf8' }).trim());
    execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(__dirname, 'audio', line.id + '.mp3'), '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    const t = timing.lines[i];
    assert.equal(t.id, line.id);
    assert.equal(t.speaker, line.speaker);
    assert.equal(t.source, 'measured');
    assert.ok(Number.isFinite(measured) && measured > 0.2);
    assert.ok(Math.abs(t.duration - measured) <= 0.006);
    assert.ok(Math.abs(t.end - t.start - measured) <= 0.011);
    const lineCues = cues.filter(cue => cue.start >= t.start - 0.001 && cue.start < t.end);
    assert.equal(lineCues.map(c => c.text).join(' '), line.display);
    assert.ok(Math.abs(lineCues.at(-1).end - t.end) <= 0.011);
    durations.push({ id: line.id, duration: measured, source: t.source, cues: lineCues.length });
  }
  assert.equal(timing.fps, 30);
  assert.ok(Math.abs(timing.total - timing.lines.at(-1).end - timing.endCard) <= 0.011);
  report.artifacts = { passed: true, audioFiles: 19, timingSources: '19/19 measured with ffprobe', subtitleCues: cues.length, decodeChecks: '19/19 decoded by ffmpeg without errors', totalSeconds: timing.total, durations };
}
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log('PASS: 19/19 source-verbatim UTF-8 comparisons; speaker/shot/staging/voice contracts valid.');
console.log('Plan table differs from authoritative source on: ' + report.planDialogueDifferences.join(', '));
if (report.artifacts) console.log('PASS: 19 ffprobe-measured MP3s; ' + report.artifacts.subtitleCues + ' subtitle cues; total ' + report.artifacts.totalSeconds + 's.');
console.log('Evidence: episodes/ep03-baby-sleep/validation.json');
