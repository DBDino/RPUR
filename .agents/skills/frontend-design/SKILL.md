## Overview

Universitas Padjadjaran's dashboard reads as an **academic, clean, and warm** institutional brand. The base canvas is **soft gray** (`{colors.canvas}` — #f5f5f5) holding white cards (`{colors.surface-card}` — #ffffff) and dark gray ink (`{colors.ink}` — #333333) for body and display alike. The single brand color is **Unpad Yellow** (`{colors.primary}` — #f9b129), used on the topbar, page title header, active sidebar item, and footer. Text on yellow is always `{colors.ink}`, never white.

Typography follows the font declared in `layout.tsx` (see Typography). Data visualizations use the **chart series palette** (yellow to orange to gold). Red (`{colors.danger}`) is reserved for the "Rejected" status.

**Key Characteristics:**

- Soft gray canvas, white cards, 1px border hairlines (#ebecf2).
- Single brand color: `{colors.primary}` (Unpad Yellow #f9b129).
- Text on yellow surfaces is always `{colors.ink}`; white on #f9b129 has insufficient contrast.
- Four warm chart series; red only for rejection/error states.
- Two logo variants: navbar (duo) and footer.

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}` — #f9b129): Topbar, page title header, active sidebar item, footer. Used scarcely on content surfaces.
- **Primary Accent** (`{colors.primary-accent}` — #f9b000): Darker yellow for active borders, rings, and focus outlines.
- **Primary Subtle** (`{colors.primary-subtle}` — #fff6e5): Very light yellow for filter badges and item hover.
- **On Primary** (`{colors.on-primary}` — #333333): Text placed on `{colors.primary}`. Matches `{colors.ink}`.

### Surface

- **Canvas** (`{colors.canvas}` — #f5f5f5): Soft gray dashboard page background.
- **Canvas Soft** (`{colors.canvas-soft}` — #f5f5f5): Inner panel background inside cards.
- **Surface Card** (`{colors.surface-card}` — #ffffff): Cards and panels.
- **Surface Strong** (`{colors.surface-strong}` — #fff6e5): Badges and tag pills (matches `{colors.primary-subtle}`).

### Hairlines

- **Hairline** (`{colors.hairline}` — #ebecf2): 1px dividers, card and table borders.
- **Hairline Soft** (`{colors.hairline-soft}` — #ebecf2): Lighter divider, same as `{colors.hairline}`.
- **Hairline Strong** (`{colors.hairline-strong}` — #cfcdc4): Stronger panel outline. Unchanged from previous version; confirm against web.

### Text

- **Ink** (`{colors.ink}` — #333333): Display, headings, body emphasis, and text on yellow.
- **Body** (`{colors.body}` — #666666): Default running text.
- **Body Strong** (`{colors.body-strong}` — #333333): Same as ink.
- **Muted** (`{colors.muted}` — #666666): Labels, subtitles, captions.
- **Muted Soft** (`{colors.muted-soft}` — #a09c92): Disabled text. Unchanged; confirm against web.

### Chart Series

Defined in code as `SERIES` and `DANGER`. Use in this order.

- **Series 1** (`{colors.series-1}` — #e3c744): Chart yellow.
- **Series 2** (`{colors.series-2}` — #efe08f): Light chart yellow.
- **Series 3** (`{colors.series-3}` — #ec8f63): Chart orange.
- **Series 4** (`{colors.series-4}` — #bfa73c): Chart gold.

### Semantic

- **Success** (`{colors.semantic-success}` — #1f8a65): Confirmation indicators. Unchanged; not provided in web code, confirm.
- **Danger** (`{colors.danger}` — #d64045): "Rejected" status and validation errors.

## Typography

### Font Family

Use the font loaded in `layout.tsx` (for example, via `next/font`). Until confirmed, the fallback is `system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif`. Code surfaces use `ui-monospace, monospace`.

### Hierarchy

| Token                            | Size | Weight | Line Height | Letter Spacing | Use                           |
| -------------------------------- | ---- | ------ | ----------- | -------------- | ----------------------------- |
| `{typography.display-mega}`      | 72px | 400    | 1.1         | -2.16px        | Not used in dashboard         |
| `{typography.display-lg}`        | 36px | 400    | 1.2         | -0.72px        | Page title                    |
| `{typography.display-md}`        | 26px | 400    | 1.25        | -0.325px       | Page title header             |
| `{typography.display-sm}`        | 22px | 400    | 1.3         | -0.11px        | Card group titles             |
| `{typography.title-md}`          | 18px | 600    | 1.4         | 0              | Card and component titles     |
| `{typography.title-sm}`          | 16px | 600    | 1.4         | 0              | List labels, table headers    |
| `{typography.body-md}`           | 16px | 400    | 1.5         | 0              | Default body                  |
| `{typography.body-tracked}`      | 16px | 400    | 1.5         | 0.08px         | Not used in dashboard         |
| `{typography.body-sm}`           | 14px | 400    | 1.5         | 0              | Tables, footer body           |
| `{typography.caption}`           | 13px | 400    | 1.4         | 0              | Chart labels, descriptions    |
| `{typography.caption-uppercase}` | 11px | 600    | 1.4         | 0.88px         | Section labels, filter badges |
| `{typography.code}`              | 13px | 400    | 1.5         | 0              | Code blocks, if any           |
| `{typography.button}`            | 14px | 500    | 1.0         | 0              | Button labels                 |
| `{typography.nav-link}`          | 14px | 500    | 1.4         | 0              | Sidebar and topbar menu       |

### Principles

- **Use the weights from the web code.** The values above are placeholders; confirm against `globals.css` or the component classes.
- **Keep letter-spacing at 0** unless the web code uses tracking.

### Note on Font

Confirm the font family in `layout.tsx`. No substitute is needed if the font is already loaded.

## Layout

### Spacing System

- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.base}` 16px · `{spacing.md}` 20px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section padding:** 80px on marketing-style sections. Dashboard content uses 24px.

### Grid & Container

- Dashboard layout: left sidebar, topbar, and scrollable content area.
- Card grids: 3-up on desktop, 2-up on tablet, 1-up on mobile.
- Max content width: ~1280px.

### Whitespace Philosophy

Dense enough for dashboards and tables, with calm gray space between cards. Cards sit 16–24px apart.

## Elevation & Depth

The system uses **hairline-only depth**. Cards float above the canvas via a 1px border and white-on-gray contrast. No drop shadows unless confirmed in the web code.

| Level           | Treatment                         | Use                     |
| --------------- | --------------------------------- | ----------------------- |
| Flat (canvas)   | `{colors.canvas}` (#f5f5f5)       | Page background         |
| Card            | `{colors.surface-card}` (#ffffff) | Content cards, panels   |
| Hairline border | 1px `{colors.hairline}`           | Card outlines, tables   |
| Active ring     | 1px `{colors.primary-accent}`     | Active or focused items |

## Shapes

### Border Radius Scale

Values carried over from the previous version; confirm against the web code (for example, `rounded-md`, `rounded-lg`).

| Token            | Value  | Use                         |
| ---------------- | ------ | --------------------------- |
| `{rounded.none}` | 0px    | Reserved                    |
| `{rounded.xs}`   | 4px    | Inline tags                 |
| `{rounded.sm}`   | 6px    | Compact rows                |
| `{rounded.md}`   | 8px    | Buttons, form inputs        |
| `{rounded.lg}`   | 12px   | Cards, panels               |
| `{rounded.xl}`   | 16px   | Large feature panels (rare) |
| `{rounded.pill}` | 9999px | Filter badges, status pills |
| `{rounded.full}` | 9999px | Avatars (rare)              |

## Components

### Top Navigation

**`top-nav`** — Background `{colors.primary}`, text `{colors.ink}`, height 64px. Layout: Unpad duo logo left (links to `/`, `aria-label="Beranda"`), page or app title and actions right.

### Sidebar

**`sidebar`** — Background `{colors.surface-card}`, border-right 1px `{colors.hairline}`. Items use `{typography.nav-link}`, text `{colors.ink}`.

- **`sidebar-item-active`**: Background `{colors.primary}`, text `{colors.ink}`.
- **`sidebar-item-hover`**: Background `{colors.primary-subtle}`.

### Buttons

**`button-primary`** — Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding 10px × 18px, height 40px, rounded `{rounded.md}`. Focus ring `{colors.primary-accent}`.

**`button-primary-active`** — Press state. Background `{colors.primary-accent}`.

**`button-secondary`** — Background `{colors.surface-card}`, text `{colors.ink}`, 1px `{colors.hairline-strong}` border.

**`button-tertiary-text`** — Inline ink text link.

**`button-danger`** — Background `{colors.danger}`, text `#ffffff`. Use only for destructive actions.

### Cards

**`feature-card`** — Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.title-md}`, rounded `{rounded.lg}`, padding 24px, 1px `{colors.hairline}` border.

**`stat-card`** — Same surface. Label in `{typography.caption}` `{colors.muted}`, value in `{typography.display-sm}` `{colors.ink}`.

**`panel`** — Same surface, with a title row and optional divider.

### Page Title Header

**`page-title-header`** — Background `{colors.primary}`, text `{colors.ink}`, type `{typography.display-md}`, padding 16px × 24px.

### Tables

**`table`** — Background `{colors.surface-card}`, border 1px `{colors.hairline}`, rounded `{rounded.lg}`.

- Header row: background `{colors.canvas}`, type `{typography.title-sm}`.
- Body rows: type `{typography.body-sm}`, divider 1px `{colors.hairline}`.
- Row hover: background `{colors.primary-subtle}`.

### Charts

Series order: `{colors.series-1}` → `{colors.series-2}` → `{colors.series-3}` → `{colors.series-4}`. Use `{colors.danger}` only for "Rejected" status. Do not add colors outside this palette.

### Code

**`code-block`** — Background `{colors.surface-card}`, text `{colors.ink}` in `{typography.code}`, rounded `{rounded.lg}`, padding 20px, 1px `{colors.hairline}` border.

### Forms & Tags

**`text-input`** — Background `{colors.surface-card}`, text `{colors.ink}`, rounded `{rounded.md}`, padding 12px × 16px, height 44px, 1px `{colors.hairline}` border. Focus border `{colors.primary-accent}`.

**`badge-filter`** — Background `{colors.primary-subtle}`, text `{colors.ink}`, type `{typography.caption-uppercase}`, rounded `{rounded.pill}`, padding 4px × 10px.

**`badge-status-rejected`** — Text `{colors.danger}`, type `{typography.caption-uppercase}`, rounded `{rounded.pill}`, padding 4px × 10px.

### Footer

**`footer`** — Background `{colors.primary}`, text `{colors.ink}`, type `{typography.body-sm}`. Logo `footer-unpad.svg` on the left.

**`footer-link`** — Background transparent, text `{colors.ink}`, type `{typography.body-sm}`.

## Logo & Brand Assets

| File                               | Location                           | Size / Class                     |
| ---------------------------------- | ---------------------------------- | -------------------------------- |
| `/header-unpad.svg`                | Top navigation, links to `/`       | 220 × 55, `h-7 w-auto sm:h-9`    |
| `/footer-unpad.svg`                | Footer                             | 570 × 142, `h-10 w-auto`         |
| `/Unpad_logo-secondary_only-P.png` | Favicon, shortcut icon, apple icon | `icons` metadata in `layout.tsx` |

Rules:

- Alt text: "Logo Universitas Padjadjaran" (navbar), "Universitas Padjadjaran" (footer).
- Do not recolor, rotate, or stretch the logo. Keep `w-auto` to preserve the aspect ratio.
- Confirm the logo stays legible on `{colors.primary}`.

## Do's and Don'ts

### Do

- Use `{colors.primary}` for the topbar, page title header, active sidebar items, and footer.
- Use `{colors.ink}` for text on any yellow surface.
- Use `{colors.canvas}` as the page floor and `{colors.surface-card}` for cards.
- Use the `{colors.series-*}` palette for charts, and `{colors.danger}` only for "Rejected" status.

### Don't

- Don't use white text on `{colors.primary}`.
- Don't introduce a second brand color.
- Don't use `{colors.danger}` for decoration; reserve it for rejection and error states.
- Don't use chart series colors for buttons or UI backgrounds.
- Don't hardcode hex values in components; use tokens.

## Responsive Behavior

### Breakpoints

| Name    | Width      | Key Changes                                                           |
| ------- | ---------- | --------------------------------------------------------------------- |
| Mobile  | < 640px    | Navbar logo `h-7`; sidebar becomes drawer; cards 1-up; nav hamburger. |
| Tablet  | 640–1024px | Navbar logo `h-9`; cards 2-up; tables scroll horizontally.            |
| Desktop | > 1024px   | Sidebar fixed; cards 3-up; full tables.                               |

### Touch Targets

- Primary button at 40px height.
- Sidebar items at least 40px tall.

### Collapsing Strategy

- Sidebar collapses to a drawer below 768px.
- Card grid: 3-up → 2-up → 1-up.
- Tables scroll horizontally on small screens.

## Iteration Guide

1. Focus on a single component at a time.
2. Buttons default to `{rounded.md}` (8px). Cards use `{rounded.lg}` (12px).
3. Variants live as separate entries inside `components:`.
4. Use `{token.refs}` everywhere — never inline hex.
5. Document hover states only once confirmed in the web code.
6. Unpad Yellow stays the single brand color; use `{colors.primary-subtle}` for hover.
7. Chart series stay within the `{colors.series-*}` palette.

## Known Gaps

- Font family, weights, and radius values are placeholders; confirm against `layout.tsx` and the web CSS.
- Success and hairline-strong colors are carried over and not confirmed.
- Hover and disabled states for buttons and inputs are not yet defined.
- Shadow usage is not confirmed; the document assumes none.
