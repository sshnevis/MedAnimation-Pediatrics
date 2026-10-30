// Per-line voice audio playback. In render mode everything is silent —
// the audio track is mixed into the final video by tools/assemble.js.
export class LineAudio {
  constructor(timing, silent, baseUrl = '../audio/') {
    this.map = {};
    this.current = null;
    this.currentLine = null;
    this.silent = !!silent;
    this.anyFound = false;
    for (const L of timing.lines) this.probe(L.id, baseUrl + L.id + '.mp3');
  }

  async probe(id, url) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) {
        const a = new Audio(url);
        a.preload = 'auto';
        this.map[id] = a;
        this.anyFound = true;
      }
    } catch (e) {
      /* file missing — silent mode for this line */
    }
  }

  play(id) {
    if (this.silent) return;
    const a = this.map[id];
    if (!a) return;
    this.stopAll();
    a.currentTime = 0;
    a.play().catch(() => {});
    this.current = a;
    this.currentLine = id;
  }

  stopAll() {
    if (this.current) {
      this.current.pause();
      this.current = null;
      this.currentLine = null;
    }
  }

  // pause/resume in sync with the master timeline
  setPlaying(playing) {
    if (this.silent || !this.current) return;
    if (playing) this.current.play().catch(() => {});
    else this.current.pause();
  }
}
