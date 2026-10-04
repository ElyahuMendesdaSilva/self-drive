"""Build wordmark lockups with text converted to vector outlines."""
from pathlib import Path
import subprocess
import re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent
FONT_PATH = subprocess.check_output(["fc-match", "Noto Sans:style=Bold", "-f", "%{file}"], text=True).strip()
FONT = TTFont(FONT_PATH)
GLYPHS = FONT.getBestCmap()
GLYF = FONT["glyf"]
METRICS = FONT["hmtx"].metrics
UNITS = FONT["head"].unitsPerEm
SYMBOL = (ROOT / "self-drive-symbol.svg").read_text()
MARK = "".join(re.findall(r"<path\b[^>]*/>", SYMBOL, re.DOTALL))


def text_paths(label, size, x, baseline, color):
    scale = size / UNITS
    paths, cursor = [], x
    for char in label:
        glyph_name = GLYPHS.get(ord(char))
        glyph = GLYF[glyph_name]
        pen = SVGPathPen(GLYF)
        transformed = TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline))
        glyph.draw(transformed, GLYF)
        paths.append(f'<path fill="{color}" d="{pen.getCommands()}"/>')
        cursor += METRICS[glyph_name][0] * scale
    return "\n".join(paths), cursor - x


def write(name, width, height, mark_transform, label_specs):
    label_svg = []
    for label, size, x, baseline, color in label_specs:
        paths, _ = text_paths(label, size, x, baseline, color)
        label_svg.append(paths)
    mark = f'<g transform="{mark_transform}">{MARK}</g>'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Self-Drive"><title>Self-Drive — {name.removesuffix(".svg")}</title>{mark}{"".join(label_svg)}</svg>\n'
    (ROOT / "lockups" / name).write_text(svg)


(ROOT / "lockups").mkdir(exist_ok=True)
write("self-drive-horizontal.svg", 477, 128, "translate(0 0) scale(.5)", [("Self-Drive", 66, 148, 84, "#123047")])
write("self-drive-stacked.svg", 244, 316, "translate(24 0) scale(.75)", [("Self", 53, 42, 244, "#123047"), ("Drive", 53, 42, 299, "#123047")])
wordmark, wordmark_width = text_paths("Self-Drive", 66, 0, 66, "#123047")
wordmark_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {round(wordmark_width)} 84" role="img" aria-label="Self-Drive wordmark"><title>Self-Drive wordmark</title>{wordmark}</svg>\n'
(ROOT / "lockups" / "self-drive-wordmark.svg").write_text(wordmark_svg)
for variant, color in [("black", "#000000"), ("white", "#FFFFFF")]:
    (ROOT / "lockups" / f"self-drive-wordmark-{variant}.svg").write_text(wordmark_svg.replace("#123047", color))
for source, target in [("self-drive-horizontal.svg", "self-drive-horizontal-white.svg"), ("self-drive-stacked.svg", "self-drive-stacked-white.svg")]:
    original = (ROOT / "lockups" / source).read_text()
    reversed_svg = original.replace("#123047", "#FFFFFF").replace("Self-Drive", "Self-Drive — reversa")
    (ROOT / "lockups" / target).write_text(reversed_svg)
