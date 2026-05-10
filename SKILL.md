# Toffeemoon Design System — SKILL

A portable skill definition so Claude Code (or a future Claude) can drive this design system consistently across new work.

---

## When to invoke this skill

Invoke whenever the user is working on anything under Chen Yu Fei's umbrella:
- The **Yuqin Chen portfolio** (`toffemoon-portfolio` codebase, React + Vite).
- **CommenHers** (Next.js + Tailwind marketing/commerce site).
- Any new surface that extends either brand — a slide deck, a one-pager, a print piece, social cards, etc.

Do **not** invoke for arbitrary unrelated design work.

---

## What the system covers

Two product surfaces, one steward. They share temperament (calm, quiet, deliberate) but diverge on register:

| Aspect | Yuqin portfolio | CommenHers |
|---|---|---|
| Register | Editorial, warm | Product marketing, fresh |
| Background | Cream `#f6f0e9` | White `#ffffff` |
| Text | Ink `#241c18` / muted `#6f645d` | Near-black `#0a0a0a` / graphite `#737373` |
| Accent | Caramel `#b78356` | Leaf green `#16a34a` |
| Display face | Cormorant Garamond 600 | Geist Sans 500 |
| Body face | Manrope 400 | Geist Sans 400 |
| Card radius | 32–40px (generous) | 12–24px (crisp) |
| Hero motion | Persona-5 slash + portrait tilt | Blur-reveal on scroll |

---

## Boot sequence

1. **Read `README.md`** for the full context summary — voice, tone, visual rules, caveats.
2. **Read `colors_and_type.css`** for the canonical token set. All colors, fonts, spacing, radii, shadows, easing live here.
3. If the task is Yuqin-side, open `ui_kits/yuqin/demo.html` as the reference implementation.
4. If the task is CommenHers-side, open `ui_kits/commenhers/demo.html` as the reference implementation.
5. Preview cards in `preview/` are the shortest way to eyeball the palette, type, spacing, components, and brand rules.

---

## Hard rules

### Voice
- **Yuqin speaks in first person ("I"). CommenHers never does — third-person brand voice ("Commenhers works with…").**
- **Sentence case everywhere.** Not Title Case. Not ALL CAPS (except the small 0.18em tracked eyebrow labels).
- **No emoji, no exclamation marks.** Ever.
- Claims are earned, softened by intent, not hedged apologetically. "The portfolio is intentionally quiet." Not "I hope you like it."
- Yuqin supports bilingual EN + 简体中文 1:1 on request; CommenHers is English-only.

### Color
- **One accent per product.** Caramel on Yuqin, green on CommenHers. Never mix.
- **Never pure black on pure white.** Yuqin uses ink `#241c18` on cream `#f6f0e9`; CommenHers uses near-black `#0a0a0a` on white. No `#000`.
- Secondary text is warm-muted on Yuqin (`#6f645d`), neutral-graphite on CommenHers (`#737373`).

### Type
- Yuqin: Cormorant Garamond display, Manrope body. Medium weight (500) on body; bold (700) only for emphasis.
- CommenHers: Geist Sans 500 for headings (never 700), 400 for body. Italics used sparingly for accent fragments ("becomes *a lifestyle*").
- Hero display: tracking **−0.02em**, line-height **0.96–1.02**.
- Eyebrow labels: 0.72rem, letter-spacing **0.18em**, uppercase, muted color.

### Layout
- Max content width ~1200–1280px with symmetric gutters.
- Section padding 80–96px top/bottom.
- Yuqin cards: 28–40px internal padding. CommenHers cards: 20–26px.

### Motion
- Two easing curves do all the work:
  - `cubic-bezier(0.22, 1, 0.36, 1)` — decisive / section-in / slash. Out-Expo.
  - `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — ambient reveals / hover. Out-Soft.
- Durations: 180ms micro / 320ms mid / 620ms hero.
- **Persona-5 slash transition** on Yuqin section change (see `ui_kits/yuqin/demo.html` `.slash-overlay`).
- **Blur-reveal** on CommenHers scroll (`filter: blur(8px) → 0`, respects `prefers-reduced-motion`).

### Icons
- **Yuqin uses no icons.** If you need one, use Lucide stroke-weight 1 as a last resort.
- **CommenHers uses Lucide** stroke-weight 1. In static HTML, load via CDN (`https://unpkg.com/lucide@latest`); in Next.js, use `lucide-react`.

### Imagery
- Yuqin: exactly one portrait, used once, in the hero. 4:5.15 aspect, warm daylight, 28px radius.
- CommenHers: warm natural-light product + editorial community photos. No cool tones, no pure-white seamless, no flat-lay gloss.

---

## Extension playbook

When asked for a **new surface** (a slide deck, print piece, social card, new product section):

1. Pick **one** of the two registers — never blend them in a single surface.
2. Reuse the existing tokens from `colors_and_type.css`. Do **not** introduce new colors, fonts, or radii.
3. Match the register's card/shadow/radius tier:
   - Yuqin → 32–40px radius, warm shadow, generous padding.
   - CommenHers → 12–24px radius, flat or green-tinted shadow, tighter padding.
4. Copy the motion style (slash for Yuqin chapter transitions; blur-reveal for CommenHers scroll).
5. Voice follows register — first person for Yuqin, brand voice for CommenHers.
6. If you need iconography on Yuqin, **ask** before adding; it's the most likely place to break the system.

---

## Known caveats (from README)

- The `toffemoon/toffeemoon` GitHub repo was **inaccessible at time of writing** (409). The system is built entirely from the local `YUQIN/` and `commonhers/CommenHers/` codebases. Revisit once access is granted.
- The CommenHers WebGL hover-bulge is **not** reproduced — the kit uses a CSS zoom fallback.
- `prefers-reduced-motion` is honored on CommenHers but **not yet** on Yuqin. If you ship production Yuqin work, add it.

---

## Skill invariants (do not break these)

1. Warm contrast only — never `#000` on `#fff`.
2. Medium weights as default — bold is rare.
3. One accent color per surface.
4. Sentence case.
5. No emoji in running text.
6. Two easing curves, two durations per tier.
7. Keep each register intact — don't mix Cormorant into CommenHers or Geist into Yuqin.
