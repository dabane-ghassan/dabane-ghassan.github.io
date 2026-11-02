---
title: Neural networks
summary: The mathematical toolkit for network models — matrix operations with NumPy and SymPy, then graphs, degree distributions and centrality with NetworkX.
---

In this last chapter we look at the mathematical tools used to model and understand biological neural networks. A network of $N$ neurons is, mathematically, a matrix of connections, so we first practise **operations on matrices** with NumPy and SymPy, then meet the fundamental ideas of **graph theory**, the starting point of network modelling, with the NetworkX package.

```python
import numpy as np
import sympy as sp
import networkx as nx
import matplotlib.pyplot as plt
from itertools import combinations
from collections import Counter
```

## Matrices

### Addition and subtraction

Take

$$A = \begin{bmatrix} 2 & 5 & 7 \\ 4 & 8 & 3 \\ 9 & 1 & 4 \end{bmatrix} \quad\text{and}\quad B = \begin{bmatrix} 1 & 5 & 3 \\ 3 & 6 & 1 \\ 7 & 5 & 9 \end{bmatrix}.$$

With NumPy, we create the arrays and reshape them to 3 × 3:

```python
A = np.array([2, 5, 7, 4, 8, 3, 9, 1, 4]).reshape(3, 3)
B = np.array([1, 5, 3, 3, 6, 1, 7, 5, 9]).reshape(3, 3)
print("A + B\n", A + B, "\nA - B\n", A - B)
```

```output
A + B
 [[ 3 10 10]
 [ 7 14  4]
 [16  6 13]] 
A - B
 [[ 1  0  4]
 [ 1  2  2]
 [ 2 -4 -5]]
```

Or with SymPy, whose matrices are exact and print like mathematics:

```python
A = sp.Matrix(3, 3, [2, 5, 7, 4, 8, 3, 9, 1, 4])   # rows, columns, entries
B = sp.Matrix(3, 3, [1, 5, 3, 3, 6, 1, 7, 5, 9])
A + B
```

```output
Matrix([
[ 3, 10, 10],
[ 7, 14,  4],
[16,  6, 13]])
```

### Multiplication

The dot product of a row and a column vector,

$$A = \begin{bmatrix} 2 & 3 & 4 \end{bmatrix} \quad\text{and}\quad B = \begin{bmatrix} 4 \\ 1 \\ 5 \end{bmatrix},$$

uses `@` (or `np.dot`) in NumPy and `*` in SymPy:

```python
A = np.array([[2, 3, 4]])          # 1 × 3
B = np.array([[4], [1], [5]])      # 3 × 1
print(A @ B)
print(sp.Matrix(1, 3, [2, 3, 4]) * sp.Matrix(3, 1, [4, 1, 5]))
```

```output
[[31]]
Matrix([[31]])
```

Matrix multiplication is not commutative. With

$$A = \begin{bmatrix} 2 & 8 \\ 5 & -6 \end{bmatrix} \quad\text{and}\quad B = \begin{bmatrix} 7 & -4 \\ 3 & 12 \end{bmatrix},$$

```python
A = sp.Matrix(2, 2, [2, 8, 5, -6])
B = sp.Matrix(2, 2, [7, -4, 3, 12])
A * B, B * A
```

```output
(Matrix([
[38,  88],
[17, -92]]), Matrix([
[-6,  80],
[66, -48]]))
```

$AB \neq BA$: the order of operations matters, as it does when signals pass through successive layers of a network.

### Solving a matrix equation

Suppose

$$2 \begin{bmatrix} x+2 & y+3 \\ 3 & 0 \end{bmatrix} = \begin{bmatrix} 3 & 6 \\ y & z \end{bmatrix}^\top.$$

By hand:

$$\begin{bmatrix} 2x+4 & 2y+6 \\ 6 & 0 \end{bmatrix} = \begin{bmatrix} 3 & y \\ 6 & z \end{bmatrix} \;\Rightarrow\; z = 0,\; y = -6,\; x = -\tfrac{1}{2}.$$

SymPy does the same work symbolically:

```python
x, y, z = sp.symbols('x y z')
lhs = 2 * sp.Matrix([[x + 2, y + 3], [3, 0]])
rhs = sp.Matrix([[3, 6], [y, z]]).T
sp.solve(sp.Eq(lhs, rhs))
```

```output
{x: -1/2, y: -6, z: 0}
```

### Identity and transpose

The identity matrix $I$ leaves any matrix unchanged, $AI = A$:

```python
A = sp.Matrix(3, 3, [2, 5, 7, 4, 8, 3, 9, 1, 4])
A * sp.eye(3) == A
```

```output
True
```

An important property of the transpose is $(AB)^\top = B^\top A^\top$. Let’s check it with

$$A = \begin{bmatrix} 3 & 2 & 3 \\ 2 & 2 & 1 \\ 2 & 3 & 1 \end{bmatrix} \quad\text{and}\quad B = \begin{bmatrix} 2 & -2 \\ -3 & 4 \\ 1 & 1 \end{bmatrix}.$$

```python
A = sp.Matrix(3, 3, [3, 2, 3, 2, 2, 1, 2, 3, 1])
B = sp.Matrix(3, 2, [2, -2, -3, 4, 1, 1])
print((A * B).T)
print((A * B).T == B.T * A.T)
```

```output
Matrix([[3, -1, -4], [5, 5, 9]])
True
```

In NumPy, `.T` gives the transpose:

```python
A_np = np.array(A, dtype=float)
B_np = np.array(B, dtype=float)
np.array_equal((A_np @ B_np).T, B_np.T @ A_np.T)
```

```output
True
```

### Determinant

For

$$M = \begin{bmatrix} 2 & 3 \\ 4 & -2 \end{bmatrix}, \qquad \det M = 2 \cdot (-2) - 3 \cdot 4 = -16.$$

```python
M = np.array([[2, 3], [4, -2]])
print(sp.Matrix(M).det(), np.linalg.det(M))
```

```output
-16 -15.999999999999998
```

SymPy computes exactly; NumPy computes in floating point (through an LU decomposition), hence the tiny error. Keep this in mind when comparing NumPy results: use `np.isclose` or `np.allclose` rather than `==`.

For a 3 × 3 matrix we expand along the first row, alternating signs:

$$M = \begin{bmatrix} 2 & -2 & 4 \\ 1 & -3 & 2 \\ -2 & 5 & 1 \end{bmatrix}$$

$$\det M = 2 \begin{vmatrix} -3 & 2 \\ 5 & 1 \end{vmatrix} - (-2) \begin{vmatrix} 1 & 2 \\ -2 & 1 \end{vmatrix} + 4 \begin{vmatrix} 1 & -3 \\ -2 & 5 \end{vmatrix} = 2(-13) + 2(5) + 4(-1) = -20.$$

```python
M = sp.Matrix(3, 3, [2, -2, 4, 1, -3, 2, -2, 5, 1])
M.det()
```

```output
-20
```

### Inverse

The inverse satisfies $AA^{-1} = A^{-1}A = I$. With

$$A = \begin{bmatrix} 1 & 1 & 1 \\ 1 & -1 & -1 \\ 1 & 1 & -1 \end{bmatrix}:$$

```python
A = sp.Matrix(3, 3, [1, 1, 1, 1, -1, -1, 1, 1, -1])
A_inv = A.inv()
print(A_inv)
print(A * A_inv == A_inv * A == sp.eye(3))
```

```output
Matrix([[1/2, 1/2, 0], [0, -1/2, 1/2], [1/2, 0, -1/2]])
True
```

```python
A_np = np.array(A, dtype=float)
A_inv_np = np.linalg.inv(A_np)
np.allclose(A_np @ A_inv_np, np.eye(3)) and np.allclose(A_inv_np @ A_np, np.eye(3))
```

```output
True
```

### Solving a linear system

The system

$$\begin{cases} x + y + z = 8 \\ x - y - z = -4 \\ x + y - z = 6 \end{cases}$$

is $A\mathbf{x} = \mathbf{b}$ with the matrix $A$ above. `np.linalg.solve` finds $\mathbf{x}$:

```python
b = np.array([8, -4, 6])
solution = np.linalg.solve(A_np, b)
print(solution, np.allclose(A_np @ solution, b))
```

```output
[2. 5. 1.] True
```

So $x = 2$, $y = 5$, $z = 1$.

### Eigenvalues and eigenvectors

An eigenvector $\mathbf{v}$ of a matrix is only scaled by it, $B\mathbf{v} = \lambda \mathbf{v}$. Eigenvalues are how we judged the stability of equilibria in [chapter 4](04-neuronal-models.md), and in a network they tell whether activity grows or dies out. For

$$B = \begin{bmatrix} 2 & 16 & 8 \\ 4 & 14 & 8 \\ -8 & -32 & -18 \end{bmatrix}:$$

```python
B = np.array([[2, 16, 8], [4, 14, 8], [-8, -32, -18]])
eig_vals, eig_vects = np.linalg.eig(B)
print(eig_vals.real.round(6))   # tiny imaginary parts are rounding noise
print(sp.Matrix(B).eigenvals())   # {eigenvalue: multiplicity}
```

```output
[ 2. -2. -2.]
{2: 1, -2: 2}
```

The eigenvalue −2 is repeated: it has a two-dimensional space of eigenvectors, so NumPy’s two eigenvectors for it are one arbitrary choice of basis.

## Introduction to graph theory

A **graph** is a set of nodes (vertices) joined by edges. For a network of neurons, nodes are cells and edges are synapses. A graph is fully described by its **adjacency matrix** $A$, with $A_{ij} = 1$ if node $i$ connects to node $j$. The **degree** of a node is its number of connections.

### Creating and describing graphs

This function builds a NetworkX graph, undirected or directed, and draws it with its degree distribution and adjacency matrix.

```python
def graph(nodes, edges, directed=False):
    """Build a graph, plot it with its degree distribution and adjacency matrix,
    and return the graph and its adjacency matrix."""
    g = nx.DiGraph() if directed else nx.Graph()
    g.add_nodes_from(nodes)
    g.add_edges_from(edges)
    A = nx.to_numpy_array(g, nodelist=nodes)

    degrees = Counter(d for _, d in g.degree())
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15, 5))
    nx.draw(g, ax=ax1, with_labels=True)
    ax2.bar(list(degrees), list(degrees.values()), width=0.4)
    ax2.set_xlabel('degree'); ax2.set_ylabel('number of nodes')
    ax3.spy(A, marker='s')
    ax3.set_xticks(range(len(nodes)), nodes); ax3.set_yticks(range(len(nodes)), nodes)
    return g, A
```

A graph of 4 nodes where each node connects to the other three, a **complete graph**. `combinations` generates every pair:

```python
vertices = [1, 2, 3, 4]
g1, a1 = graph(vertices, list(combinations(vertices, 2)))
print(a1)
```

```output
[[0. 1. 1. 1.]
 [1. 0. 1. 1.]
 [1. 1. 0. 1.]
 [1. 1. 1. 0.]]
```

<figure class="fig wide" data-svg="fig/ch5-complete.svg"><figcaption>Every node has degree 3, and the adjacency matrix is full except for its diagonal: no node connects to itself.</figcaption></figure>

Synapses have a direction, so networks of neurons are usually **directed** graphs. Here the adjacency matrix is no longer symmetric:

```python
g2, a2 = graph(vertices, [(1, 2), (2, 1), (2, 3), (4, 1), (4, 2), (4, 3)], directed=True)
print(a2)
```

```output
[[0. 1. 0. 0.]
 [1. 0. 1. 0.]
 [0. 0. 0. 0.]
 [1. 1. 1. 0.]]
```

<figure class="fig wide" data-svg="fig/ch5-directed.svg"><figcaption>Row $i$ lists where node $i$ projects. Node 4 only sends, node 3 only receives, and nodes 1 and 2 are reciprocally connected. In a directed graph, the degree counts incoming plus outgoing edges.</figcaption></figure>

### Centrality

**Centrality** measures say which nodes matter most in a graph, each by a different definition:

- **degree** centrality: how many neighbours a node has (as a fraction of the $N - 1$ possible),
- **eigenvector** centrality: how well connected a node’s neighbours are themselves — the leading eigenvector of the adjacency matrix,
- **closeness** centrality: how short, on average, the paths from the node to every other node are,
- **betweenness** centrality: how often the node lies on the shortest path between two other nodes.

Let’s build a small tree-like graph of 14 nodes with three hubs, 6, 7 and 8:

```python
nodes = list(range(1, 15))
edges = [(n, 8) for n in range(11, 15)] + [(n, 6) for n in range(1, 6)] + [(7, 6), (8, 7), (9, 7), (10, 7)]
g3, a3 = graph(nodes, edges)
```

<figure class="fig wide" data-svg="fig/ch5-tree.svg"><figcaption>Eleven leaves of degree 1 and three hubs, connected in a chain 6–7–8.</figcaption></figure>

```python
measures = {'degree': nx.degree_centrality, 'eigenvector': nx.eigenvector_centrality,
            'closeness': nx.closeness_centrality, 'betweenness': nx.betweenness_centrality}
for name, measure in measures.items():
    c = measure(g3)
    print(f"{name:12}", {n: round(c[n], 2) for n in (6, 7, 8)})
```

```output
degree       {6: 0.46, 7: 0.31, 8: 0.38}
eigenvector  {6: 0.54, 7: 0.47, 8: 0.38}
closeness    {6: 0.54, 7: 0.59, 8: 0.5}
betweenness  {6: 0.64, 7: 0.68, 8: 0.54}
```

<details class="fold"><summary>Plotting code</summary>

```python
def centrality(graph, values, title):
    pos = nx.spring_layout(graph, seed=1)
    nodes = nx.draw_networkx_nodes(graph, pos, node_color=list(values.values()),
                                   nodelist=list(values), cmap=plt.cm.Blues, node_size=300)
    nx.draw_networkx_labels(graph, pos)
    nx.draw_networkx_edges(graph, pos)
    plt.colorbar(nodes); plt.title(title); plt.axis('off')

for name, measure in measures.items():
    plt.figure()
    centrality(g3, measure(g3), f'{name} centrality')
```

</details>

<figure class="fig wide" data-svg="fig/ch5-centrality.svg"><figcaption>Darker nodes are more central. Node 6 has the most neighbours, but node 7, in the middle of the chain, is the closest to everyone and lies on the most shortest paths.</figcaption></figure>

The measures disagree, and that is the point: “important” depends on the question. A neuron with many synapses (degree) is not necessarily the one whose silencing would most disrupt communication (betweenness).
