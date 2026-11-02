"""Turns each chapter (.md) into a runnable Jupyter notebook in ../notebooks/.

    cd teaching/modneuro && python3 _src/build_notebooks.py [--check]

--check executes every notebook and compares each printed result with the
```output block written under it in the chapter, so the page and the code
cannot drift apart.
"""
import re
import sys
from pathlib import Path

import nbformat as nbf

HERE = Path(__file__).resolve().parent.parent
SITE = "https://dabane-ghassan.github.io/course.html?c=modneuro/"
FENCE = re.compile(r"^```(\w*)\n(.*?)\n```[ \t]*$", re.S | re.M)


def front(md):
    m = re.match(r"^---\n(.*?)\n---\n", md, re.S)
    data = dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M)) if m else {}
    return data, md[m.end():] if m else md


def clean_md(s, slug):
    s = re.sub(r"<figure[\s\S]*?</figure>", "", s)
    s = re.sub(r'<div class="widget"[^>]*></div>', f"*(An interactive version of this figure is on the [course page]({SITE}{slug}).)*", s)
    s = re.sub(r"</?details[^>]*>|<summary>.*?</summary>", "", s)
    s = re.sub(r"</?aside[^>]*>", "", s)
    s = re.sub(r"\]\((\d\d-[\w-]+)\.md(#[\w-]*)?\)", lambda m: f"]({m.group(1)}.ipynb{m.group(2) or ''})", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def build(path):
    data, body = front(path.read_text())
    slug = path.stem
    cells, expected, pos = [], [], 0
    nb = nbf.v4.new_notebook()
    cells.append(nbf.v4.new_markdown_cell(
        f"# {data.get('title', slug)}\n\n*ModNeuro — an introduction to modelling for neuroscience. "
        f"Ghassan Dabane. Read it with figures at [{SITE}{slug}]({SITE}{slug}).*"))
    for m in FENCE.finditer(body):
        text = clean_md(body[pos:m.start()], slug)
        if text:
            cells.append(nbf.v4.new_markdown_cell(text))
        lang, code = m.group(1), m.group(2)
        if lang == "python":
            cells.append(nbf.v4.new_code_cell(code))
        elif lang == "output":
            expected.append((len(cells) - 1, code.strip()))
        pos = m.end()
    text = clean_md(body[pos:], slug)
    if text:
        cells.append(nbf.v4.new_markdown_cell(text))
    nb.cells = cells
    nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
    out = HERE / "notebooks" / f"{slug}.ipynb"
    out.parent.mkdir(exist_ok=True)
    nbf.write(nb, out)
    return out, expected


def text_of(cell):
    parts = []
    for o in cell.get("outputs", []):
        if o.output_type == "stream":
            parts.append(o.text)
        elif "data" in o and "text/plain" in o.data:
            parts.append(o.data["text/plain"])
    return "".join(parts).strip()


def check(path, expected):
    from nbclient import NotebookClient
    nb = nbf.read(path, as_version=4)
    NotebookClient(nb, timeout=600, kernel_name="python3", resources={"metadata": {"path": str(path.parent)}}).execute()
    bad = 0
    for i, want in expected:
        got = text_of(nb.cells[i])
        if " ".join(got.split()) != " ".join(want.split()):
            bad += 1
            print(f"  ✗ cell {i}\n    expected: {want!r}\n    got:      {got!r}")
    return bad


if __name__ == "__main__":
    total = 0
    for md in sorted(HERE.glob("[0-9][0-9]-*.md")):
        out, exp = build(md)
        print(f"✓ {out.name}  ({len(exp)} printed results)")
        if "--check" in sys.argv:
            total += check(out, exp)
    if "--check" in sys.argv:
        print("all outputs match" if not total else f"{total} mismatch(es)")
        sys.exit(1 if total else 0)
