// Builds subtitles.srt from scenario.json + timing.json.
// Long lines are split into cues of at most ~48 characters at word boundaries,
// with cue durations proportional to character count.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_CHARS = 48;

const scenario = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenario.json'), 'utf8'));
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'timing.json'), 'utf8'));

function splitText(text) {
  const words = text.split(/\s+/);
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > MAX_CHARS) {
      chunks.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function fmt(sec) {
  const ms = Math.round(sec * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const rest = String(ms % 1000).padStart(3, '0');
  return h + ':' + m + ':' + s + ',' + rest;
}

let out = '';
let index = 1;
for (const L of timing.lines) {
  const scenarioLine = scenario.lines.find((x) => x.id === L.id);
  const chunks = splitText(scenarioLine.display);
  const totalChars = chunks.reduce((a, c) => a + c.length, 0);
  let t = L.start;
  for (const chunk of chunks) {
    const dur = L.duration * (chunk.length / totalChars);
    out += index + '\n' + fmt(t) + ' --> ' + fmt(t + dur) + '\n' + chunk + '\n\n';
    index++;
    t += dur;
  }
}

fs.writeFileSync(path.join(ROOT, 'subtitles.srt'), out, 'utf8');
console.log('subtitles.srt written (' + (index - 1) + ' cues)');
