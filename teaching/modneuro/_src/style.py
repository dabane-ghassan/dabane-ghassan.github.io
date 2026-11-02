"""Site style for the ModNeuro figures.

Figures are exported as SVG and inlined by course.js, so text and axes can use
`currentColor` and follow the page's light/dark theme. Five colours only:
foreground, background, red, green, blue.

    python3 _src/build_figures.py      # writes ../fig/*.svg
"""
import re
from pathlib import Path

import matplotlib
matplotlib.use("svg")
import matplotlib.pyplot as plt  # noqa: E402

FG = "#010101"            # sentinel, rewritten to currentColor
RED, GREEN, BLUE = "#e5322d", "#12a150", "#1f5fff"
CYCLE = [BLUE, RED, GREEN, FG]

OUT = Path(__file__).resolve().parent.parent / "fig"
OUT.mkdir(exist_ok=True)

plt.rcParams.update({
    "svg.fonttype": "none",
    "font.family": "Inter",
    "font.size": 9.5,
    "mathtext.fontset": "stix",
    "text.color": FG,
    "axes.edgecolor": FG,
    "axes.labelcolor": FG,
    "axes.titlecolor": FG,
    "axes.titlesize": 10,
    "axes.titleweight": 600,
    "axes.titlelocation": "left",
    "axes.titlepad": 10,
    "axes.labelsize": 9.5,
    "axes.linewidth": 0.8,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.prop_cycle": matplotlib.cycler(color=CYCLE),
    "axes.facecolor": "none",
    "figure.facecolor": "none",
    "savefig.facecolor": "none",
    "savefig.transparent": True,
    "xtick.color": FG, "ytick.color": FG,
    "xtick.labelsize": 8.5, "ytick.labelsize": 8.5,
    "xtick.major.size": 3, "ytick.major.size": 3,
    "xtick.major.width": 0.8, "ytick.major.width": 0.8,
    "grid.color": FG, "grid.alpha": 0.08, "grid.linewidth": 0.8,
    "lines.linewidth": 1.8,
    "lines.solid_capstyle": "round",
    "legend.frameon": False,
    "legend.fontsize": 8.5,
    "legend.handlelength": 1.6,
    "figure.dpi": 100,
})


def fig(w=7.0, h=3.2, **kw):
    return plt.subplots(figsize=(w, h), **kw)


def save(f, name):
    """Save, then make the SVG theme-aware and safe to inline."""
    path = OUT / f"{name}.svg"
    f.savefig(path, format="svg", bbox_inches="tight", pad_inches=0.08, metadata={"Date": None})
    plt.close(f)
    s = path.read_text()
    s = re.sub(r"<\?xml[^>]*>\s*", "", s)
    s = re.sub(r"<!DOCTYPE[^>]*>\s*", "", s)
    s = re.sub(r"<metadata>.*?</metadata>\s*", "", s, flags=re.S)
    s = s.replace(FG, "currentColor")
    # math glyphs: use the site's serif when STIX is not installed
    s = re.sub(r"font-family:\s*'?STIX[^;'\"]*'?", "font-family: 'STIX Two Math', 'Newsreader', serif", s)
    s = re.sub(r"font-family:\s*'?Inter'?", "font-family: var(--sans)", s)
    s = re.sub(r'font-family="[^"]*"', "", s)
    # unique ids so several inlined SVGs can live on one page
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{name}-{m.group(1)}"', s)
    s = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{name}-{m.group(1)})', s)
    s = re.sub(r'xlink:href="#([^"]+)"', lambda m: f'xlink:href="#{name}-{m.group(1)}"', s)
    s = re.sub(r'href="#([^"]+)"', lambda m: m.group(0) if m.group(1).startswith(name + "-") else f'href="#{name}-{m.group(1)}"', s)
    # let CSS size it
    s = re.sub(r'(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"', r'\1', s, count=1)
    path.write_text(s)
    return path


def ghost(ax, x, y, **kw):
    """A faint foreground line (reference curves, guides)."""
    kw.setdefault("color", FG); kw.setdefault("alpha", 0.35); kw.setdefault("lw", 1)
    return ax.plot(x, y, **kw)
