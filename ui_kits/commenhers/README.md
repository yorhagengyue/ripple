# CommenHers UI Kit

Hi-fi component kit for the CommenHers marketing / landing site.

## Files
- `demo.html` — interactive demo (open to scroll through)

## Loading dependencies

```html
<!-- Fonts. In the real Next.js app, Geist is loaded via next/font.
     For static HTML we substitute Inter (very close metrics). -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../colors_and_type.css">

<!-- Lucide icons via CDN (the real app uses lucide-react from npm) -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
```

## Font substitution note
The live site uses **Geist Sans + Geist Mono** via `next/font`. In static HTML demos we substitute **Inter + JetBrains Mono** because Geist's Google Fonts mirror can be patchy. Metrics are near-identical; when porting to the Next.js codebase swap back to Geist.

## Icons
Lucide stroke-weight **1** (lighter than default) is the house style. Icons used in demos: `arrow-right`, `leaf`, `hand-heart`, `scissors`, `check`, `briefcase-business`.

The real codebase also uses `presentation`, `handshake`, `hand-helping`, `pencil-ruler` — all available in Lucide.

## Signatures

1. **Blurred gradient-masked header** — `backdrop-blur-xl` over `rgba(255,255,255,0.75)`, with a `mask-image: linear-gradient(180deg, black 72%, transparent 100%)` fading the blur edge.
2. **Scroll-anchored green wash** — a single radial gradient under the hero, no page-wide gradient.
3. **Product-card hover** — image zooms to 1.06× over 420ms (`ease-out-expo`), card lifts 2px. Fallback for the WebGL bulge the production site uses.
4. **Blur-reveal** — `filter: blur(8px) → 0` + y-translate + opacity over 520ms. Wrapped in `@media (prefers-reduced-motion: no-preference)`.
5. **Dark stats strip** — the only dark section on the page. Accent `#86efac` (spring green) used as the numeric color, not the `#16a34a` primary.

## Tokens used
CommenHers uses the `--c-*` color prefix: `--c-bg`, `--c-fg`, `--c-muted`, `--c-muted-fg`, `--c-border`, `--c-accent`, `--c-accent-light`, `--c-accent-deep`.

## Not included
- The WebGL hover-bulge effect (~300 lines of shader). Use the CSS zoom fallback shown here.
- Pricing table and testimonials — exist in the real codebase but were out of scope for this kit.
