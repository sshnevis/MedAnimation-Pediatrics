# Builds episodes/<ep>/render/hook-intro.png without a browser (Node 12 cannot
# run puppeteer). Background: the hooks.intro frame, blurred; rounded lavender
# card on top with Persian text (Vazirmatn, shaped via arabic_reshaper + python-bidi).
#
# Usage:  python tools/make-hook-intro-card.py [--ep <episode-id>]
import json
import os
import sys

from bidi.algorithm import get_display
import arabic_reshaper
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1920


def episode_dir():
    argv = sys.argv[1:]
    if "--ep" in argv:
        ep = argv[argv.index("--ep") + 1]
    else:
        ep = os.environ.get("EP", "ep01-childhood-diarrhea")
    return os.path.join(ROOT, "episodes", ep)


EP_DIR = episode_dir()

# Convert Vazirmatn woff2 -> ttf once (PIL cannot read woff2).
FONT_DIR = os.path.join(ROOT, 'src', 'lib', 'fonts')
TTF_PATH = os.path.join(FONT_DIR, 'Vazirmatn-Bold.ttf')
if not os.path.exists(TTF_PATH):
    font = TTFont(os.path.join(FONT_DIR, 'Vazirmatn-Bold.woff2'))
    font.flavor = None
    font.save(TTF_PATH)
    print('Converted Vazirmatn-Bold.woff2 -> Vazirmatn-Bold.ttf')

with open(os.path.join(EP_DIR, 'scenario.json'), encoding='utf-8') as f:
    hooks = json.load(f)['hooks']['intro']
kicker = hooks.get('kicker', '')
title = hooks.get('title', '')

def shape(text):
    return get_display(arabic_reshaper.reshape(text))

# Background: the hooks.intro frame, blurred (like the reference card).
intro_frame = hooks.get('frame', 200)
src = os.path.join(EP_DIR, 'render', 'frames', 'f_%05d.png' % intro_frame)
bg = Image.open(src).convert('RGB').resize((W, H), Image.LANCZOS)
bg = bg.filter(ImageFilter.GaussianBlur(18))
img = bg.copy()

draw = ImageDraw.Draw(img)
font_title = ImageFont.truetype(TTF_PATH, 88)
font_kicker = ImageFont.truetype(TTF_PATH, 46)

# Card geometry (centered at 38% height, like the reference).
card_w = int(W * 0.88)
pad = 140
kicker_h = 80
title_lines = []
# Manual wrap: measure shaped text and split if wider than card minus padding.
shaped_title = shape(title)
max_w = card_w - 160
if draw.textlength(shaped_title, font=font_title) <= max_w:
    title_lines.append(shaped_title)
else:
    words = title.split()
    line = ''
    for word in words:
        cand = shape((line + ' ' + word).strip())
        if draw.textlength(cand, font=font_title) <= max_w or not line:
            line = (line + ' ' + word).strip()
        else:
            title_lines.append(shape(line))
            line = word
    title_lines.append(shape(line))
title_h = int(len(title_lines) * 88 * 1.4)
card_h = pad * 2 + kicker_h + title_h
card_top = int(H * 0.38 - card_h / 2)
card_box = ((W - card_w) // 2, card_top, (W + card_w) // 2, card_top + card_h)
draw.rounded_rectangle(card_box, radius=96, fill=(216, 179, 242, 235))

y = card_top + pad
shaped_kicker = shape(kicker)
kw = draw.textlength(shaped_kicker, font=font_kicker)
draw.text(((W - kw) / 2, y), shaped_kicker, font=font_kicker, fill=(42, 157, 143))
y += kicker_h
for line in title_lines:
    tw = draw.textlength(line, font=font_title)
    draw.text(((W - tw) / 2, y), line, font=font_title, fill=(255, 255, 255))
    y += int(88 * 1.4)

out = os.path.join(EP_DIR, 'render', 'hook-intro.png')
img.save(out)
print('Wrote', os.path.relpath(out, ROOT))
