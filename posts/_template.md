---
# Copy this file, rename it (the file name becomes the URL: my-post.md → post.html?p=my-post),
# fill in the fields below and push. Files starting with "_" are ignored.

title: The title of the post
date: 2026-10-28            # YYYY-MM-DD
lang: en                    # en or fr
tags: [literature]          # e.g. literature, tech, math — anything you like
summary: One or two sentences shown in the post list and under the title.

# Optional
ref: my-post                # give the English and French versions the same ref to link them
draft: true                 # remove this line (or set false) to publish
---

Write in Markdown.

- Inline math: $e^{i\pi} + 1 = 0$  (or \( ... \))
- Display math: $$ \int_0^1 x^2\,dx = \tfrac13 $$  (or \[ ... \]), ideally on their own lines
- A literal dollar sign: \$
- Footnotes: text[^1]
- Images: put them in posts/img/ and write ![Caption](img/picture.jpg)
- Links to other posts: [another post](other-post.md)

> Quotations get the red rule.

```python
print("code is highlighted")
```

[^1]: The footnote text.
