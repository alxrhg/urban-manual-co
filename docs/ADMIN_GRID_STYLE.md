# Admin Grid Visual System

The admin surface now follows a reusable “Grid” aesthetic inspired by staggered editorial dashboards (Kinfolk and Playtype layouts) and the dense typographic rhythm seen in open-source grids like Cabin or Linear’s data room. The goal is a control room feel: cards with bold uppercase labels, consistent gutters, and a visible coordinate system.

## Layout primitives

The system lives in `src/components/admin/layout/`:

- `AdminGrid` – wraps each screen, applies CSS variables for spacing and renders the faint gridline background.
- `GridSection` – constrains children to a 12-column responsive grid with consistent gaps.
- `GridCard`, `GridCardHeader`, `GridCardBody`, `GridCardFooter`, `GridDivider` – card primitives with standardized padding, borders, and typography hooks.
- `gridTypography` + `GRID_TOKENS` – spacing tokens (gaps, radii, card padding) and typography utilities for labels/titles.

### Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--admin-grid-gap-x` | 1.25rem (desktop 1.75rem) | Horizontal gutter between columns. |
| `--admin-grid-gap-y` | 1.25rem (desktop 1.5rem) | Vertical spacing between grid rows. |
| `--admin-grid-card-padding` | 1.25rem (sm 1rem / lg 1.75rem) | Shared padding inside cards. |
| `--admin-grid-card-radius` | 1.25rem | Card corner radius. |
| `--admin-gridline-size` | 64px | Size of the background grid cells. |
| `--admin-gridline-color` | rgba(148,163,184,0.25) | Gridline tint for the backdrop. |

All cards inherit the dense uppercase label style (`gridTypography.label`) and bold hero values (`gridTypography.title`).

## Reusable widgets

- `src/components/admin/stat-card.tsx` exposes `AdminStatCard`, combining the layout tokens with trend indicators.
- `src/components/admin/filters.tsx` provides `AdminFilterBar` for search inputs, filter chips, and loading states.
- `components/Toast.tsx` now mirrors the same rounded, grid-aligned look with translucent surfaces and uppercase controls.

## Composition guidelines

1. **Start with `AdminGrid`.** Set page padding and grid background once per screen.
2. **Use `GridSection` for rows.** Each section is a 12-column grid; cards define spans (`span={{ base:12, md:6 }}`) to achieve staggered layouts.
3. **Compose cards.** Nest `GridCardHeader/Body/Footer` to align typography and spacing. Avoid ad-hoc padding so spacing tokens remain consistent.
4. **Typography.** Labels use uppercase tracking (`gridTypography.label`), values follow bold Grotesk styles, and action pills keep the 0.35em tracking.
5. **Gridlines + zebra rows.** Tables should adopt zebra rows and sticky headers to keep the dense grid readable.

Use this doc as the canonical reference when adding new admin modules so the staggered grid, bold type, and dense gridlines stay cohesive.
