# Toffeemoon Design System

A design system for **Chen Yu Fei** (陈雨飞 / preferred name "Yuqin"), covering two connected product surfaces:

| Product | What it is | Source |
|---|---|---|
| **Yuqin Chen Portfolio** (`toffemoon-portfolio`) | Personal editorial portfolio site for a Singapore Management University communication-management student. Calm, warm, editorial. | Local codebase `YUQIN/` (React + Vite) |
| **CommenHers** | Marketing/landing site for a slow-fashion / textile-upcycling brand. Fresh green, crisp white, sans-serif. | Local codebase `commonhers/CommenHers/` (Next.js + Tailwind + Motion One) |

> A third folder, `commonhers/commonhers-web/`, is a barely-started Next.js scaffold and contributes no additional design context. The GitHub repo `toffemoon/toffeemoon` was **inaccessible** at time of writing (409); treat it as a future source once the install is granted.

## Index

- `colors_and_type.css` — all color + type tokens (both products + shared primitives)
- `assets/` — logos, product photography, profile photo, resume PDF
- `preview/` — Design System review cards (colors, type, spacing, components, brand)
- `ui_kits/yuqin/` — hi-fi component kit + interactive demo for the Yuqin portfolio
- `ui_kits/commenhers/` — hi-fi component kit + interactive demo for CommenHers
- `SKILL.md` — portable skill definition for Claude Code

## Two systems, one temperament

Both products belong to the same person and share a **calm, quiet, deliberate** tone — but they diverge on register:

- **Yuqin** is **editorial**: warm cream, Cormorant Garamond display over Manrope body, caramel accent, 40px rounded editorial panels, scroll-snap sections with a Persona-5-style "slash" transition between them.
- **CommenHers** is **product marketing**: bone white, Geist Sans medium weight, fresh leaf-green accent, tight 12–32px rounding, motion-driven reveals, WebGL "bulge" hover on product cards.

## CONTENT FUNDAMENTALS

### Voice
- **First person ("I")** on Yuqin — the site *is* Yuqin. ("I am interested in the space where strategy, storytelling, and presentation meet.")
- **Third person / brand voice** on CommenHers. ("Commenhers was founded to make slow fashion more accessible.")
- Bilingual support on Yuqin: EN + 简体中文 (matched 1:1, not machine-translated; retains English loanwords like "campaign" in Chinese copy).

### Tone
- **Quiet, structured, warm.** Yuqin's copy explicitly frames itself this way: "careful, curious, and structured without being cold." That's the master rule.
- No exclamation marks. No "Let's go!" energy. No emoji.
- Adjectives are earned, not sprinkled: "calm," "legible," "thoughtful," "observational."
- Claims are softened with intent ("The portfolio is intentionally quiet"), not hedged apologetically.

### Casing
- **Sentence case** for everything: H1s, CTAs, buttons, nav. Not Title Case, not ALL CAPS. (Exception: the small all-caps eyebrows with 0.18em letter-spacing.)
- Product names keep natural casing — "CommenHers" (capital C, capital H), "Yuqin," "Yufei Chen" for formal docs.

### Specific examples (lifted verbatim)
- Hero: *"Hi, I'm Yuqin."* / *"你好，我是雨钦。"*
- Kicker pill: *"Seeking internship opportunities"*
- Section description: *"The cards below are structured as editable placeholders for stronger case studies later, while still giving recruiters a clear view of range and intent."*
- CommenHers hero: *"Where upcycling becomes a lifestyle for all"*
- CommenHers CTA: *"Request Demo"* / *"Discuss project"* / *"Plan workshop"* — verb + object, two words preferred.

### Usage of "you" vs "I"
- Yuqin uses **"I"** throughout when speaking as the person, and **"you"** when speaking *to* the recruiter ("You can reach me directly by email").
- CommenHers never uses "I"; uses **"we/our"** sparingly and prefers the **brand name in third person** ("Commenhers works with local makers…"). Address to the reader ("you") shows up only on CTAs.

### No emoji, no icon-in-copy
- Neither product uses emoji or unicode decoration in running text.
- CommenHers uses Lucide icons inside components (feature cards, testimonials, pricing). Yuqin uses no icons at all — text + rules + tiny geometric glyphs are the whole UI.

---

## VISUAL FOUNDATIONS

### Color
**Yuqin** — a narrow, warm palette. Page cream `#f6f0e9` → text ink `#241c18` → caramel accent `#b78356`. Soft caramel `#ead4bc` is used for glazing/radials. Muted brown `#6f645d` handles all secondary text. Contrast is intentionally soft (never pure black on pure white).

**CommenHers** — tight neutrals with a punchy green. Background `#ffffff`, text `#0a0a0a`, border `#e5e5e5`, muted surface `#f5f5f5`, muted text `#737373`. Single accent `#16a34a` (green-600) with a pale companion `#86efac` (green-300). Dark green `#14532d` appears only as image overlay at 20% opacity.

### Type
- **Yuqin**: Cormorant Garamond 500/600/700 for display + H1–H3, Manrope 400/500/600/700/800 for UI. Display sizes use `clamp(4.2rem, 5.8vw, 6.4rem)` and `letter-spacing: -0.02em`; line-height crunched to `0.96` on the hero.
- **CommenHers**: Geist Sans + Geist Mono (loaded via `next/font`). Headings are `font-medium` (500), not bold — keeps the editorial calm. Tight tracking, never expanded.
- Both systems use **uppercase eyebrow labels** with `0.18em` letter-spacing as the one ornamental type treatment.

### Spacing
Yuqin uses generous 40px panel padding, 24px/32px grid gaps, and section padding of 96px top/bottom. CommenHers uses 16/24/32/64 Tailwind stops and section padding of 80–112px. The 4/8/12/16/24/32/48/64/96 scale covers both.

### Backgrounds
- Yuqin: **layered radial gradients + a subtle dot pattern** (`background-image: radial-gradient(rgba(36,28,24,0.12) 1px, transparent 1px); background-size: 28px 28px;` masked with `linear-gradient(180deg, rgba(0,0,0,0.72), transparent 92%)`). Plus two fixed blurred "glow" orbs at the corners.
- CommenHers: **white**, with scroll-anchored radial green wash fading under the hero, and a subtle green-to-transparent gradient rising from the footer.
- No repeating patterns, no hand-drawn illustrations, no stock gradients on either.

### Animation ("more smooth like Persona 5")
- **Section entry**: 620ms panel wipe-in with `cubic-bezier(0.22, 1, 0.36, 1)` + a diagonal slash sweep (clip-path polygon rotated -10deg) that fires as sections become active. This is already in the Yuqin codebase and is the reference for the "Persona 5 transition" the user asked for.
- **Hero tilt**: subtle 3D rotate on pointer-move (`rotateX`/`rotateY` bounded to ±12°/18°, 90ms linear response). 
- **Reveal**: `[data-reveal]` nodes fade up 22px over 620ms; triggered by IntersectionObserver at 0.16 threshold.
- **Motion One (CommenHers)**: blur-in (`filter: blur(8px) → 0`) combined with y+opacity, 400–600ms, `ease [0.25, 0.46, 0.45, 0.94]`.
- `prefers-reduced-motion` respected on CommenHers (all durations collapse to 0.01ms). Yuqin doesn't respect this yet — flagged for future.

### Hover / press states
- **Buttons**: lift 1px (`translateY(-1px)`), bg shifts to `#fff5eb` (Yuqin) or `bg-foreground/70` (CommenHers). Pressed state is implicit (no dedicated shrink).
- **Nav links**: an underline draws in via `transform: scaleX(0 → 1)` from center; tinted bg pill fades in under hover (`rgba(255, 250, 244, 0.76)`).
- **Cards**: border darkens one step; shadow deepens one level; `data-interactive` cards add a pointer-tracked 3D tilt bounded to ±8°.
- **Product showcase (CommenHers)**: WebGL shader bulges the image around the cursor (Safari fallback: 1.1× scale + overlay fade).

### Borders
- Yuqin: `1px solid rgba(36, 28, 24, 0.08)` everywhere, `rgba(36, 28, 24, 0.18)` on hover. Never solid black.
- CommenHers: `1px solid #e5e5e5` default, `border-foreground/10` (~10% black) for subtler dividers.

### Shadows
Yuqin uses two soft tiers:
- `--shadow-sm: 0 16px 36px rgba(61, 43, 30, 0.06)` — resting cards
- `--shadow-lg: 0 24px 60px rgba(61, 43, 30, 0.08)` — hero panel and active section

CommenHers pairs a flat base shadow with a tinted green glow:
- `0 10px 32px rgba(0,0,0,0.08), 0 8px 22px rgba(22,163,74,0.14)` on the hero snapshot card.

All shadows are warm (brown-tinted on Yuqin, green-tinted on CommenHers) — never neutral gray.

### Transparency & blur
- Yuqin's header and chapter guide use `backdrop-filter: blur(14–18px)` over translucent cream (`rgba(246, 240, 233, 0.78)`).
- CommenHers header uses `backdrop-blur-xl` over `bg-background/75`, plus a **gradient mask** fading the blurred band from full to transparent over 32 CSS units.
- Blur is reserved for fixed/sticky chrome. Content never blurs.

### Corner radii
- Yuqin: **32px** (cards), **40–42px** (section panels / hero stage), **999px** (pills, buttons).
- CommenHers: **12px** (image cells), **16–24px** (cards), **32px** (hero snapshot), **999px** (buttons, pills).

### Cards
- **Editorial (Yuqin)**: radial highlight at top-right + linear cream fade + 1px tan border + soft shadow + backdrop-blur. Padded 22–40px. Slight inner rule at 24px from top for editorial hierarchy.
- **Product (CommenHers)**: crisp white on `bg-muted/40`, 1px `border-foreground/10`, 24–32px rounded, 24–32px padding, no shadow on the base tier; shadow + gradient ring appear only on the "Featured" pricing tier.

### Imagery
- **Yuqin**: a single warm portrait (soft daylight, muted tones, tight crop, 4:5.15 aspect). That's it.
- **CommenHers**: warm, natural-light product photography on neutral/fabric backgrounds; editorial community photos (runway, makers at work). No cool tones, no heavy grain, no black-and-white.

### Layout rules
- Both products use a **max content width** (~1280px) with symmetric gutters.
- Yuqin supports optional scroll-snap on sections ≥981px wide (`scroll-snap-type: y proximity`).
- CommenHers uses a sticky/hiding header that retracts on scroll-down and returns on scroll-up.
- Both have a **fixed sidebar chapter guide** (Yuqin) / a **skip-to-content** link (CommenHers) as their single fixed nav aid beyond the header.

---

## ICONOGRAPHY

- **Yuqin uses no icons.** Everything is text, rules, pills, and a single 12×12 rotated-square marker in the chapter guide. If iconography is ever added, start with the same Lucide stroke set CommenHers uses at stroke-width 1 to stay unobtrusive.
- **CommenHers uses [Lucide React](https://lucide.dev)** (`lucide-react` package). Stroke-weight **1** is the house style (lighter than the default 2). Icons seen in the codebase include:
  - Navigation & flow: `ArrowRight`, `ArrowDown`, `Check`
  - Pricing tier glyphs: `BriefcaseBusiness`, `Presentation`, `Handshake`
  - Commitment pillars: `Leaf`, `HandHeart`, `HandHelping`, `Scissors`, `PencilRuler`
  - Social: `Facebook`, `Twitter`, `Linkedin`
- The system links Lucide **via CDN** in demos (`https://unpkg.com/lucide@latest`) — documented in `ui_kits/commenhers/README.md`. This is a CDN substitute for the NPM package used in the real codebase; they're the same icons.
- Logos: `assets/commenhers-logo.svg` + `assets/commenhers-logo-text.svg` (official). No dedicated Yuqin logo — the wordmark is set in Cormorant Garamond 600 at 1.75rem.
- No emoji, no unicode decoration in UI.

---

## CAVEATS

- **`toffemoon/toffeemoon` GitHub repo was not reachable** (409 from the tree endpoint). The design system is built purely from the local `YUQIN/` codebase, which is clearly the portfolio source. If that repo contains a different brand/product, this system needs a pass once access is granted.
- **Fonts** are loaded from Google Fonts (Cormorant Garamond + Manrope) and from `next/font` (Geist, Geist Mono) in the real apps. No local TTF/WOFF files are required; substitutions are only if you go fully offline.
- **Persona-5 transition**: the existing Yuqin "slash sweep" is the closest thing to a Persona-5 page-change effect already in the codebase. The kit demos reproduce it and add a stronger "flash + shear" variant on section change that you can tune via Tweaks — flagged as the area most likely to need iteration.
- The CommenHers WebGL bulge effect is **not** reproduced in the UI kit — it would pull in ~300 lines of shader code. The kit uses the Safari-fallback (CSS zoom + overlay) instead. Flagged for iteration if needed.
