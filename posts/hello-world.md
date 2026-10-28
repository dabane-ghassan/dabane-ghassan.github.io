---
title: Hello, world
date: 2026-10-28
lang: en
ref: hello-world
tags: [meta, math]
summary: A first post that is mostly a test of the machinery — prose, quotes, footnotes, code and LaTeX.
---

This blog will hold three kinds of writing: notes on **classic literature**, notes on **tech**, and the occasional detour through **mathematics**. Before any of that, a quick tour of what a post can contain — partly for readers, mostly so I can check that everything renders.

## Prose and quotations

Long quotations get a red rule in the margin, as in my slides:

> Each man bears the entire form of the human condition.
>
> <cite>— Montaigne, *Essays*, III, 2</cite>

Footnotes work too, which matters when writing about old books.[^montaigne]

## Mathematics

Inline math sits in the text, like the log-polar map $(x, y) \mapsto (\rho, \theta)$ with $\rho = \log \sqrt{x^2 + y^2}$ and $\theta = \operatorname{atan2}(y, x)$. Its useful property is that a zoom becomes a shift:

$$
(\lambda x,\ \lambda y) \;\longmapsto\; (\rho + \log \lambda,\ \theta), \qquad \lambda > 0 .
$$

Rotations by an angle $\varphi$ shift $\theta$ in the same way, which is one reason fovea-like, log-polar sampling is attractive for vision models. A literal dollar sign is written \$5.

Larger blocks are fine as well:

$$
\begin{aligned}
\mathcal{L}(\theta) &= -\frac{1}{N} \sum_{i=1}^{N} \sum_{c=1}^{C} y_{ic} \log p_\theta(c \mid x_i) \\
\nabla_\theta \mathcal{L} &= \mathbb{E}_{(x,y)}\!\left[\nabla_\theta\, \ell(f_\theta(x), y)\right]
\end{aligned}
$$

## Code

```python
import numpy as np

def log_polar_grid(h, w, n_rho=64, n_theta=128):
    """Sampling grid for a log-polar view centred on the image."""
    r_max = np.hypot(h, w) / 2
    rho = np.exp(np.linspace(0, np.log(r_max), n_rho))
    theta = np.linspace(0, 2 * np.pi, n_theta, endpoint=False)
    R, T = np.meshgrid(rho, theta, indexing="ij")
    return w / 2 + R * np.cos(T), h / 2 + R * np.sin(T)
```

Inline `code` uses the monospace font.

## Lists and tables

1. Write a Markdown file in `posts/`.
2. Push it to GitHub.
3. That’s it.

| Kind | Tag |
|:--|:--|
| Classic literature | `literature` |
| Technology | `tech` |
| Mathematics | `math` |

---

More soon.

[^montaigne]: *Essais*, livre III, chapitre 2, « Du repentir » (1580–1588). The translation here is mine.
