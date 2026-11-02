---
title: Neuronal models
summary: Dynamical systems in one, two and three dimensions — the I_Kir model and its bifurcations, the FitzHugh–Nagumo model in the phase plane, and the bursting Hindmarsh–Rose model.
---

The Hodgkin–Huxley model of the previous chapter is highly plausible biologically: it accounts for many underlying mechanisms. The price is complexity, both to analyse and to compute. Many other neuronal models deliberately leave out the geometry of the neuron or some of its mechanisms, to keep only what matters for the question at hand.

In 1961–62, **FitzHugh** and **Nagumo** reduced the four Hodgkin–Huxley equations to two state variables. The model is less faithful to biology but keeps the essential behaviour: a spike after a strong enough stimulus. In 1984, building on it, **Hindmarsh and Rose** proposed three coupled equations that also produce bursting, and even chaotic, voltage dynamics while remaining far simpler than Hodgkin–Huxley.

We start with a short introduction to the qualitative study of differential equations on a one-dimensional model, the **$I_{Kir}$ model**, then simulate the **FitzHugh–Nagumo** and **Hindmarsh–Rose** models.

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import brentq        # root finding
from scipy.integrate import solve_ivp    # ODE solver
```

## The one-dimensional $I_{Kir}$ model

A one-dimensional dynamical system

$$\dot V = F(V)$$

says how the rate of change of $V$ depends on $V$ itself: where $F(V) > 0$, $V$ increases; where $F(V) < 0$, it decreases.

- An **equilibrium** is a value $V^*$ where $F(V^*) = 0$. It is **stable** when $F'(V^*) < 0$: just above it $V$ decreases, just below it $V$ increases, so trajectories come back. It is **unstable** when $F'(V^*) > 0$.
- The **phase portrait** shows the trajectories of the system in its state space, here a line.
- A **bifurcation** is a qualitative change in the phase portrait, such as equilibria appearing or disappearing, as a parameter changes.

The inward-rectifying potassium channel model, $I_{Kir}$, is one such system:

$$C\dot V = I - g_L(V - E_L) - g_{Kir}\, h_\infty(V)\,(V - E_K)$$

$$h_\infty(V) = \frac{1}{1 + e^{(V_{1/2} - V)/k}}$$

with the parameters

| $C$ | $g_L$ | $E_L$ | $g_{Kir}$ | $E_K$ | $V_{1/2}$ | $k$ |
|---|---|---|---|---|---|---|
| 1 | 0.2 | −50 | 2 | −80 | −76 | −12 |

```python
C, g_L, E_L, g_K, E_K, V_half, k = 1, 0.2, -50, 2, -80, -76, -12

h_infty = lambda V: 1 / (1 + np.exp((V_half - V) / k))
leak = lambda V: g_L * (V - E_L)
kir = lambda V: g_K * h_infty(V) * (V - E_K)
```

With $k < 0$, $h_\infty$ *decreases* with voltage: the channel is open at hyperpolarised potentials and closes as the cell depolarises. That is inward rectification.

<details class="fold"><summary>Plotting code</summary>

```python
v = np.linspace(-200, 100, 300)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
ax1.plot(v, h_infty(v)); ax1.set_title(r'$h_\infty(V)$')
ax2.plot(v, leak(v), label='$I_L$'); ax2.plot(v, kir(v), label='$I_{Kir}$')
ax2.set_title('I–V curves'); ax2.legend()
for ax in (ax1, ax2):
    ax.set_xlabel('V (mV)')
```

</details>

<figure class="fig wide" data-svg="fig/ch4-kir-iv.svg"><figcaption>The Kir current is large below about −80 mV and vanishes as the cell depolarises, giving its I–V curve a region of negative slope.</figcaption></figure>

### Phase portrait for $I = 6$

```python
def V_dot(V, I):
    return (I - leak(V) - kir(V)) / C

I_inj = 6
```

The equilibria are the roots of $\dot V$. Plotting it first tells us roughly where they are; then `brentq` finds each root inside an interval.

```python
eq_points = [brentq(V_dot, a, b, args=(I_inj,)) for a, b in [(-70, -60), (-50, -40), (-40, -20)]]
```

To classify an equilibrium we need the sign of the **slope** $F'(V^*)$, not of $F(V^*)$ itself, which is zero by definition. We estimate the slope with a centred finite difference.

```python
def slope(F, V, *args, h=1e-6):
    return (F(V + h, *args) - F(V - h, *args)) / (2 * h)

for V_star in eq_points:
    kind = 'stable' if slope(V_dot, V_star, I_inj) < 0 else 'unstable'
    print(f"V* = {V_star:6.2f} mV  →  {kind}")
```

```output
V* = -62.99 mV  →  stable
V* = -46.88 mV  →  unstable
V* = -31.87 mV  →  stable
```

<aside class="note">

The original version of this notebook tested the sign of $\dot V$ *at* each equilibrium. Since $\dot V(V^*) = 0$, that sign is rounding noise, and it reported the equilibrium at −31.9 mV as unstable. In one dimension, neighbouring simple equilibria must alternate between stable and unstable, which is a quick sanity check on the result.

</aside>

<details class="fold"><summary>Plotting code</summary>

```python
volt = np.linspace(-77, -20, 400)
fig, ax = plt.subplots()
ax.plot(volt, V_dot(volt, I_inj), 'k')
ax.axhline(0, lw=.5)
for V_star in eq_points:
    stable = slope(V_dot, V_star, I_inj) < 0
    ax.plot(V_star, 0, 'o', ms=10, mfc='r' if stable else 'w', mec='r')
ax.set_ylim(-2, 2)
ax.set_xlabel('V'); ax.set_ylabel(r'$\dot V$')
```

</details>

<figure class="fig" data-svg="fig/ch4-kir-phase.svg"><figcaption>Arrows show the direction of flow on the $V$ line. Two stable states, a hyperpolarised one and a depolarised one, are separated by an unstable threshold: the membrane is bistable.</figcaption></figure>

### Bifurcation diagram

We only looked at $I = 6$. Treating $I$ as a **bifurcation parameter**, we can ask where the equilibria are for every current. At equilibrium $\dot V = 0$, so

$$I = I_L(V) + I_{Kir}(V),$$

which gives the curve of equilibria directly, without solving anything: we compute $I$ for each $V$ and plot it sideways.

```python
def injected(V):
    return leak(V) + kir(V)
```

<details class="fold"><summary>Plotting code</summary>

```python
vb = np.linspace(-100, 0, 800)
Ib = injected(vb)
stable = slope(V_dot, vb, Ib) < 0
fig, ax = plt.subplots()
ax.plot(np.where(stable, Ib, np.nan), vb, 'g', label='stable')
ax.plot(np.where(~stable, Ib, np.nan), vb, 'k--', label='unstable')
ax.axvline(I_inj, label='$I = 6$')
ax.set_xlim(5, 7.5); ax.set_ylim(-100, 0)
ax.set_xlabel('I'); ax.set_ylabel('V*'); ax.legend()
```

</details>

<figure class="fig" data-svg="fig/ch4-kir-bif.svg"><figcaption>Between the two folds (squares) there are three equilibria; outside, only one. At each fold a stable and an unstable equilibrium collide and vanish: a saddle-node bifurcation.</figcaption></figure>

Move the current below and watch the equilibria merge and disappear as $I$ crosses each fold.

<div class="widget" data-widget="kir"></div>

## The FitzHugh–Nagumo model

### Two-dimensional systems

A two-dimensional system

$$\dot x = f(x, y), \qquad \dot y = g(x, y)$$

describes the evolution of two state variables; in neuron models they are usually the membrane voltage and a slower recovery variable.

- The curves $f(x, y) = 0$ and $g(x, y) = 0$ are the **$x$-** and **$y$-nullclines**: on them, $x$ (respectively $y$) momentarily stops changing.
- Their intersections are the **equilibria** of the system.
- An equilibrium is **stable** when nearby trajectories are attracted to it. We find out by linearising around it: the eigenvalues $\lambda$ of the Jacobian matrix

$$J = \begin{bmatrix} \partial f/\partial x & \partial f/\partial y \\ \partial g/\partial x & \partial g/\partial y \end{bmatrix}$$

at the equilibrium decide. If every eigenvalue has a negative real part, the equilibrium is stable; if one is positive, unstable. Complex eigenvalues mean trajectories spiral (a **focus**); real ones mean they approach or leave straight (a **node**).

### The model

$$\dot V = V - \frac{V^3}{3} - w + I$$

$$\tau \dot w = V + a - b\,w$$

with $a = 0.7$, $b = 0.8$ and $\tau = 13$. At an equilibrium $(V^*, w^*)$ both derivatives vanish, which gives the nullclines

$$w = V - \frac{V^3}{3} + I \quad (V\text{-nullcline}), \qquad w = \frac{V + a}{b} \quad (w\text{-nullcline}),$$

and, equating them, the equation the equilibrium satisfies:

$$\boxed{V - \frac{V^3}{3} + I - \frac{V + a}{b} = 0}$$

```python
a, b, tau = 0.7, 0.8, 13

def vdot(v, w, I): return v - v**3 / 3 - w + I
def wdot(v, w):    return (v + a - b * w) / tau

def equilibrium(I):
    v_star = brentq(lambda v: v - v**3 / 3 + I - (v + a) / b, -2, 2)
    return v_star, (v_star + a) / b

def classify(v_star):
    J = np.array([[1 - v_star**2, -1],          # ∂f/∂v, ∂f/∂w
                  [1 / tau,       -b / tau]])   # ∂g/∂v, ∂g/∂w
    ev = np.linalg.eigvals(J)
    stability = 'stable' if ev.real.max() < 0 else 'unstable'
    shape = 'focus' if np.abs(ev.imag).max() > 0 else 'node'
    return f'{stability} {shape}'

for I in (0.3, 0.5):
    v_star, w_star = equilibrium(I)
    print(f"I = {I}: equilibrium ({v_star:.2f}, {w_star:.2f}) → {classify(v_star)}")
```

```output
I = 0.3: equilibrium (-0.99, -0.37) → stable focus
I = 0.5: equilibrium (-0.80, -0.13) → unstable focus
```

Between $I = 0.3$ and $I = 0.5$ the equilibrium loses its stability: the system goes through a **Hopf bifurcation**, and trajectories that can no longer settle are captured by a **limit cycle**, the model’s repetitive spiking. We now simulate both cases with `solve_ivp`.

```python
def simulate_fitz_nagu(V_init, w_init, I, Tmax=100):
    sol = solve_ivp(lambda t, z: [vdot(*z, I), wdot(*z)], [0, Tmax], [V_init, w_init],
                    t_eval=np.linspace(0, Tmax, 1500), max_step=0.1)
    return sol.t, sol.y[0], sol.y[1]
```

<details class="fold"><summary>Plotting code</summary>

```python
def plot_fitz_nagu(V_init, w_init, I, Tmax=100):
    t, vt, wt = simulate_fitz_nagu(V_init, w_init, I, Tmax)
    v_star, w_star = equilibrium(I)
    volt = np.linspace(-3, 3, 200)
    X, Y = np.meshgrid(np.linspace(-3, 3, 15), np.linspace(-2, 2, 10))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    ax1.quiver(X, Y, vdot(X, Y, I), wdot(X, Y), color='g', alpha=.4)
    ax1.plot(volt, volt - volt**3 / 3 + I, label='V-nullcline')
    ax1.plot(volt, (volt + a) / b, label='w-nullcline')
    ax1.plot(vt, wt, 'r', label='trajectory')
    ax1.plot(v_star, w_star, 'ko', label=classify(v_star))
    ax1.set_xlim(-3, 3); ax1.set_ylim(-2, 2); ax1.set_xlabel('V'); ax1.set_ylabel('w'); ax1.legend()
    ax2.plot(t, vt, label='V(t)'); ax2.plot(t, wt, label='w(t)')
    ax2.set_xlabel('time'); ax2.legend()

plot_fitz_nagu(0, 0, I=0.3)
plot_fitz_nagu(-2, -1.5, I=0.5)
```

</details>

<figure class="fig wide" data-svg="fig/ch4-fn-1.svg"><figcaption>$I = 0.3$, starting at $(0, 0)$: the trajectory spirals into the stable focus. The oscillation is damped, a subthreshold response.</figcaption></figure>

<figure class="fig wide" data-svg="fig/ch4-fn-2.svg"><figcaption>$I = 0.5$, starting at $(-2, -1.5)$: the equilibrium has become unstable and the trajectory settles on a limit cycle, the model’s spike train.</figcaption></figure>

### Explore the phase plane

Change $I$ and click anywhere in the phase plane to start a trajectory from that point. Watch the equilibrium change from filled (stable) to hollow (unstable) as you cross the Hopf bifurcation, near $I \approx 0.33$.

<div class="widget" data-widget="fn"></div>

## The Hindmarsh–Rose model

This model was built to account for the **bursting** activity of some neurons: groups of spikes separated by silences. It has three dimensionless state variables:

- $x(t)$, the membrane potential,
- $y(t)$, the spiking variable, standing for the fast sodium and potassium currents,
- $z(t)$, the bursting variable, standing for slow ionic currents.

$$\dot x = y + \phi(x) - z + I$$

$$\dot y = \psi(x) - y$$

$$\dot z = r\,\big(s\,(x - x_r) - z\big)$$

with $\phi(x) = -a x^3 + b x^2$ and $\psi(x) = c - d x^2$, and the parameters

| $s$ | $x_r$ | $a$ | $b$ | $c$ | $d$ | $I$ | $r$ |
|---|---|---|---|---|---|---|---|
| 4 | −8/5 | 1 | 3 | 1 | 5 | 2 (explore −10 to 10) | $10^{-3}$ |

Because $r$ is small, $z$ evolves very slowly: it slides the fast $(x, y)$ subsystem in and out of its spiking regime, which is what creates bursts. We use $r$ as the bifurcation parameter. To change it (or any other parameter) without rewriting the equations, we write a function that *returns* the right-hand side for a given set of parameters, and pass that to `solve_ivp`.

```python
def hind_rose(r, s=4, xr=-8/5, a=1, b=3, c=1, d=5, I=2):
    """Right-hand side of the Hindmarsh–Rose system for the given parameters."""
    def rhs(t, u):
        x, y, z = u
        return [y - a * x**3 + b * x**2 - z + I,
                c - d * x**2 - y,
                r * (s * (x - xr) - z)]
    return rhs

def simulate_hind_rose(x_init, y_init, z_init, r, Tmax):
    sol = solve_ivp(hind_rose(r), [0, Tmax], [x_init, y_init, z_init],
                    t_eval=np.linspace(0, Tmax, 8000), max_step=0.2)
    return sol.t, sol.y

t, (x, y, z) = simulate_hind_rose(-1.5, -10, 2, r=0.001, Tmax=1000)
```

<details class="fold"><summary>Plotting code</summary>

```python
fig = plt.figure(figsize=(12, 5))
ax1 = fig.add_subplot(121)
ax1.plot(t, x); ax1.set_xlabel('t'); ax1.set_ylabel('x')
ax2 = fig.add_subplot(122, projection='3d')
ax2.plot(x, y, z, lw=.7)
ax2.set_xlabel('x'); ax2.set_ylabel('y'); ax2.set_zlabel('z'); ax2.set_zlim(1.6, 2.2)
```

</details>

<figure class="fig wide" data-svg="fig/ch4-hr.svg"><figcaption>Bursts of spikes separated by quiet periods. In three dimensions, the trajectory winds around a cycle (spiking) while $z$ slowly rises, then drops back to rest until $z$ has recovered.</figcaption></figure>

Try other values of $r$ and $I$ in the notebook. Larger $r$ makes $z$ faster and the bursts shorter: with $I = 2$, each burst holds 9 spikes at $r = 0.001$ but only 3 at $r = 0.005$.
