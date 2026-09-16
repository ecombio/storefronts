# MOBILE.md

## Intent and scope

This document defines the mobile-first responsive methodology for this storefront, built on
two pillars: responsive breakpoints and responsive components. It governs *how* things become
responsive; `DESIGN.md` governs *what* they look like at each size. The two must never disagree —
breakpoint values here are sourced directly from `DESIGN.md`'s Responsive Behavior section, not
generic framework defaults.

## Design principles

- **Mobile-first**: the narrow viewport is the default. Every style is written unprefixed for the
  smallest screen first, then progressively enhanced upward with `min-width` queries. Never write
  desktop styles first and shrink them down.
- **Content-driven, not device-driven**: breakpoints exist because content or a component feels
  constrained at that width — not because a specific phone or tablet model needs one.
- **Fluid by default**: prefer `grid`, `flex`, `minmax`, `clamp`, and intrinsic sizing before
  reaching for a breakpoint at all. A breakpoint is the fallback, not the first tool.
- **Component-responsiveness over viewport-responsiveness**: where a component can appear in more
  than one context (a `ProductCard` in a grid vs. a drawer vs. a "you may also like" strip), use
  container queries so it responds to the space it's actually given, not just the screen.
- **Accessible at every size**: 44×44px minimum touch targets, readable text, full keyboard
  navigability — from 320px up, not just above the tablet breakpoint.

## Breakpoints — sourced from DESIGN.md

```css
@theme {
  --breakpoint-xs: 30rem;   /* 480px  — small phone ceiling */
  --breakpoint-sm: 40rem;   /* 640px  — phone ceiling */
  --breakpoint-md: 45.875rem; /* 734px — tablet portrait */
  --breakpoint-lg: 52.0625rem; /* 833px — tablet landscape / nav expand */
  --breakpoint-xl: 66.75rem;  /* 1068px — small desktop */
  --breakpoint-2xl: 90rem;    /* 1440px — content lock */
}
```

These map 1:1 to `DESIGN.md`'s own breakpoint table, so `sm:`/`md:`/`lg:` etc. in component code
land on the exact same thresholds where the spec says the global nav collapses, tiles go
single-column, and utility grids change column count.

### Behavior at each threshold (from DESIGN.md)

| Breakpoint | Width | What changes |
|---|---|---|
| Base | ≤480px | Single-column tiles, sub-nav to category name + CTA only, hero type drops to 28px |
| `xs` | 480–640px | Product renders scale to 80% of tile width, hero h1 to 34px |
| `sm` | 640–734px | Tighter tile padding (48px vertical vs 80px), fine-print wraps |
| `md` | 734–833px | Global nav collapses to hamburger, sub-nav hides category chips |
| `lg` | 833–1068px | Global nav re-expands fully, 3-col grids become 2-col |
| `xl` | 1068–1440px | Product tiles at 2/3 width with gutters, hero h1 stays 40px |
| `2xl` | ≥1440px | Content locks at 1440px, margins absorb extra width |

## Responsive components

### Container queries

Used for any component that appears in more than one context — product cards, in particular,
since they show up in grids, drawers, and recommendation strips at different widths.

```css
.product-card-wrap {
  container-type: inline-size;
}

.product-card {
  display: grid;
  gap: var(--spacing-sm);
  grid-template-columns: 1fr;
}

@container (min-width: 26rem) {
  .product-card {
    grid-template-columns: 9rem minmax(0, 1fr);
    align-items: start;
  }
}
```

### Fluid grids

Utility/collection grids use `auto-fill`/`minmax` so they flex naturally between the named
breakpoints, then snap to exact column counts at the thresholds that matter for merchandising:

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr));
  gap: var(--spacing-md);
}

@media (min-width: 52.0625rem) { /* lg / 833px */
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 90rem) { /* 2xl / 1440px */
  .product-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
```

### Header collapse

Directly implements `DESIGN.md`'s `global-nav` + `sub-nav-frosted` collapsing strategy:

```css
.site-header__desktop-nav { display: none; }
.site-header__mobile-actions { display: flex; }

@media (min-width: 52.0625rem) { /* lg / 833px, per DESIGN.md */
  .site-header__desktop-nav { display: flex; }
  .site-header__mobile-actions { display: none; }
}
```

## Mobile browser & PWA considerations

```css
.app-shell {
  min-height: 100dvh;
}

.mobile-bottom-bar {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
}
```

Use `dvh` over `vh` for any full-height shell, and always pad fixed bottom elements (cart bar,
sticky CTA) for `safe-area-inset-bottom` so they clear the home indicator on notched devices.

## Testing strategy

Test at 320, 390, 430, 480, 640, 734, 833, 1068, 1280, 1440, and 1600px — the DESIGN.md thresholds
plus a few in-between checkpoints, not just the breakpoint edges themselves.

## Relationship to DESIGN.md

- `DESIGN.md` = visual language (color, type, spacing, component appearance).
- `MOBILE.md` = responsive mechanics (breakpoints, layout strategy, container queries).
- If they ever disagree on a breakpoint number, `DESIGN.md` wins — update this file to match, not
  the other way around.
