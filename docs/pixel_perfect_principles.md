# Pixel-Perfect Principles

> Version 1.0 — 2025-11-16  
> Applies to every surface across apps (`web`, `cms`, `workers` UIs) and informs both design and engineering review gates.

## 1. Visual System
- **Color**: Use tokens only (`--um-color-*`). Always pair with contrast checks ≥ WCAG 2.1 AA (AAA for text ≤ 18px). No hex literals in component code.
- **Typography**: Typescale anchored to `--font-size-root = 15px`. Pairings limited to Display, Editorial, Body, Caption families. Tracking and line-height per token; manual overrides require design approval.
- **Spacing**: 4px baseline grid. Components snap to half-grid only when necessary for optical alignment. Layouts align to 12-column fluid grid on ≥1024px, 8-column on mobile.
- **Imagery**: Minimum 1.5x DPR assets. Blur-up transitions ≤120ms. All hero media graded (tone curve + subtle noise) for reflective finish.
- **Iconography**: Use shared set in `packages/ui/icons`. Stroke width locked at 1.5px, corner radius multiples of 4.

## 2. Interaction & Motion
- **Performance**: 60fps baseline on M2 Macbook / Pixel 8. No layout thrash; prefer transform/opacity. Include DevTools trace link in PR for motion-heavy components.
- **Motion curves**: `Reflective` (cubic-bezier(0.32, 0.72, 0, 1)) for hero transitions, `Smart` (0.2, 0.8, 0.2, 1) for micro interactions. Duration 140–280ms. Provide reduced-motion alternative with opacity-only transitions.
- **States**: Hover → Focus → Active states all defined. Focus indicators meet WCAG (≥3px, 3:1 contrast). No default browser outlines.
- **Feedback**: Loading skeletons or shimmer for anything >150ms. Toasts replaced by inline confirmations when possible. Errors use conversational tone (“Let’s try that again”).

## 3. Content & Tone
- Voice: Reflective, smart, composed. No exclamation marks unless quoting.
- Copy surfaces context (“Next in your Kyoto trip”), not generic labels.
- Chat persona: “Architect-curator” — replies explain reasoning, cite sources, remain humble.
- All copy reviewed in pair (Design + Editorial) before merge; tracked via `content_review.md`.

## 4. Accessibility & Inclusion
- Mandatory axe + Lighthouse accessibility checks (score ≥ 95).
- Provide text alternatives for all media; architect/brand metadata exposed via ARIA descriptions.
- Support keyboard-only navigation, screen readers, and dynamic type (system font scaling up to 150%).
- Dark mode parity: same contrast, no pure black backgrounds (use `--color-panel-ink`).

## 5. Quality Gates
- Storybook + Chromatic snapshot required for every component/page; diffs >2px fail without approval.
- Playwright “Polish Patrol” flows: measurement overlays verify spacing, motion capture ensures easing curves unchanged.
- Visual QA checklist attached to PR (template in `.github/pull_request_template.md`).
- Telemetry validation: ensure new interactions emit analytics events documented in `analytics.yml`.

## 6. Handoff Workflow
1. Figma spec includes tokens, interaction notes, copy.
2. Engineer links spec + DevTools trace in PR description.
3. Automated checks run (lint, tests, Chromatic, Playwright, axe/Lighthouse). All must pass.
4. Design + PM sign off in PR before merge.

---

These principles evolve via ADRs. Any deviation requires a documented exception with expiry date. “Pixel perfect” is the default, not a stretch goal.
