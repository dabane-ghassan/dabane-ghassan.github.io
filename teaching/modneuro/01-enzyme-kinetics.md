---
title: Enzyme kinetics
summary: Zero- and first-order reactions, a two-state equilibrium, and the Michaelis–Menten equation, each solved twice, analytically with SymPy and numerically with Euler’s method.
---

Enzyme kinetics play a major role in neuroscience: they dictate how ion channels open and close and how molecular networks in intracellular signalling are regulated. We will express those kinetics with **differential equations**, the basic objects of scientific modelling, and solve them in Python.

Let’s start by importing the libraries we’ll use here and in the rest of the course.

```python
import numpy as np               # scientific computing
import sympy as sp               # symbolic mathematics
import matplotlib.pyplot as plt  # plotting
```

## Zero- and first-order reactions

Consider a reaction catalysed by an enzyme, where a reactant $A$ turns into a product $B$:

$$A \xrightarrow{\text{enzyme}} B$$

If the enzyme is far less concentrated than $A$, it is saturated: $A$ disappears (and $B$ appears) at a constant rate that does not depend on how much $A$ is left,

$$\frac{d[B]}{dt} = -\frac{d[A]}{dt} = k,$$

with $k$ the rate constant. This is equivalent to

$$\boxed{-\frac{d[A]}{dt} = k[A]^0 = k}$$

The rate depends only on $k$, not on the concentration of reactant: a **zero-order** reaction. This is a differential equation, and solving it means finding the function $A(t)$. It is easy by hand, but differential equations get complicated fast, which is why we use computers.

If the rate depends linearly on the concentration of $A$, the equation becomes the **first-order** reaction:

$$\boxed{-\frac{d[A]}{dt} = k[A]}$$

We will solve each equation in two ways:

1. **Analytically**, with SymPy, Python’s library for symbolic mathematics.
2. **Numerically**, with Euler’s method for ordinary differential equations (ODEs), on NumPy arrays.

### Zero order, analytically

First we create SymPy symbols we can manipulate: the rate constant $k$, time $t$ and an integration constant $C_1$.

```python
k, t, C1 = sp.symbols('k t C1')
```

The concentration $A$ is a SymPy `Function` of time, and we take its derivative with respect to $t$.

```python
A = sp.Function('A')
dAdt = A(t).diff(t)
```

Now we can write the zero-order equation…

```python
zero_order = sp.Eq(-dAdt, k)
zero_order
```

```output
Eq(-Derivative(A(t), t), k)
```

…and solve it with `dsolve`, which takes the equation and the function to solve for.

```python
analytic_gen_sol_zero = sp.dsolve(zero_order, A(t))
analytic_gen_sol_zero
```

```output
Eq(A(t), C1 - k*t)
```

This is the general solution. To find $C_1$, set $t = 0$:

```python
C1_zero = analytic_gen_sol_zero.subs(t, 0)
C1_zero
```

```output
Eq(A(0), C1)
```

The constant $C_1$ is the concentration at time 0, the initial condition.

```python
analytic_gen_sol_zero = analytic_gen_sol_zero.subs(C1, A(0))
analytic_gen_sol_zero
```

```output
Eq(A(t), -k*t + A(0))
```

For a particular solution, take $k = 2$ and $A(0) = 10$:

```python
analytic_par_sol_zero = analytic_gen_sol_zero.subs({A(0): 10, k: 2})
analytic_par_sol_zero
```

```output
Eq(A(t), 10 - 2*t)
```

A SymPy expression can’t be evaluated on arrays directly, so we turn its right-hand side into a NumPy function with `lambdify`.

```python
analytic_sol_zero = sp.lambdify(t, analytic_par_sol_zero.rhs, "numpy")
```

### Zero order, numerically

Euler’s method replaces the derivative by a small finite step: $A(t + dt) \approx A(t) + dt \cdot \frac{dA}{dt}$. Here is a function that works for any first-order ODE. For a detailed explanation, see Steven Strogatz’s *Nonlinear Dynamics and Chaos*.

```python
def euler(init_cond, *constants, equation, dt=0.01, Tmax=10):
    """Euler's method for solving ODEs.
    init_cond : the initial condition
    constants : constants of the ODE, passed on to `equation`
    equation  : the right-hand side, f(y, *constants)
    dt        : the time step
    Tmax      : the duration
    """
    y = init_cond
    for step in range(int(round(Tmax / dt))):
        yield y                                 # value at t = step * dt
        y = y + dt * equation(y, *constants)    # one Euler step
```

With only a few lines this function takes any differential equation and returns a generator, one value per time step. We write the zero-order equation as a small `lambda` and pass it in, with the same $A(0) = 10$ and $k = 2$.

```python
zero_order = lambda c, k: -k
Ao, const = 10, 2
numeric_sol_zero = list(euler(Ao, const, equation=zero_order))
```

### Plotting both solutions

```python
def plot_solutions(t, numeric, analytic, title):
    """Overlay the numerical and analytical solutions on the time vector t."""
    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(t, analytic(t), 'k', label='analytical')
    ax.plot(t[::25], numeric[::25], 'o', ms=3, label='numerical (Euler)')
    ax.set_xlabel('time')
    ax.set_title(title)
    ax.legend()

time = np.arange(0, 10, 0.01)   # the same grid Euler used
plot_solutions(time, numeric_sol_zero, analytic_sol_zero, "Zero-order reaction, $A(0)=10$")
```

<figure class="fig" data-svg="fig/ch1-zero-order.svg"><figcaption>The concentration falls linearly, then keeps going: the model happily predicts negative concentrations after $t = 5$. A real reaction stops when $A$ runs out, which the zero-order approximation (saturated enzyme) no longer describes.</figcaption></figure>

### First order

We repeat the same steps.

```python
first_order = sp.Eq(-dAdt, k*A(t))
analytic_gen_sol_first = sp.dsolve(first_order, A(t))
analytic_gen_sol_first
```

```output
Eq(A(t), C1*exp(-k*t))
```

```python
analytic_gen_sol_first = analytic_gen_sol_first.subs(C1, A(0))
analytic_par_sol_first = analytic_gen_sol_first.subs({A(0): 10, k: 2})
analytic_par_sol_first
```

```output
Eq(A(t), 10*exp(-2*t))
```

```python
analytic_sol_first = sp.lambdify(t, analytic_par_sol_first.rhs, "numpy")

first_order = lambda c, k: -k*c
numeric_sol_first = list(euler(Ao, const, equation=first_order))

plot_solutions(time, numeric_sol_first, analytic_sol_first, "First-order reaction, $A(0)=10$")
```

<figure class="fig" data-svg="fig/ch1-first-order.svg"><figcaption>Exponential decay. With $dt = 0.01$ the Euler points sit on the exact curve.</figcaption></figure>

### How small does the step need to be?

Euler’s method is only as good as its step. Drag the slider to change $dt$ for the first-order reaction. Error grows with $dt$, and once $dt > 2/k = 1$ the numerical solution oscillates and blows up, although the true solution decays smoothly. This is why the step size is the first thing to check when a simulation behaves strangely.

<div class="widget" data-widget="euler"></div>

## Enzymatic equilibrium

Now consider a molecule that switches reversibly between two conformations, like an ion channel that opens and closes:

$$A \underset{\beta}{\overset{\alpha}{\rightleftharpoons}} B$$

The total $[A] + [B] = c_0$ is constant (conservation of mass), and

$$\frac{d[B]}{dt} = \alpha[A] - \beta[B].$$

In terms of fractions, with $f_A + f_B = 1$:

$$\frac{df_B}{dt} = \alpha f_A - \beta f_B.$$

Writing $f = f_B$ and $f_A = 1 - f$:

$$\frac{df}{dt} = \alpha(1 - f) - \beta f = \alpha - (\alpha + \beta) f.$$

Finally, with $\tau = \frac{1}{\alpha + \beta}$ and $f_\infty = \frac{\alpha}{\alpha + \beta}$:

$$\boxed{\tau \frac{df}{dt} = f_\infty - f(t)}$$

$f$ relaxes towards $f_\infty$ with time constant $\tau$. Keep this equation in mind: it is exactly how the gates of the Hodgkin–Huxley model behave in [chapter 3](03-active-membrane.md).

### Analytically

```python
tau, f_infty = sp.symbols(r'tau f_\infty')
f = sp.Function('f')
dfdt = f(t).diff(t)

equilibrium = sp.Eq(tau*dfdt, f_infty - f(t))
analytic_gen_sol_eq = sp.dsolve(equilibrium, f(t), ics={f(0): sp.Symbol('f_0')})
analytic_gen_sol_eq
```

```output
Eq(f(t), f_\infty + (f_0 - f_\infty)*exp(-t/tau))
```

Passing the initial condition with `ics=` lets SymPy find the constant for us, instead of solving for $C_1$ by hand as we did above. With $f_\infty = 6$, $\tau = 2$ and $f(0) = 0$:

```python
analytic_par_sol_eq = analytic_gen_sol_eq.subs({f_infty: 6, tau: 2, sp.Symbol('f_0'): 0})
analytic_par_sol_eq
```

```output
Eq(f(t), 6 - 6*exp(-t/2))
```

### Numerically

```python
analytic_sol_eq = sp.lambdify(t, analytic_par_sol_eq.rhs, "numpy")

eq = lambda f, f_oo, tau: (f_oo - f) / tau
f_const, finfty_const, tau_const = 0, 6, 2
numeric_sol_eq = list(euler(f_const, finfty_const, tau_const, equation=eq))

plot_solutions(time, numeric_sol_eq, analytic_sol_eq, "Chemical equilibrium, $f(0) = 0$")
```

<figure class="fig" data-svg="fig/ch1-equilibrium.svg"><figcaption>$f$ climbs towards $f_\infty = 6$ and has covered 63% of the way after one time constant, $t = \tau = 2$.</figcaption></figure>

## The Michaelis–Menten–Henri equation

Consider the reaction

$$S + E \underset{k_{-1}}{\overset{k_1}{\rightleftharpoons}} ES \xrightarrow{k_2} P + E$$

with $S$ the substrate, $E$ the enzyme, $ES$ the enzyme–substrate complex and $P$ the product. The **Michaelis–Menten equation** gives the initial reaction rate:

$$\boxed{v = \frac{d[P]}{dt} = \frac{V_{max}[S]}{K_m + [S]}}$$

where $V_{max} = k_2[E]_0$ and $K_m$, the Michaelis constant, is the substrate concentration at which the rate is half its maximum, $v = V_{max}/2$.

To read $K_m$ and $V_{max}$ off a graph, we use the **Lineweaver–Burk** representation, obtained by inverting the equation:

$$\boxed{\frac{1}{v} = \frac{K_m}{V_{max}} \frac{1}{[S]} + \frac{1}{V_{max}}}$$

It is a straight line: it crosses the $1/v$ axis at $1/V_{max}$ and the $1/[S]$ axis at $-1/K_m$.

```python
def mich_ment(substrate, vmax, km):
    """Reaction rate v from the Michaelis–Menten equation."""
    return (vmax * substrate) / (km + substrate)

def line_burk(substrate, vmax, km):
    """Lineweaver–Burk representation: returns 1/v."""
    return km / (vmax * substrate) + 1 / vmax
```

<details class="fold"><summary>Plotting code</summary>

```python
s = np.arange(0.1, 10, 0.1)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

ax1.plot(s, mich_ment(s, vmax=6, km=1))
ax1.axhline(6, ls='--', label='$V_{max}$')
ax1.plot(1, 3, 'o', label='$K_m$: $v = V_{max}/2$')
ax1.set_xlabel('$[S]$'); ax1.set_ylabel('$v$'); ax1.legend()

inv = np.linspace(-1.5, 10, 200)              # extend past 0 to see both intercepts
ax2.plot(inv, (1/6) * inv + 1/6)               # 1/v = Km/Vmax * 1/[S] + 1/Vmax
ax2.plot(-1, 0, 'o', label='$-1/K_m$')
ax2.plot(0, 1/6, 'o', label='$1/V_{max}$')
ax2.axhline(0, lw=.5); ax2.axvline(0, lw=.5)
ax2.set_xlabel('$1/[S]$'); ax2.set_ylabel('$1/v$'); ax2.legend()
```

</details>

<figure class="fig wide" data-svg="fig/ch1-michaelis.svg"><figcaption>Left: the rate saturates at $V_{max} = 6$ and reaches half of it at $[S] = K_m = 1$. Right: the same data on double-reciprocal axes. Extending the line to negative $1/[S]$ is what reveals $K_m$.</figcaption></figure>
