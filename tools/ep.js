// Shared episode resolver for all tools.
// Active episode: --ep <id> flag, or EP env var, or the default below.
// Episode data lives in episodes/<id>/ (scenario.json, audio/, timing.json,
// subtitles.srt, render output).
const path = require('path');

const DEFAULT_EP = 'ep01-childhood-diarrhea';

function resolveEp() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--ep');
  const id = (i !== -1 && argv[i + 1]) || process.env.EP || DEFAULT_EP;
  const ROOT = path.join(__dirname, '..');
  const EP_DIR = path.join(ROOT, 'episodes', id);
  return { id, ROOT, EP_DIR };
}

module.exports = { resolveEp, DEFAULT_EP };
