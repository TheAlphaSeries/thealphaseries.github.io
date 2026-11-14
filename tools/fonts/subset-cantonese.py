#!/usr/bin/env python3
"""Makes the small Cantonese font the site ships: site/fonts/noto-serif-tc-500-<hash>.woff2.

The Cantonese sayings behind the tower (site/quotes.js, the "yue" lines) are set in Noto Serif TC. The whole font is
about 17 MB; this cuts it down to just the characters the sayings use (one file of roughly 100 KB) and points
site/blog.css at it.

RUN IT AGAIN whenever a Cantonese saying is added or changed:   python3 tools/fonts/subset-cantonese.py
(needs: pip install fonttools brotli). If it isn't run, any character that is new simply shows in the visitor's own
system Chinese font; nothing breaks.

The source font (SIL Open Font License) is downloaded from Google's fonts repository on GitHub the first time.
"""
import hashlib, os, re, sys, urllib.request, glob
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.environ.get("NOTO_SERIF_TC") or os.path.join(ROOT, "tools", "fonts", "NotoSerifTC[wght].ttf")
URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf"

if not os.path.exists(SRC):
    print("downloading the source font…"); urllib.request.urlretrieve(URL, SRC)

quotes = open(os.path.join(ROOT, "site", "quotes.js"), encoding="utf-8").read()
chars = sorted(set("".join(re.findall(r'yue:\s*"([^"]*)"', quotes))) | set("，。：；！？「」『』、…—"))
print(len(chars), "characters")

font = instancer.instantiateVariableFont(TTFont(SRC), {"wght": 500})          # the one weight the site uses
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = [1, 2]; opts.notdef_outline = True
s = subset.Subsetter(opts); s.populate(text="".join(chars)); s.subset(font)
tmp = os.path.join(ROOT, "site", "fonts", "_tc.woff2"); font.flavor = "woff2"; font.save(tmp)
h = hashlib.sha256(open(tmp, "rb").read()).hexdigest()[:8]; name = f"noto-serif-tc-500-{h}.woff2"
for old in glob.glob(os.path.join(ROOT, "site", "fonts", "noto-serif-tc-500-*.woff2")): os.remove(old)
os.replace(tmp, os.path.join(ROOT, "site", "fonts", name))
css_path = os.path.join(ROOT, "site", "blog.css"); css = open(css_path, encoding="utf-8").read()
css2 = re.sub(r"noto-serif-tc-500-\w+\.woff2", name, css)
if css2 != css: open(css_path, "w", encoding="utf-8").write(css2)
print(name, os.path.getsize(os.path.join(ROOT, "site", "fonts", name)), "bytes")
