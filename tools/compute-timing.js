// Computes per-line start/end times for the master timeline.
// Uses real audio durations (via ffprobe) when audio/<id>.mp3 exists,
// otherwise falls back to a text-length estimate.
// Output: timing.json (consumed by the browser app, subtitles and the assembler).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEAD_IN = 1.4;   // seconds before the first line
const GAP = 0.45;      // pause between lines
// Extra beat after L01 so the family can finish the walk-in / sit before L02.
const SETTLE_AFTER_L01 = 1.9;
const END_CARD = 7.5;  // closing summary duration

function estimateDuration(text) {
  const clean = text.replace(/[\u064B-\u0652\u0670]/g, ''); // ignore diacritics
  return Math.min(40, Math.max(2.2, Math.round(((clean.length / 14) + 0.9) * 10) / 10));
}

function ffprobeDuration(file) {
  try {
    const out = execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { stdio: ['ignore', 'pipe', 'ignore'] });
    return parseFloat(out.toString().trim());
  } catch (e) {
    return null;
  }
}

// Fallback when ffprobe is not on PATH: read MPEG frame header bitrate
// (ElevenLabs mp3_44100_128 is CBR 128 kbps — good enough for sync).
function mp3DurationFallback(file) {
  try {
    const buf = fs.readFileSync(file);
    let i = 0;
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) { // ID3
      const size = (buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f);
      i = 10 + size;
    }
    while (i + 4 < buf.length && !(buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0)) i++;
    if (i + 4 >= buf.length) return null;
    const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
    const br = bitrateTable[(buf[i + 2] >> 4) & 0x0f];
    if (!br) return null;
    const audioBytes = buf.length - i;
    return (audioBytes * 8) / (br * 1000);
  } catch (e) {
    return null;
  }
}

const scenario = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenario.json'), 'utf8'));
let t = LEAD_IN;
const lines = [];
for (const L of scenario.lines) {
  let dur = null;
  let source = 'estimated';
  const audioFile = path.join(ROOT, 'audio', L.id + '.mp3');
  if (fs.existsSync(audioFile)) {
    let d = ffprobeDuration(audioFile);
    if (d && isFinite(d) && d > 0.2) {
      dur = d; source = 'measured';
    } else {
      d = mp3DurationFallback(audioFile);
      if (d && isFinite(d) && d > 0.2) { dur = d; source = 'mp3-header'; }
    }
  }
  if (dur == null) dur = estimateDuration(L.tts);
  lines.push({
    id: L.id,
    speaker: L.speaker,
    start: +t.toFixed(2),
    end: +(t + dur).toFixed(2),
    duration: +dur.toFixed(2),
    source: source,
  });
  t += dur + GAP;
  if (L.id === 'L01') t += SETTLE_AFTER_L01;
}
const total = +(t - GAP + END_CARD).toFixed(2);

const timing = { fps: 30, leadIn: LEAD_IN, gap: GAP, endCard: END_CARD, total, lines };
fs.writeFileSync(path.join(ROOT, 'timing.json'), JSON.stringify(timing, null, 2));

for (const L of lines) {
  console.log(L.id.padEnd(5), L.speaker.padEnd(7),
    (L.start.toFixed(2) + 's -> ' + L.end.toFixed(2) + 's').padEnd(22),
    '(' + L.source + ')');
}
console.log('Total duration: ' + total.toFixed(2) + 's  ->  timing.json');
