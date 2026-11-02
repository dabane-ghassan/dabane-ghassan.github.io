---
title: The active membrane
summary: The Hodgkin–Huxley model, four nonlinear differential equations for the action potential, written as a Python class and simulated with SciPy.
---

Active membrane currents are the basis of neuronal excitability: they let neurons receive, integrate and transmit signals. A landmark of neuroscience is the **Hodgkin–Huxley model** (1952), the conductance-based model: a set of four nonlinear differential equations that describe how excitable cells generate action potentials.

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp   # numerical ODE solver
```

## The Hodgkin–Huxley model

For a space-clamped squid axon:

$$c_M \dot V = -\bar g_{Na}\, m^3 h\,(V - E_{Na}) - \bar g_K\, n^4 (V - E_K) - \bar g_L (V - E_L) + I_{inj}$$

$$\dot n = \phi\,[\alpha_n(V)(1 - n) - \beta_n(V)\, n] = \frac{n_\infty(V) - n}{\tau_n(V)}$$

$$\dot m = \phi\,[\alpha_m(V)(1 - m) - \beta_m(V)\, m] = \frac{m_\infty(V) - m}{\tau_m(V)}$$

$$\dot h = \phi\,[\alpha_h(V)(1 - h) - \beta_h(V)\, h] = \frac{h_\infty(V) - h}{\tau_h(V)}$$

where $\phi$ is a temperature factor (1 at the 6.3 °C of the original experiments, which is what we use) and

$$\alpha_n(V) = \frac{0.01\,(10 - V)}{e^{(10 - V)/10} - 1}, \qquad \beta_n(V) = 0.125\, e^{-V/80},$$

$$\alpha_m(V) = \frac{0.1\,(25 - V)}{e^{(25 - V)/10} - 1}, \qquad \beta_m(V) = 4\, e^{-V/18},$$

$$\alpha_h(V) = 0.07\, e^{-V/20}, \qquad \beta_h(V) = \frac{1}{e^{(30 - V)/10} + 1}.$$

<aside class="note">

These are Hodgkin and Huxley’s original conventions: $V$ is the displacement from rest in mV, with depolarisation positive. The resting potential is therefore $V = 0$, and $E_{Na} = 115$, $E_K = -12$ and $E_L = 10.6$ mV. Add about −65 mV to compare with modern recordings.

</aside>

Each gate is a two-state molecule, open or closed, exactly like the enzymatic equilibrium of [chapter 1](01-enzyme-kinetics.md#enzymatic-equilibrium). Its time constant and steady state are therefore

$$\tau = \frac{1}{\alpha + \beta}, \qquad f_\infty = \frac{\alpha}{\alpha + \beta}.$$

Simulating the model means solving four coupled differential equations. Solving them analytically is out of reach, so we solve them numerically from initial values of $V$, $n$, $m$ and $h$.

We write a Python class, `Neuron`, that behaves like a Hodgkin–Huxley membrane: it exposes the rate functions, gating constants and currents for a range of voltages, and it can simulate itself from initial conditions we choose, such as the injected current or the starting voltage.

```python
class Neuron:
    """Hodgkin–Huxley model of an excitable membrane."""

    def __init__(self, voltage, sodium, potassium, leak):
        """voltage: array of membrane potentials (mV) for the steady-state curves.
        sodium, potassium, leak: dicts with conductance 'G' (mS/cm²) and reversal potential 'Eq' (mV)."""
        self.voltage = voltage
        self.Gna, self.Ena = sodium['G'], sodium['Eq']
        self.Gk, self.Ek = potassium['G'], potassium['Eq']
        self.Gl, self.El = leak['G'], leak['Eq']

    def __str__(self):
        return "Hello! I'm a Hodgkin & Huxley model"

    # rate functions (1/ms)
    def an(self, V): return 0.01 * (10 - V) / (np.exp((10 - V) / 10) - 1)
    def bn(self, V): return 0.125 * np.exp(-V / 80)
    def am(self, V): return 0.1 * (25 - V) / (np.exp((25 - V) / 10) - 1)
    def bm(self, V): return 4 * np.exp(-V / 18)
    def ah(self, V): return 0.07 * np.exp(-V / 20)
    def bh(self, V): return 1 / (np.exp((30 - V) / 10) + 1)

    # two-state kinetics
    def tau(self, alpha, beta): return 1 / (alpha + beta)
    def finfty(self, alpha, beta): return alpha / (alpha + beta)

    def time_constants(self):
        V = self.voltage
        return (self.tau(self.am(V), self.bm(V)), self.tau(self.ah(V), self.bh(V)),
                self.tau(self.an(V), self.bn(V)))

    def stationary_constants(self):
        V = self.voltage
        return (self.finfty(self.am(V), self.bm(V)), self.finfty(self.ah(V), self.bh(V)),
                self.finfty(self.an(V), self.bn(V)))

    def steady_currents(self):
        """Currents with every gate at its steady state (Ohm's law I = G(V - E))."""
        m, h, n = self.stationary_constants()
        V = self.voltage
        return (self.Gna * m**3 * h * (V - self.Ena), self.Gk * n**4 * (V - self.Ek),
                self.Gl * (V - self.El))

    def simulate(self, V_init, n_init, m_init, h_init, Tmax, inj=0):
        """Integrate the four equations from the given initial conditions for Tmax ms."""
        def hodgkin_huxley(t, y):
            V, n, m, h = y
            return [-self.Gna * m**3 * h * (V - self.Ena) - self.Gk * n**4 * (V - self.Ek)
                    - self.Gl * (V - self.El) + inj,
                    self.an(V) * (1 - n) - self.bn(V) * n,
                    self.am(V) * (1 - m) - self.bm(V) * m,
                    self.ah(V) * (1 - h) - self.bh(V) * h]

        sol = solve_ivp(hodgkin_huxley, [0, Tmax], [V_init, n_init, m_init, h_init],
                        t_eval=np.linspace(0, Tmax, 2000), max_step=0.05)
        t, (V, n, m, h) = sol.t, sol.y
        return {'t': t, 'V': V, 'n': n, 'm': m, 'h': h,
                'gNa': self.Gna * m**3 * h, 'gK': self.Gk * n**4,
                'INa': self.Gna * m**3 * h * (V - self.Ena),
                'IK': self.Gk * n**4 * (V - self.Ek), 'IL': self.Gl * (V - self.El)}
```

Now we create a neuron with Hodgkin and Huxley’s values, conductances in mS/cm² and reversal potentials in mV, and a voltage axis from −100 to +120 mV.

```python
Na = {'G': 120., 'Eq': 115.}
K = {'G': 36., 'Eq': -12.}
Leak = {'G': 0.3, 'Eq': 10.6}

v = np.linspace(-100, 120, 500)
cell = Neuron(voltage=v, sodium=Na, potassium=K, leak=Leak)
print(cell)
```

```output
Hello! I'm a Hodgkin & Huxley model
```

### Time constants and steady states

<details class="fold"><summary>Plotting code</summary>

```python
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
for y, label in zip(cell.time_constants(), [r'$\tau_m$', r'$\tau_h$', r'$\tau_n$']):
    ax1.plot(v, y, label=label)
for y, label in zip(cell.stationary_constants(), [r'$m_\infty$', r'$h_\infty$', r'$n_\infty$']):
    ax2.plot(v, y, label=label)
ax1.set_ylabel('ms'); ax1.set_ylim(0, 10)
for ax in (ax1, ax2):
    ax.set_xlabel('V (mV)'); ax.legend()
```

</details>

<figure class="fig wide" data-svg="fig/ch3-gates.svg"><figcaption>$m$ is fast and opens with depolarisation; $h$ and $n$ are about ten times slower, $h$ closing and $n$ opening. That delay is the whole action potential: sodium rushes in before inactivation and potassium catch up.</figcaption></figure>

### The model’s currents

With every gate held at its steady state we get the steady-state I–V curves.

<details class="fold"><summary>Plotting code</summary>

```python
fig, ax = plt.subplots()
INa, IK, IL = cell.steady_currents()
ax.plot(v, IK, label='$I_K$'); ax.plot(v, INa, label='$I_{Na}$'); ax.plot(v, IL, label='$I_L$')
ax.set_ylim(-200, 500)
ax.set_xlabel('V (mV)'); ax.set_ylabel(r'I (µA/cm$^2$)'); ax.legend()
```

</details>

<figure class="fig" data-svg="fig/ch3-iv.svg"><figcaption>At steady state sodium is almost entirely inactivated, so $I_{Na}$ stays small: the large sodium current only exists transiently, before $h$ has time to close.</figcaption></figure>

### Simulating the model

Finally, we simulate the model from chosen initial conditions. Let’s inject a constant current of 15 µA/cm², start from $V = -10$ mV with $n = m = 0$ and $h = 1$, and run for 50 ms.

```python
sim = cell.simulate(V_init=-10, n_init=0, m_init=0, h_init=1, Tmax=50, inj=15)
print(f"{np.sum((sim['V'][1:] > 50) & (sim['V'][:-1] <= 50))} spikes in 50 ms")
```

```output
4 spikes in 50 ms
```

<details class="fold"><summary>Plotting code</summary>

```python
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 7), sharex=True)
ax1.plot(sim['t'], sim['V']); ax1.set_ylabel('V (mV)')
for key in ('INa', 'IK', 'IL'):
    ax2.plot(sim['t'], sim[key], label=key)
ax2.set_ylabel('µA/cm²'); ax2.legend()
ax3.plot(sim['t'], sim['gNa'], label='$g_{Na}$'); ax3.plot(sim['t'], sim['gK'], label='$g_K$')
ax3.set_ylabel('mS/cm²'); ax3.set_xlabel('t (ms)'); ax3.legend()
```

</details>

<figure class="fig wide" data-svg="fig/ch3-sim.svg"><figcaption>A train of action potentials. Each spike is a sodium inrush (red, negative by convention) followed by a slower potassium outflow (green); the conductances show the same sequence.</figcaption></figure>

### Try it

Change the injected current and watch the membrane go from silent, to a single spike, to repetitive firing. Here the simulation starts from rest and runs for 100 ms. Below about 2.3 µA/cm² nothing happens; between 2.3 and 6.2 the membrane fires a single spike and settles; from about 6.3 it fires a regular train whose frequency rises with the current. Push towards 100 µA/cm² and the spikes shrink and stop, the membrane stuck depolarised: this is depolarisation block.

<div class="widget" data-widget="hh"></div>
