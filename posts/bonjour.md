---
title: Bonjour, le monde
date: 2026-10-28
lang: fr
ref: hello-world
tags: [meta, math]
summary: Un premier billet qui sert surtout à tester la mécanique — prose, citations, notes, code et LaTeX.
---

Ce blog accueillera trois sortes d’écrits : des notes de **littérature classique**, des notes **tech**, et de temps en temps un détour par les **mathématiques**. Avant tout cela, un petit tour de ce qu’un billet peut contenir — un peu pour les lecteurs, surtout pour vérifier que tout s’affiche.

## Prose et citations

Les longues citations ont un filet rouge dans la marge, comme dans mes diapositives :

> Chaque homme porte la forme entière de l’humaine condition.
>
> <cite>— Montaigne, *Essais*, III, 2</cite>

Les notes de bas de page fonctionnent aussi, ce qui compte quand on écrit sur de vieux livres.[^montaigne]

## Mathématiques

Les maths en ligne s’insèrent dans le texte, comme la transformation log-polaire $(x, y) \mapsto (\rho, \theta)$ avec $\rho = \log \sqrt{x^2 + y^2}$ et $\theta = \operatorname{atan2}(y, x)$. Sa propriété utile : un zoom devient une translation.

$$
(\lambda x,\ \lambda y) \;\longmapsto\; (\rho + \log \lambda,\ \theta), \qquad \lambda > 0 .
$$

Une rotation d’angle $\varphi$ décale $\theta$ de la même manière — l’une des raisons pour lesquelles un échantillonnage log-polaire, façon fovéa, est intéressant pour les modèles de vision. Un symbole dollar s’écrit \$5.

## Code

```python
import numpy as np

def grille_log_polaire(h, w, n_rho=64, n_theta=128):
    """Grille d’échantillonnage log-polaire centrée sur l’image."""
    r_max = np.hypot(h, w) / 2
    rho = np.exp(np.linspace(0, np.log(r_max), n_rho))
    theta = np.linspace(0, 2 * np.pi, n_theta, endpoint=False)
    R, T = np.meshgrid(rho, theta, indexing="ij")
    return w / 2 + R * np.cos(T), h / 2 + R * np.sin(T)
```

---

La suite bientôt.

[^montaigne]: *Essais*, livre III, chapitre 2, « Du repentir » (1580–1588).
