# Generates one MP3 per dialogue line using free Microsoft Edge neural voices.
# Good for drafts; for production quality use ElevenLabs (tools/generate-voice-elevenlabs.js).
#
# Usage:
#   pip install edge-tts
#   python tools/generate-voice-edge.py [--ep <episode-id>]
#
# Afterwards run:  node tools/compute-timing.js && node tools/build-subtitles.js
import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EP = "ep01-childhood-diarrhea"


def episode_dir():
    argv = sys.argv[1:]
    if "--ep" in argv:
        ep = argv[argv.index("--ep") + 1]
    else:
        ep = os.environ.get("EP", DEFAULT_EP)
    return ROOT / "episodes" / ep


try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts is not installed. Run:  pip install edge-tts")


async def gen(text, voice, rate, pitch, out):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await com.save(out)


def main():
    ep_dir = episode_dir()
    scenario = json.loads((ep_dir / "scenario.json").read_text(encoding="utf-8"))
    voices = json.loads((ROOT / "config" / "voices.json").read_text(encoding="utf-8"))["edge"]

    out_dir = ep_dir / "audio"
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
