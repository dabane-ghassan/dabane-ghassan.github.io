---
title: The passive membrane
summary: The Nernst equation, current–voltage curves from Ohm’s law and the Goldman–Hodgkin–Katz model, and how the membrane potential spreads in time and in space.
---

In this chapter we implement the elementary biophysical properties of the neuronal membrane: the equilibrium potential given by the Nernst equation, the relationship between current and voltage, and the time- and space-dependent properties of the phospholipid bilayer.

Passive membrane properties matter because they shape how neurons integrate their inputs and how far a signal travels before it fades.

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
```

## Equilibrium potential

The **Nernst equation** gives the equilibrium potential of one ion species:

$$\boxed{E_{ion} = \frac{RT}{z\mathcal{F}} \ln\left(\frac{c_{out}}{c_{in}}\right)}$$

- $R = 8.314\ \mathrm{J \cdot K^{-1} \cdot mol^{-1}}$ is the ideal gas constant.
- $T$ is the absolute temperature, $T = 273.15 + T(°\mathrm{C})$.
- $\mathcal{F} \approx 96\,485\ \mathrm{C \cdot mol^{-1}}$ is Faraday’s constant, the elementary charge times Avogadro’s number.
- $z$ is the valence of the ion.
- $c_{out}/c_{in}$ is the extracellular over the intracellular concentration. The extracellular space is the electrical reference (we measure the inside relative to it), so it goes in the numerator.

$E_{ion}$ is the membrane potential at which the net flow of that ion is zero: as many ions enter the cell as leave it.

Here are ion concentrations (mM) for three cell types at their usual temperatures.

| Ion | Frog muscle, 20 °C in / out | Squid giant axon, 6.3 °C in / out | Mammalian cell, 37 °C in / out |
|---|---|---|---|
| K⁺ | 124 / 2.25 | 400 / 20 | 140 / 5 |
| Na⁺ | 10.4 / 109 | 50 / 440 | 5–15 / 145 |
| Cl⁻ | 1.5 / 77.5 | 40–150 / 560 | 4 / 110 |
| Ca²⁺ | 10⁻⁴ / 2.1 | 10⁻⁴ / 10 | 10⁻⁴ / 2.5–5 |

The aim is to compute the equilibrium potential of every ion in every cell. We can automate it in three steps:

1. choose a Python data structure for the valence, concentrations and temperature,
2. translate the Nernst equation into a function and apply it,
3. collect the results in a table.

A nested dictionary fits well: one entry per cell type holding its temperature and, for each ion, a tuple `(z, c_out, c_in)`. Where the table gives a range we take one end of it, and concentrations are converted to mol/L.

```python
cells = {
    'frog':   {'T': 20,  'ions': {'K': (+1, 2.25e-3, 124e-3), 'Na': (+1, 109e-3, 10.4e-3),
                                  'Cl': (-1, 77.5e-3, 1.5e-3), 'Ca': (+2, 2.1e-3, 1e-7)}},
    'squid':  {'T': 6.3, 'ions': {'K': (+1, 20e-3, 400e-3),   'Na': (+1, 440e-3, 50e-3),
                                  'Cl': (-1, 560e-3, 40e-3),   'Ca': (+2, 10e-3, 1e-7)}},
    'mammal': {'T': 37,  'ions': {'K': (+1, 5e-3, 140e-3),    'Na': (+1, 145e-3, 5e-3),
                                  'Cl': (-1, 110e-3, 4e-3),    'Ca': (+2, 2.5e-3, 1e-7)}},
}
```

Some constants, and the equation itself:

```python
EC, AV, GAS_CONST = 1.60217646e-19, 6.0221415e23, 8.314472  # elementary charge, Avogadro, gas constant
FC = EC * AV                                                 # Faraday's constant

abs_temp = lambda celsius: celsius + 273.15                  # °C → K

def nernst(z, c_out, c_in, T):
    """Equilibrium potential (V) of an ion of valence z at temperature T (°C)."""
    return GAS_CONST * abs_temp(T) / (z * FC) * np.log(c_out / c_in)
```

Now we loop over every cell and every ion and let pandas lay out the results, in millivolts.

```python
results = {cell: {ion: 1e3 * nernst(*values, info['T']) for ion, values in info['ions'].items()}
           for cell, info in cells.items()}
ion_eq = pd.DataFrame(results).round(1)
ion_eq
```

```output
     frog  squid  mammal
K  -101.3  -72.1   -89.1
Na   59.4   52.4    90.0
Cl  -99.7  -63.6   -88.6
Ca  125.7  138.6   135.3
```

Potassium sits near −70 to −100 mV in every cell, sodium is strongly positive, and calcium, with its 10 000-fold gradient and double charge, is the most positive of all.

## I–V curves

Every change in membrane current $I$ comes with a change in membrane potential $V$, and the other way round. Electrophysiology describes this relationship with two models.

In the **linear model** the current follows Ohm’s law,

$$I_{ion} = g_{ion}\,(V_m - E_{ion}),$$

and the resting potential is the conductance-weighted mean of the equilibrium potentials:

$$V_{rest} = \frac{\sum_i g_i E_i}{\sum_i g_i}.$$

In the **Goldman–Hodgkin–Katz (GHK)** model the current is

$$\boxed{I_{ion} = P\, z_{ion} \mathcal{F}\, \xi \left(\frac{c_{out} e^{-\xi} - c_{in}}{e^{-\xi} - 1}\right)}$$

where $\xi = \frac{z_{ion}\mathcal{F}V}{RT}$ and $P$ is the permeability of the membrane to that ion. At rest the total current is zero, which gives the GHK voltage equation:

$$\boxed{V_{rest} = \frac{RT}{\mathcal{F}} \ln\left(\frac{P_K[K^+]_{out} + P_{Na}[Na^+]_{out} + P_{Cl}[Cl^-]_{in}}{P_K[K^+]_{in} + P_{Na}[Na^+]_{in} + P_{Cl}[Cl^-]_{out}}\right)}$$

Note the chloride terms are flipped: it carries a negative charge.

Let’s implement the GHK model for the squid axon. Take voltages from −100 to +100 mV, a K⁺ permeability of $1.96 \times 10^{-5}\ \mathrm{cm \cdot s^{-1}}$ and permeability ratios $P_K : P_{Na} : P_{Cl} = 1 : 0.03 : 0.1$.

```python
v = np.linspace(-100e-3, 100e-3, 100)
P = {'K': 1.96e-5, 'Na': 1.96e-5 * 0.03, 'Cl': 1.96e-5 * 0.1}
squid, T_squid = cells['squid']['ions'], cells['squid']['T']

def I_ghk(z, c_out, c_in, P, voltage, T):
    """GHK current for an array of voltages."""
    xi = z * FC * voltage / (GAS_CONST * abs_temp(T))
    return P * z * FC * xi * (c_out * np.exp(-xi) - c_in) / (np.exp(-xi) - 1)

def vrest_ghk(ions, P, T):
    """Resting potential from the GHK voltage equation (K, Na and Cl only)."""
    num = sum(P[i] * (ions[i][1] if ions[i][0] > 0 else ions[i][2]) for i in ('K', 'Na', 'Cl'))
    den = sum(P[i] * (ions[i][2] if ions[i][0] > 0 else ions[i][1]) for i in ('K', 'Na', 'Cl'))
    return GAS_CONST * abs_temp(T) / FC * np.log(num / den)

print(f"V_rest = {1e3 * vrest_ghk(squid, P, T_squid):.1f} mV")
```

```output
V_rest = -60.4 mV
```

The resting potential lies close to $E_K$ (−72 mV) because the membrane is most permeable to potassium, pulled up a little by sodium and chloride.

<details class="fold"><summary>Plotting code</summary>

```python
fig, ax = plt.subplots()
for ion, color in [('K', 'r'), ('Na', 'g'), ('Cl', 'b')]:
    z, c_out, c_in = squid[ion]
    ax.plot(v * 1e3, I_ghk(z, c_out, c_in, P[ion], v, T_squid), color, label=ion)
    E = nernst(z, c_out, c_in, T_squid)                 # where each curve crosses zero
    ax.plot(E * 1e3, 0, 'o' + color)
ax.plot(1e3 * vrest_ghk(squid, P, T_squid), 0, 'ok', label='$V_{rest}$')
ax.axhline(0, lw=.5)
ax.set_ylim(-0.2, 1.5)
ax.set_xlabel('$V$ (mV)'); ax.set_ylabel('$I$')
ax.legend()
```

</details>

<figure class="fig" data-svg="fig/ch2-ghk.svg"><figcaption>Each GHK current crosses zero at its ion’s Nernst potential (dots). The curves are not straight lines: unlike Ohm’s law, GHK currents rectify, because the concentrations on the two sides differ.</figcaption></figure>

So far we have computed each ion’s equilibrium potential, seen how its current varies with voltage, and found the resting potential of the squid axon. Next: how the membrane potential changes with time and with distance.

## Temporal properties

When current is injected into a cell, the membrane does not respond instantly: it takes time to reach its new potential. That time is set by the **membrane time constant**

$$\boxed{\tau = R_m C_m = r_m c_m}$$

and the potential follows

$$\boxed{V_m(t) = V_{rest} + r_m I_0 \left(1 - e^{-t/\tau}\right)}$$

where $r_m$ is the membrane resistance (the specific resistance $R_m$ divided by the membrane surface $S$), $I_0$ is the injected current and $t$ is time. This is the same relaxation equation as the enzymatic equilibrium of [chapter 1](01-enzyme-kinetics.md).

```python
tau = lambda Rm, Cm: Rm * Cm

def potential_t(time, Rm, surface, Io, rest_potential=0, Cm=1):
    """Membrane potential over time after injecting Io.
    Cm defaults to 1 µF/cm², so tau equals Rm."""
    return rest_potential + (Rm * Io / surface) * (1 - np.exp(-time / tau(Rm, Cm)))
```

Let’s see the time course for four surfaces and four resistances, 5, 10, 15 and 20, over 100 ms.

<details class="fold"><summary>Plotting code</summary>

```python
t = np.linspace(0, 100, 200)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), sharey=True)
for val in (5, 10, 15, 20):
    for ax, Rm, S, label in [(ax1, 8, val, f'S = {val}'), (ax2, val, 5, f'R = {val}')]:
        line, = ax.plot(t, potential_t(t, Rm, S, Io=10), label=label)
        V_tau = potential_t(tau(Rm, 1), Rm, S, Io=10)   # 63% of the change
        ax.plot(tau(Rm, 1), V_tau, 'o', color=line.get_color())
ax1.set_title('Surface'); ax2.set_title('Resistance')
for ax in (ax1, ax2):
    ax.set_xlabel('$t$ (ms)'); ax.legend()
```

</details>

<figure class="fig wide" data-svg="fig/ch2-time.svg"><figcaption>Dots mark $t = \tau$, where the potential has covered 63% of its change.</figcaption></figure>

Increasing the surface does not change the time constant; it only shrinks the voltage change produced by the same current. Increasing the membrane resistance does both: a larger change in potential, reached more slowly. The more resistant the membrane, the longer it takes to charge.

## Spatial properties

Along a dendrite or an axon, the voltage change decays with the distance $x$ from the injection point:

$$\boxed{\Delta V(x) = \Delta V_{max}\, e^{-x/\lambda}}$$

How fast it decays depends on the **length constant**

$$\boxed{\lambda = \sqrt{\frac{a R_m}{2 R_i}}}$$

where $a$ is the radius of the process, $R_m$ the specific membrane resistance and $R_i$ the axial (intracellular) resistivity. Let’s see how the radius changes $\lambda$.

```python
length_const = lambda a, Ri, Rm: np.sqrt(a * Rm / (2 * Ri))

def potential_x(x, radius, dV_max=1, Ri=2, Rm=2):
    """Change in membrane potential at distance x from the injection site."""
    return dV_max * np.exp(-x / length_const(radius, Ri, Rm))
```

<details class="fold"><summary>Plotting code</summary>

```python
x = np.linspace(0, 20, 100)
fig, ax = plt.subplots()
for a in (2, 8, 16, 32):
    lam = length_const(a, 2, 2)
    line, = ax.plot(x, potential_x(x, a), label=f'a = {a}')
    ax.plot(lam, potential_x(lam, a), 'o', color=line.get_color())
ax.axhline(np.exp(-1), color='k', ls='--')   # e^-1 ≈ 0.37
ax.set_xlabel('distance'); ax.set_ylabel(r'$\Delta V(x)$'); ax.legend()
```

</details>

<figure class="fig" data-svg="fig/ch2-space.svg"><figcaption>At $x = \lambda$ the voltage change has fallen to $e^{-1} \approx 37\%$ of its maximum, a 63% decrease.</figcaption></figure>

The thicker the process, the longer its length constant, so the further a passive (electrotonic) potential travels. This is one reason the squid evolved a giant axon.
