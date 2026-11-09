'use strict';

// Run with Node >=24. Credentials are read only in memory and passed to the TTS child.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const reportPath = path.join(__dirname, 'generation-report.json');
const report = { model: 'eleven_v3', voiceChecks: [], steps: [], status: 'started' };
let secret = '';
function redact(value) {
  let text = String(value);
  if (secret) text = text.split(secret).join('[REDACTED]');
  return text.replace(/sk_[A-Za-z0-9_-]+/g, '[REDACTED]');
}
function run(script, args = []) {
  const child = spawnSync(process.execPath, [script, ...args], {
    cwd: root, env: { ...process.env, ELEVENLABS_API_KEY: secret },
    encoding: 'utf8', timeout: 720000, maxBuffer: 4 * 1024 * 1024,
  });
  const stdout = redact(child.stdout || '');
  const stderr = redact(child.stderr || '');
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  report.steps.push({ script, status: child.status, error: child.error ? redact(child.error.message) : null });
  if (child.error || child.status !== 0) throw new Error(script + ' failed; see sanitized output above');
}
(async () => {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node >=24 required');
  run(path.join(__dirname, 'validate.cjs'));
  const audioDir = path.join(__dirname, 'audio');
  if (fs.existsSync(audioDir) && fs.readdirSync(audioDir).some(f => f.endsWith('.mp3'))) {
    throw new Error('Audio already exists; refusing to regenerate and charge the account twice. Inspect existing files before any retry.');
  }
  const credentialLines = fs.readFileSync(path.join(root, 'api.txt'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  secret = credentialLines.find(s => /^sk_[A-Za-z0-9_-]+$/.test(s)) || '';
  if (!secret && credentialLines[0] === 'elevenlabs.io' && credentialLines.length === 2) secret = credentialLines[1];
  if (!secret || /\s/.test(secret)) throw new Error('Could not identify a single credential in api.txt (contents not printed)');
  console.log('Credential located programmatically; value withheld. Node ' + process.version);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/voices.json'), 'utf8')).elevenlabs;
  if (cfg.model_id !== 'eleven_v3') throw new Error('Expected eleven_v3');
  for (const speaker of ['doctor', 'mother', 'father']) {
    const voiceId = cfg.voices[speaker].voice_id;
    const res = await fetch('https://api.elevenlabs.io/v1/voices/' + voiceId, {
      headers: { 'xi-api-key': secret }, signal: AbortSignal.timeout(30000),
    });
    report.voiceChecks.push({ speaker, voiceId, httpStatus: res.status, available: res.ok });
    console.log(speaker + ' voice preflight: HTTP ' + res.status);
    if (!res.ok) throw new Error('Voice preflight failed for ' + speaker + ' (HTTP ' + res.status + '); no TTS requested');
    await res.arrayBuffer();
  }
  run('tools/generate-voice-elevenlabs.js', ['--ep', 'ep03-baby-sleep', '--model', 'eleven_v3']);
  run('tools/compute-timing.js', ['--ep', 'ep03-baby-sleep']);
  run('tools/build-subtitles.js', ['--ep', 'ep03-baby-sleep']);
  run(path.join(__dirname, 'validate.cjs'), ['--artifacts']);
  report.status = 'passed';
})().catch(error => {
  report.status = 'failed';
  report.error = redact(error.message);
  console.error(report.error);
  process.exitCode = 1;
}).finally(() => {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
});
