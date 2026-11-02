# ModNeuro — sources

The course pages are the Markdown chapters one level up (`01-enzyme-kinetics.md` …),
rendered by `course.html?c=modneuro/<chapter>`. Edit those files to change the text or code.

Two scripts rebuild everything else. They need Python 3 and
`pip install numpy scipy sympy matplotlib pandas networkx nbformat nbclient ipykernel`.

```bash
cd teaching/modneuro
python3 _src/build_figures.py            # fig/*.svg, in the site's five colours
python3 _src/build_notebooks.py --check  # notebooks/*.ipynb from the chapters
```

`build_notebooks.py` turns each chapter into a notebook (Python blocks become code cells,
the prose becomes Markdown cells). With `--check` it also runs every notebook and compares
each printed result with the ` ```output ` block written under it in the chapter, so the page
can never show a result the code does not produce.

## Writing a chapter

- ` ```python ` blocks are code; a ` ```output ` block right after one is its printed result.
- `<figure class="fig" data-svg="fig/name.svg"><figcaption>…</figcaption></figure>` shows a
  figure from `fig/`; add `wide` to the class for two-panel figures.
- `<div class="widget" data-widget="hh"></div>` inserts an interactive figure from
  `assets/js/widgets.js` (`euler`, `hh`, `kir`, `fn`).
- `<details class="fold"><summary>Plotting code</summary>` … `</details>` folds code away
  (leave blank lines around the code block).
- `<aside class="note">` … `</aside>` for corrections and conventions.
- Link to another chapter with `[text](03-active-membrane.md#section-id)`.
- New chapters must also be listed in `course.json`.
