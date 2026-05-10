# Yuqin Portfolio UI Kit

Hi-fi component kit for Yuqin Chen's personal portfolio site.

## Files
- `demo.html` — interactive demo (open to scroll through)

## Loading the tokens

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../colors_and_type.css">
```

## Signatures

1. **Layered warm background** — cream page + two fixed radial glow orbs + a 28px dot pattern masked at the bottom.
2. **Editorial cards** — 32px radius, soft top-right radial highlight, 1px tan border, warm shadow.
3. **Persona-5 slash transition** — 620ms caramel bar sweep + sub-5% flash when the user clicks a nav anchor. Scroll happens at 220ms offset so the slash lands mid-transition.
4. **Pointer-tracked portrait tilt** — bounded to ±12°/18°, 90ms linear response.
5. **Reveal** — `[data-reveal]` fades up 22px over 620ms via IntersectionObserver at 0.16 threshold.

## Tokens used

All tokens are defined in `colors_and_type.css`. Yuqin uses the `--y-*` color prefix: `--y-bg` (cream), `--y-fg` (ink), `--y-fg-muted` (quiet brown), `--y-accent` (caramel), `--y-accent-strong` (roasted).

## Not included
- `prefers-reduced-motion` handling (portfolio codebase doesn't implement it yet — flag for future pass).
- Full writing / long-form article template — flag as TODO.
