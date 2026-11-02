"""Re-renders every ModNeuro figure in the site style.

    cd teaching/modneuro && python3 _src/build_figures.py
"""
from collections import Counter
from itertools import combinations

import networkx as nx
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

from style import BLUE, FG, GREEN, RED, fig, ghost, plt, save


def euler(y0, f, dt, n):
    y = [y0]
    for _ in range(n - 1):
        y.append(y[-1] + dt * f(y[-1]))
    return np.array(y)


# ---------------------------------------------------------------- 01 enzyme kinetics
def ch1():
    t = np.arange(0, 10, 0.01)
    cases = [
        ("ch1-zero-order", lambda a: -2.0, 10 - 2 * t, "Zero order, $A(0)=10$, $k=2$", (0, 6)),
        ("ch1-first-order", lambda a: -2.0 * a, 10 * np.exp(-2 * t), "First order, $A(0)=10$, $k=2$", (0, 4)),
        ("ch1-equilibrium", lambda f: (6 - f) / 2, 6 - 6 * np.exp(-t / 2), r"Equilibrium, $f(0)=0$, $f_\infty=6$, $\tau=2$", (0, 10)),
    ]
    for name, f, exact, title, xl in cases:
        y0 = exact[0]
        num = euler(y0, f, 0.01, len(t))
        F, ax = fig(6.4, 2.7)
        ax.plot(t, exact, color=FG, lw=1.2, label="analytical (SymPy)")
        step = 25
        ax.plot(t[::step], num[::step], "o", ms=3.2, color=RED, label="numerical (Euler, $dt=0.01$)")
        ax.set_xlim(*xl)
        if name == "ch1-zero-order":
            ax.set_ylim(0, 10.5)
        ax.set_xlabel("time")
        ax.set_ylabel("$A(t)$" if "equilibrium" not in name else "$f(t)$")
        ax.set_title(title)
        ax.legend(loc="upper right" if "equilibrium" not in name else "lower right")
        save(F, name)

    # Michaelis–Menten and Lineweaver–Burk
    vmax, km = 6, 1
    s = np.linspace(0.05, 10, 400)
    F, (a1, a2) = fig(7.4, 3.0, ncols=2)
    a1.plot(s, vmax * s / (km + s), color=BLUE)
    a1.axhline(vmax, ls="--", lw=1, color=FG, alpha=.4)
    a1.text(9.8, vmax - .35, "$V_{max}$", ha="right", va="top")
    a1.plot([km, km], [0, vmax / 2], ls=":", lw=1, color=RED)
    a1.plot([0, km], [vmax / 2, vmax / 2], ls=":", lw=1, color=RED)
    a1.plot(km, vmax / 2, "o", color=RED, ms=5)
    a1.annotate("$K_m$: half-maximal rate", (km, vmax / 2), (2.4, 2.0), fontsize=8.5,
                arrowprops=dict(arrowstyle="-", color=FG, alpha=.4, lw=.8))
    a1.set_xlim(0, 10); a1.set_ylim(0, 6.6)
    a1.set_xlabel("$[S]$"); a1.set_ylabel("$v$")
    a1.set_title("Michaelis–Menten")
    inv = np.linspace(-1.6, 10, 200)
    a2.plot(inv, km / vmax * inv + 1 / vmax, color=BLUE)
    a2.axhline(0, color=FG, lw=.6, alpha=.4); a2.axvline(0, color=FG, lw=.6, alpha=.4)
    a2.plot(-1 / km, 0, "o", color=RED, ms=5)
    a2.plot(0, 1 / vmax, "o", color=GREEN, ms=5)
    a2.annotate("$-1/K_m$", (-1 / km, 0), (-1.5, .45), fontsize=9, color=RED)
    a2.annotate("$1/V_{max}$", (0, 1 / vmax), (.6, .05), fontsize=9, color=GREEN)
    a2.text(5.2, 1.25, "slope $K_m/V_{max}$", fontsize=8.5, alpha=.7)
    a2.set_xlim(-1.8, 10); a2.set_ylim(-.15, 2)
    a2.set_xlabel("$1/[S]$"); a2.set_ylabel("$1/v$")
    a2.set_title("Lineweaver–Burk")
    F.tight_layout(w_pad=3)
    save(F, "ch1-michaelis")


# ---------------------------------------------------------------- 02 passive membrane
R, FC = 8.314472, 1.60217646e-19 * 6.0221415e23
K = lambda c: c + 273.15


def ch2():
    squid = {"K": (1, 20e-3, 400e-3, 1.96e-5), "Na": (1, 440e-3, 50e-3, 1.96e-5 * .03), "Cl": (-1, 560e-3, 40e-3, 1.96e-5 * .1)}
    T = 6.3

    def ghk(z, co, ci, P, V):
        xi = z * FC * V / (R * K(T))
        return P * z * FC * xi * (co * np.exp(-xi) - ci) / (np.exp(-xi) - 1)

    def nernst(z, co, ci):
        return R * K(T) / (z * FC) * np.log(co / ci)

    v = np.linspace(-100e-3, 100e-3, 401)
    v = v[np.abs(v) > 1e-9]
    F, ax = fig(6.4, 3.4)
    for (ion, (z, co, ci, P)), c, lab in zip(squid.items(), [RED, GREEN, BLUE], ["K$^+$", "Na$^+$", "Cl$^-$"]):
        ax.plot(v * 1e3, ghk(z, co, ci, P, v), color=c, label=lab)
        e = nernst(z, co, ci)
        ax.plot(e * 1e3, 0, "o", color=c, ms=5)
    num = sum(P * (co if z > 0 else ci) for z, co, ci, P in squid.values())
    den = sum(P * (ci if z > 0 else co) for z, co, ci, P in squid.values())
    vr = R * K(T) / FC * np.log(num / den)
    ax.axhline(0, color=FG, lw=.6, alpha=.4)
    ax.plot(vr * 1e3, 0, "o", ms=7, mfc="none", mec=FG, mew=1.4, label=r"$V_{rest}$ (GHK)")
    ax.set_ylim(-.2, 1.5); ax.set_xlim(-100, 100)
    ax.set_xlabel("$V$ (mV)"); ax.set_ylabel("$I$ (A·m$^{-2}$, arbitrary scale)")
    ax.set_title("Goldman–Hodgkin–Katz currents, squid giant axon")
    ax.legend(loc="upper left")
    save(F, "ch2-ghk")

    # time course
    t = np.linspace(0, 100, 400)
    Vt = lambda Rm, S, I0: Rm * I0 / S * (1 - np.exp(-t / Rm))
    cols = [BLUE, GREEN, RED, FG]
    F, (a1, a2) = fig(7.4, 3.1, ncols=2, sharey=True)
    for val, c in zip([5, 10, 15, 20], cols):
        for ax, Rm, S, lab in [(a1, 8, val, f"S = {val}"), (a2, val, 5, f"R = {val}")]:
            ax.plot(t, Vt(Rm, S, 10), color=c, label=lab)
            vt = Rm * 10 / S * (1 - np.exp(-1))
            ax.plot([Rm, Rm], [0, vt], ls=":", lw=1, color=c); ax.plot(Rm, vt, "o", color=c, ms=4)
    a1.set_title("Changing the surface ($R_m = 8$)"); a2.set_title("Changing the resistance ($S = 5$)")
    for ax in (a1, a2):
        ax.set_xlabel("$t$ (ms)"); ax.legend(loc="lower right"); ax.set_xlim(0, 100)
    a1.set_ylabel(r"$V_m(t) - V_{rest}$")
    a1.text(30, 13.5, r"dots: $t=\tau$, 63% of $\Delta V$", fontsize=8.5, alpha=.7)
    F.tight_layout(w_pad=2.5)
    save(F, "ch2-time")

    # space course
    x = np.linspace(0, 20, 300)
    F, ax = fig(6.4, 3.1)
    for a, c in zip([2, 8, 16, 32], cols):
        lam = np.sqrt(a * 2 / (2 * 2))
        ax.plot(x, np.exp(-x / lam), color=c, label=f"a = {a}")
        ax.plot([lam, lam], [0, np.exp(-1)], ls=":", lw=1, color=c); ax.plot(lam, np.exp(-1), "o", color=c, ms=4)
    ax.axhline(np.exp(-1), color=FG, ls="--", lw=.8, alpha=.4)
    ax.text(19.8, np.exp(-1) + .03, r"$\Delta V = 37\%$ of $\Delta V_{max}$ at $x = \lambda$", ha="right", fontsize=8.5, alpha=.7)
    ax.set_xlabel("distance $x$"); ax.set_ylabel(r"$\Delta V(x)\, /\, \Delta V_{max}$")
    ax.set_title("Larger radius, longer length constant")
    ax.set_xlim(0, 20); ax.set_ylim(0, 1.03); ax.legend()
    save(F, "ch2-space")


# ---------------------------------------------------------------- 03 active membrane
an = lambda v: 0.01 * (10 - v) / (np.exp((10 - v) / 10) - 1)
bn = lambda v: 0.125 * np.exp(-v / 80)
am = lambda v: 0.1 * (25 - v) / (np.exp((25 - v) / 10) - 1)
bm = lambda v: 4 * np.exp(-v / 18)
ah = lambda v: 0.07 * np.exp(-v / 20)
bh = lambda v: 1 / (np.exp((30 - v) / 10) + 1)
GNA, ENA, GK, EK, GL, EL = 120, 115, 36, -12, 0.3, 10.6


def ch3():
    v = np.linspace(-100, 120, 600)
    v = v[(np.abs(v - 10) > 1e-6) & (np.abs(v - 25) > 1e-6)]
    F, (a1, a2) = fig(7.4, 3.0, ncols=2)
    for a, b, c, lab in [(am, bm, RED, "m"), (ah, bh, BLUE, "h"), (an, bn, GREEN, "n")]:
        a1.plot(v, 1 / (a(v) + b(v)), color=c, label=rf"$\tau_{lab}$")
        a2.plot(v, a(v) / (a(v) + b(v)), color=c, label=rf"${lab}_\infty$")
    a1.set_title("Time constants"); a1.set_ylabel("ms"); a1.set_ylim(0, 10)
    a2.set_title("Steady-state activation"); a2.set_ylim(-.02, 1.02)
    for ax in (a1, a2):
        ax.set_xlabel("$V$ (mV, from rest)"); ax.legend(loc="upper right"); ax.set_xlim(-100, 120)
    F.tight_layout(w_pad=3)
    save(F, "ch3-gates")

    # steady-state I–V
    F, ax = fig(6.4, 3.2)
    m, h, n = am(v) / (am(v) + bm(v)), ah(v) / (ah(v) + bh(v)), an(v) / (an(v) + bn(v))
    ax.plot(v, GK * n ** 4 * (v - EK), color=GREEN, label=r"$I_{K}$")
    ax.plot(v, GNA * m ** 3 * h * (v - ENA), color=RED, label=r"$I_{Na}$")
    ax.plot(v, GL * (v - EL), color=BLUE, label=r"$I_{L}$")
    ax.axhline(0, color=FG, lw=.6, alpha=.4)
    ax.set_ylim(-200, 500); ax.set_xlim(-100, 120)
    ax.set_xlabel("$V$ (mV, from rest)"); ax.set_ylabel(r"$I$ (µA/cm$^2$)")
    ax.set_title("Steady-state I–V curves (gates at $m_\\infty, h_\\infty, n_\\infty$)")
    ax.legend(loc="upper left")
    save(F, "ch3-iv")

    # simulation from the original notebook
    def hh(t, y, I):
        V, n, m, h = y
        return [-GNA * m**3 * h * (V - ENA) - GK * n**4 * (V - EK) - GL * (V - EL) + I,
                an(V) * (1 - n) - bn(V) * n, am(V) * (1 - m) - bm(V) * m, ah(V) * (1 - h) - bh(V) * h]
    sol = solve_ivp(hh, [0, 50], [-10, 0, 0, 1], args=(15,), t_eval=np.linspace(0, 50, 2000), max_step=.05)
    t, (V, n, m, h) = sol.t, sol.y
    F, axs = fig(7.4, 4.6, nrows=3, sharex=True, gridspec_kw=dict(height_ratios=[1.3, 1, 1]))
    axs[0].plot(t, V, color=FG, lw=1.4); axs[0].set_ylabel("$V$ (mV)")
    axs[0].set_title("Hodgkin–Huxley, $I = 15$ µA/cm², start at $V=-10$, $n=m=0$, $h=1$")
    axs[1].plot(t, GNA * m**3 * h * (V - ENA), color=RED, label=r"$I_{Na}$")
    axs[1].plot(t, GK * n**4 * (V - EK), color=GREEN, label=r"$I_{K}$")
    axs[1].plot(t, GL * (V - EL), color=BLUE, label=r"$I_{L}$")
    axs[1].set_ylabel("µA/cm²"); axs[1].legend(loc="upper right", ncols=3)
    axs[2].plot(t, GNA * m**3 * h, color=RED, label=r"$g_{Na}$")
    axs[2].plot(t, GK * n**4, color=GREEN, label=r"$g_{K}$")
    axs[2].set_ylabel("mS/cm²"); axs[2].legend(loc="upper right", ncols=2); axs[2].set_xlabel("$t$ (ms)")
    axs[2].set_xlim(0, 50)
    F.align_ylabels(axs); F.tight_layout(h_pad=.6)
    save(F, "ch3-sim")


# ---------------------------------------------------------------- 04 neuronal models
def ch4():
    C, gL, EL_, gK, EK_, Vh, k = 1, 0.2, -50, 2, -80, -76, -12
    hinf = lambda v: 1 / (1 + np.exp((Vh - v) / k))
    IL = lambda v: gL * (v - EL_)
    IKir = lambda v: gK * hinf(v) * (v - EK_)
    Vdot = lambda v, I: (I - IL(v) - IKir(v)) / C
    dVdot = lambda v, I: (Vdot(v + 1e-6, I) - Vdot(v - 1e-6, I)) / 2e-6

    v = np.linspace(-200, 100, 600)
    F, (a1, a2) = fig(7.4, 3.0, ncols=2)
    a1.plot(v, hinf(v), color=RED); a1.set_title(r"Gating variable $h_\infty(V)$"); a1.set_xlabel("$V$ (mV)")
    a2.plot(v, IL(v), color=BLUE, label="$I_L$"); a2.plot(v, IKir(v), color=GREEN, label=r"$I_{Kir}$")
    a2.axhline(0, color=FG, lw=.6, alpha=.4)
    a2.set_title("I–V curves"); a2.set_xlabel("$V$ (mV)"); a2.legend()
    F.tight_layout(w_pad=3)
    save(F, "ch4-kir-iv")

    I = 6
    eqs = [brentq(Vdot, a, b, args=(I,)) for a, b in [(-70, -60), (-50, -40), (-40, -20)]]
    vv = np.linspace(-77, -20, 400)
    F, ax = fig(6.4, 3.0)
    ax.plot(vv, Vdot(vv, I), color=FG, lw=1.6)
    ax.axhline(0, color=FG, lw=.6, alpha=.4)
    for e in eqs:
        st = dVdot(e, I) < 0
        ax.plot(e, 0, "o", ms=9, color=RED if st else "none", mec=RED, mew=1.6, zorder=5)
    for x0, dx in [(-76, 7), (-50, -7), (-45, 7), (-21, -6)]:
        ax.annotate("", (x0 + dx, 0), (x0, 0), arrowprops=dict(arrowstyle="-|>", color=BLUE, lw=1.6, mutation_scale=12))
    ax.plot([], [], "o", color=RED, label="stable"); ax.plot([], [], "o", mfc="none", mec=RED, mew=1.6, label="unstable")
    ax.set_xlim(-77, -20); ax.set_ylim(-2, 2)
    ax.set_xlabel("$V$ (mV)"); ax.set_ylabel(r"$\dot V$")
    ax.set_title(r"Phase portrait of the $I_{Kir}$ model, $I = 6$")
    ax.legend(loc="upper right")
    save(F, "ch4-kir-phase")

    vb = np.linspace(-100, 0, 800)
    Ib = IL(vb) + IKir(vb)
    stable = np.array([dVdot(x, i) < 0 for x, i in zip(vb, Ib)])
    F, ax = fig(6.4, 3.0)
    for mask, ls, lab in [(stable, "-", "stable"), (~stable, "--", "unstable")]:
        ax.plot(np.where(mask, Ib, np.nan), vb, ls=ls, color=GREEN if ls == "-" else FG, lw=1.8, label=lab)
    ax.axvline(I, color=BLUE, lw=1, alpha=.7)
    for e in eqs:
        st = dVdot(e, I) < 0
        ax.plot(I, e, "o", ms=6, color=RED if st else "none", mec=RED, mew=1.4, zorder=5)
    # saddle-node points: dI/dV = 0
    dI = np.gradient(Ib, vb); sn = np.where(np.diff(np.sign(dI)))[0]
    for i in sn:
        ax.plot(Ib[i], vb[i], "s", ms=5, color=FG)
    ax.text(I + .04, -95, "$I = 6$", color=BLUE, fontsize=8.5)
    ax.set_xlim(5, 7.5); ax.set_ylim(-100, 0)
    ax.set_xlabel("injected current $I$"); ax.set_ylabel("equilibrium $V^*$ (mV)")
    ax.set_title("Bifurcation diagram: two saddle-node bifurcations (squares)")
    ax.legend(loc="upper left")
    save(F, "ch4-kir-bif")

    # FitzHugh–Nagumo
    a, b, tau = 0.7, 0.8, 13
    for name, V0, w0, I, T in [("ch4-fn-1", 0, 0, 0.3, 100), ("ch4-fn-2", -2, -1.5, 0.5, 100)]:
        sol = solve_ivp(lambda t, z: [z[0] - z[0]**3 / 3 - z[1] + I, (z[0] + a - b * z[1]) / tau], [0, T], [V0, w0],
                        t_eval=np.linspace(0, T, 1500), max_step=.1)
        vs = brentq(lambda v: v - v**3 / 3 + I - (v + a) / b, -2, 2); ws = (vs + a) / b
        ev = np.linalg.eigvals([[1 - vs**2, -1], [1 / tau, -b / tau]])
        kind = ("stable" if ev.real.max() < 0 else "unstable") + (" focus" if abs(ev.imag).max() > 0 else " node")
        F, (p, q) = fig(7.6, 3.2, ncols=2, gridspec_kw=dict(width_ratios=[1, 1.15]))
        X, Y = np.meshgrid(np.linspace(-2.7, 2.7, 15), np.linspace(-1.8, 1.8, 11))
        U, W = X - X**3 / 3 - Y + I, (X + a - b * Y) / tau
        p.quiver(X, Y, U, W * 3, color=FG, alpha=.25, angles="xy", width=.004, headwidth=4)
        vv = np.linspace(-3, 3, 300)
        p.plot(vv, vv - vv**3 / 3 + I, color=RED, lw=1.3, label="$V$-nullcline")
        p.plot(vv, (vv + a) / b, color=GREEN, lw=1.3, label="$w$-nullcline")
        p.plot(sol.y[0], sol.y[1], color=BLUE, lw=1.6, label="trajectory")
        p.plot(V0, w0, "o", color=BLUE, ms=4)
        st = "stable" in kind
        p.plot(vs, ws, "o", ms=7, color=FG if st else "none", mec=FG, mew=1.4, label=f"equilibrium ({kind})", zorder=5)
        p.set_xlim(-3, 3); p.set_ylim(-2, 2); p.set_xlabel("$V$"); p.set_ylabel("$w$")
        p.set_title("Phase plane"); p.legend(loc="lower right", fontsize=7.5)
        q.plot(sol.t, sol.y[0], color=BLUE, label="$V(t)$"); q.plot(sol.t, sol.y[1], color=RED, label="$w(t)$")
        q.set_xlabel("time"); q.set_title(f"Solution, $I = {I}$, $V_0={V0}$, $w_0={w0}$"); q.legend(loc="upper right", ncols=2)
        q.set_xlim(0, T)
        F.tight_layout(w_pad=2.5)
        save(F, name)

    # Hindmarsh–Rose
    def hr(t, u, r=0.001, s=4, xr=-8 / 5, a=1, b=3, c=1, d=5, I=2):
        x, y, z = u
        return [y - a * x**3 + b * x**2 - z + I, c - d * x**2 - y, r * (s * (x - xr) - z)]
    sol = solve_ivp(hr, [0, 1000], [-1.5, -10, 2], t_eval=np.linspace(0, 1000, 8000), max_step=.2)
    F = plt.figure(figsize=(7.6, 3.2))
    a1 = F.add_subplot(1, 2, 1)
    a1.plot(sol.t, sol.y[0], color=BLUE, lw=1)
    a1.set_xlabel("$t$"); a1.set_ylabel("$x$ (membrane potential)"); a1.set_title("Bursting, $r = 0.001$"); a1.set_xlim(0, 1000)
    a2 = F.add_subplot(1, 2, 2, projection="3d")
    a2.plot(sol.y[0], sol.y[1], sol.y[2], color=RED, lw=.7)
    a2.set_xlabel("$x$"); a2.set_ylabel("$y$"); a2.set_zlabel("$z$", labelpad=1)
    a2.set_zlim(1.6, 2.2); a2.view_init(22, -60)
    for ax_ in (a2.xaxis, a2.yaxis, a2.zaxis):
        ax_.set_pane_color((1, 1, 1, 0)); ax_._axinfo["grid"]["color"] = (0, 0, 0, .08)
        ax_.line.set_color(FG)
    a2.tick_params(labelsize=7, pad=0)
    a2.set_title("Trajectory in $(x, y, z)$")
    F.tight_layout(w_pad=1)
    save(F, "ch4-hr")


# ---------------------------------------------------------------- 05 networks
def draw(g, ax, pos, values=None, directed=False):
    if values is None:
        values = {n: 1 for n in g}
    vmax = max(values.values()) or 1
    for u, v in g.edges():
        (x0, y0), (x1, y1) = pos[u], pos[v]
        if directed:
            ax.annotate("", (x1, y1), (x0, y0), arrowprops=dict(arrowstyle="-|>", color=FG, lw=1, alpha=.55,
                        shrinkA=9, shrinkB=9, mutation_scale=10, connectionstyle="arc3,rad=.12"))
        else:
            ax.plot([x0, x1], [y0, y1], color=FG, lw=1, alpha=.35, zorder=1)
    for n_ in g:
        x, y = pos[n_]
        f = values[n_] / vmax
        ax.scatter([x], [y], s=210, color=BLUE, alpha=.12 + .88 * f, edgecolors=BLUE, linewidths=1, zorder=2, clip_on=False)
        ax.text(x, y, str(n_), ha="center", va="center", fontsize=7.5, zorder=3,
                color="#ffffff" if f > .55 else FG, fontweight=600)
    ax.set_aspect("equal"); ax.axis("off"); ax.margins(.14)


def graph_fig(name, g, directed=False, seed=3):
    pos = nx.circular_layout(g) if len(g) <= 4 else nx.kamada_kawai_layout(g)
    F, (a, b, c) = fig(7.6, 2.6, ncols=3, gridspec_kw=dict(width_ratios=[1.1, 1, 1]))
    draw(g, a, pos, directed=directed); a.set_title("Graph")
    deg = Counter(d for _, d in g.degree())
    ks = sorted(deg)
    b.bar(ks, [deg[k] for k in ks], width=.5, color=GREEN)
    b.set_xticks(range(0, max(ks) + 1)); b.set_xlabel("degree"); b.set_ylabel("number of nodes")
    b.yaxis.get_major_locator().set_params(integer=True)
    b.set_title("Degree distribution")
    A = nx.to_numpy_array(g, nodelist=sorted(g))
    nodes = sorted(g)
    ii, jj = np.nonzero(A)
    c.scatter(jj, ii, marker="s", s=(52 / len(nodes)) ** 2 * 3, color=RED)
    c.set_xlim(-.5, len(nodes) - .5); c.set_ylim(len(nodes) - .5, -.5)
    step = 1 if len(nodes) <= 6 else 2
    c.set_xticks(range(0, len(nodes), step), nodes[::step]); c.set_yticks(range(0, len(nodes), step), nodes[::step])
    c.tick_params(length=0); c.set_aspect("equal")
    for s in ("left", "bottom"):
        c.spines[s].set_visible(False)
    c.set_xticks(np.arange(-.5, len(nodes)), minor=True); c.set_yticks(np.arange(-.5, len(nodes)), minor=True)
    c.grid(which="minor"); c.tick_params(which="minor", length=0)
    c.set_title("Adjacency matrix")
    F.tight_layout(w_pad=2)
    save(F, name)


def ch5():
    v = list(range(1, 5))
    graph_fig("ch5-complete", nx.Graph(list(combinations(v, 2))))
    dg = nx.DiGraph(); dg.add_nodes_from(v); dg.add_edges_from([(1, 2), (2, 1), (2, 3), (4, 1), (4, 2), (4, 3)])
    graph_fig("ch5-directed", dg, directed=True)
    edges = [(n, 8) for n in range(11, 15)] + [(n, 6) for n in range(1, 6)] + [(7, 6), (8, 7), (9, 7), (10, 7)]
    g = nx.Graph(); g.add_nodes_from(range(1, 15)); g.add_edges_from(edges)
    graph_fig("ch5-tree", g)
    pos = nx.kamada_kawai_layout(g)
    F, axs = fig(7.4, 6.6, nrows=2, ncols=2)
    for ax, (title, fn) in zip(axs.flat, [("Degree", nx.degree_centrality), ("Eigenvector", nx.eigenvector_centrality),
                                          ("Closeness", nx.closeness_centrality), ("Betweenness", nx.betweenness_centrality)]):
        vals = fn(g)
        draw(g, ax, pos, vals)
        top = max(vals, key=vals.get)
        ax.set_title(f"{title} centrality — highest: node {top} ({vals[top]:.2f})", fontsize=9)
    F.tight_layout(h_pad=1.5, w_pad=1)
    save(F, "ch5-centrality")


if __name__ == "__main__":
    for f in (ch1, ch2, ch3, ch4, ch5):
        f(); print("✓", f.__name__)
