---
title: Math Formula Tests
description: KaTeX / LaTeX formula examples for testing rendering
---

# Math Formula Tests

Test file for KaTeX formula rendering.

## Inline Math

Euler's identity $e^{i\pi} + 1 = 0$ links five constants.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, valid when $a \neq 0$.

Greek letters $\alpha, \beta, \gamma$ and operators $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ sit inside a sentence.

Inline math in **bold $x^2$**, in a list, and in a table:

- Area of a circle: $A = \pi r^2$
- Pythagoras: $a^2 + b^2 = c^2$

| Name | Formula |
| --- | --- |
| Mass–energy | $E = mc^2$ |
| Gaussian | $\frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ |

## Display Math

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

$$\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}$$

Matrices:

$$
A = \begin{pmatrix}
  a_{11} & a_{12} & \cdots & a_{1n} \\
  a_{21} & a_{22} & \cdots & a_{2n} \\
  \vdots & \vdots & \ddots & \vdots \\
  a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$

Aligned equations:

$$
\begin{aligned}
  f(x) &= (x + 1)^2 \\
       &= x^2 + 2x + 1
\end{aligned}
$$

Piecewise function:

$$
|x| = \begin{cases}
  x  & \text{if } x \geq 0 \\
  -x & \text{otherwise}
\end{cases}
$$

## Math Code Fence

```math
\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)
```

## Not Math

These dollar signs should stay as plain text:

- It costs $5 and that one costs $10.
- Price range: $20 - $30.
- Escaped: \$x\$ stays literal.
- Code: `$x^2$` stays code.

```latex
\frac{a}{b} % fenced as latex: highlighted code, not rendered
```

## Errors

Invalid LaTeX should show an error, not break the page: $\frac{1}{$ and

$$
\begin{matrix} a & b
$$
