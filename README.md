# ghassan dabane · personal site

Static, dependency-free personal website: bilingual (EN/FR), light/dark, five colours
(black, white, red, green, blue), with a Markdown blog that renders LaTeX.

```
index.html            home: Me · Publications · Talks · Projects · Blog · Teaching
blog.html             all posts, tag filter
post.html?p=<slug>    one post, rendered from posts/<slug>.md
posts/                ← your Markdown posts live here
  _template.md        copy this to start a post (files starting with _ are ignored)
  img/                images for posts
  index.json          generated — do not edit by hand
assets/css/style.css  all styles (colour tokens at the top)
assets/js/            site.js (theme, language) · posts.js (Markdown + KaTeX) · home.js · post.js
assets/vendor/        marked, KaTeX, highlight.js (vendored, no CDN needed)
presentations/        ← your .html slide decks live here
  index.json          generated — do not edit by hand
assets/cv/            your CV PDF (linked from the hero)
scripts/build.mjs     builds posts/index.json, presentations/index.json, feed.xml, sitemap.xml
site.config.json      site URL for the RSS feed and sitemap
```

## Publish on GitHub Pages (once)

1. Create a repository — `dabane-ghassan.github.io` gives you the root URL
   (any other name works too, it will live at `dabane-ghassan.github.io/<repo>/`).
2. Push this folder to the `main` branch.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. If your URL differs, edit `url` in `site.config.json`.

Every push now rebuilds the post and presentation indexes and redeploys (see `.github/workflows/deploy.yml`).

## Write a post

1. Copy `posts/_template.md` to `posts/my-post-title.md` (the file name is the URL).
2. Fill in the front matter:

   ```yaml
   ---
   title: Relire « Le Rouge et le Noir »
   date: 2026-11-02
   lang: fr                 # en or fr
   tags: [literature]
   summary: Une phrase qui apparaît dans la liste des articles.
   ref: rouge-et-noir       # optional: same ref on the EN and FR versions links them
   ---
   ```

3. Write Markdown. Commit and push — or upload the `.md` straight from github.com
   (**Add file → Upload files** into `posts/`). That's all.

Supported in posts: headings, lists, tables, quotes, images (`![caption](img/x.jpg)`),
links to other posts (`[text](other-post.md)`), footnotes (`[^1]` … `[^1]: note`),
highlighted code blocks, and LaTeX: `$inline$`, `\(inline\)`, `$$display$$`, `\[display\]`,
including `aligned`, `cases`, matrices, `\mathbb`… A literal dollar is `\$`.

**Bilingual posts.** Write both versions with the same `ref`. Readers see the version in
their language, a "Lire en français / Read in English" link appears, and switching the site
language on a post jumps to its translation. A post in only one language is shown to everyone
with a small `EN`/`FR` badge.

**Drafts.** `draft: true` keeps a post off the site.

## Add a presentation

Drop the deck into `presentations/` and push. It appears under **Talks** and opens full-screen in a new tab.

- **Title** comes from the deck's `<title>`.
- **Date**: name the file `2026-06-12-beyond-the-ivory-tower.html`, or put
  `<meta name="date" content="2026-06-12">` in its `<head>`.
- **Event** (optional): `<meta name="event" content="BraiNets Day">`.
- **Language** comes from `<html lang="…">`; a deck in the other language gets a small EN/FR badge.
- A deck with separate assets can live in its own folder: `presentations/my-talk/index.html`.
- Files starting with `_` are ignored.

Decks made with the Ivory Tower skill are self-contained, so they work as-is.

## Preview locally

```bash
node scripts/build.mjs           # refresh the post and talk indexes
python3 -m http.server 8000      # then open http://localhost:8000
```

(Opening `index.html` directly from disk won't load posts — browsers block `fetch` on `file://`.)

## Edit the content

Everything on the home page is plain HTML in `index.html`. Text comes in pairs:

```html
<p lang="en">English text</p>
<p lang="fr">Texte français</p>
```

The language toggle shows one and hides the other. To add a publication, copy an
`<article class="pub">` block. Teaching is a "coming soon" line — replace the `.soon`
block when it's ready.

## Design notes

- Colours: `--black #0b0b0c`, `--white #fff`, `--red #e5322d`, `--green #12a150`,
  `--blue #1f5fff` — the same palette as the Ivory Tower slides. Greys are black/white at
  reduced opacity, so there are only ever five colours.
- Type: Inter (UI), Newsreader (blog prose, for long reading), JetBrains Mono (metadata).
- The hero's dot-matrix uses the 5×7 font from the slides and spells **G · D**; click it.
- Respects `prefers-color-scheme` until the visitor picks a theme, and `prefers-reduced-motion`.
