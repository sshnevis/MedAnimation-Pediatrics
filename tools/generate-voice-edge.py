# Generates one MP3 per dialogue line using free Microsoft Edge neural voices.
# Good for drafts; for production quality use ElevenLabs (tools/generate-voice-elevenlabs.js).
#
# Usage:
#   pip install edge-tts
#   python tools/generate-voice-edge.py
#
# Afterwards run:  node tools/compute-timing.js && node tools/build-subtitles.js
import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts is not installed. Run:  pip install edge-tts")


async def gen(text, voice, rate, pitch, out):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await com.save(out)


def main():
    scenario = json.loads((ROOT / "scenario.json").read_text(encoding="utf-8"))
    voices = json.loads((ROOT / "config" / "voices.json").read_text(encoding="utf-8"))["edge"]

    out_dir = ROOT / "audio"
    out_dir.mkdir(exist_ok=True)

    for line in scenario["lines"]:
        v = voices[line["speaker"]]
        if isinstance(v, str):
            v = {"voice": v}
        out = str(out_dir / (line["id"] + ".mp3"))
        asyncio.run(gen(
            line["tts"],
            v["voice"],
            v.get("rate", "+0%"),
            v.get("pitch", "+0Hz"),
            out,
        ))
        print("saved", os.path.relpath(out, ROOT))

    print("\nDone. Now run:")
    print("  node tools/compute-timing.js && node tools/build-subtitles.js")


if __name__ == "__main__":
    main()
