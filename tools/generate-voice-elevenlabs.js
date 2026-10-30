// Generates one MP3 per dialogue line with ElevenLabs TTS.
// Persian is supported by the flash/turbo v2.5 models and eleven_v3 (NOT by eleven_multilingual_v2).
//
// Usage:
//   1) Put your voice IDs in config/voices.json  (find them at https://elevenlabs.io -> Voices)
//   2) set ELEVENLABS_API_KEY=...                (https://elevenlabs.io -> Profile)
//   3) node tools/generate-voice-elevenlabs.js [--model eleven_flash_v2_5] [--ep <episode-id>]
//
// The text spoken is each line's "tts" field (formal spelling with diacritics for correct pronunciation).
// Afterwards run:  node tools/compute-timing.js  &&  node tools/build-subtitles.js
const fs = require('fs');
const path = require('path');
const { resolveEp } = require('./ep');

const { id: EP, ROOT, EP_DIR } = resolveEp();

// --- tiny arg parsing ---
let model = 'eleven_flash_v2_5';
const argv = process.argv.slice(2);
const mi = argv.indexOf('--model');
if (mi !== -1 && argv[mi + 1]) model = argv[mi + 1];

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ERROR: set your key first:  set ELEVENLABS_API_KEY=sk_...   (or export in Git Bash)');
  process.exit(1);
}

const scenario = JSON.parse(fs.readFileSync(path.join(EP_DIR, 'scenario.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'voices.json'), 'utf8')).elevenlabs;
if (argv.indexOf('--model') === -1 && cfg.model_id) model = cfg.model_id;

const outDir = path.join(EP_DIR, 'audio');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function synthesize(line) {
  const voiceCfg = cfg.voices[line.speaker];
  if (!voiceCfg || !voiceCfg.voice_id || voiceCfg.voice_id.indexOf('REPLACE') === 0) {
    throw new Error('config/voices.json: set a voice_id for speaker "' + line.speaker + '"');
  }
  const settings = Object.assign({}, cfg.default_settings, voiceCfg.settings || {});
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + voiceCfg.voice_id +
    '?output_format=' + (cfg.output_format || 'mp3_44100_128');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: line.tts,
      model_id: model,
      voice_settings: settings,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('ElevenLabs error for ' + line.id + ' (HTTP ' + res.status + '): ' + body);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(outDir, line.id + '.mp3');
  fs.writeFileSync(file, buf);
  console.log('saved', path.relative(ROOT, file), '(' + buf.length + ' bytes)');
}

(async () => {
  console.log('Model:', model);
  for (const line of scenario.lines) {
    try {
      await synthesize(line);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
  console.log('\nDone. Now run:');
  console.log('  node tools/compute-timing.js && node tools/build-subtitles.js');
})();
