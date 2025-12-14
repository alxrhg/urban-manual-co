## 2025-01-01 - Input Accessibility in Drawers
**Learning:** Inputs in mobile drawers can suffer from a rendering bug where the label text is duplicated into the input value if not properly associated with `htmlFor`/`id` and supplemented with `aria-label`.
**Action:** Always ensure unique IDs (via `useId`) for inputs in drawers and strictly associate them with labels. Add `aria-label` as a safeguard for mobile browsers.
