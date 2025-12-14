## 2025-01-20 - Mobile Input Accessibility Bug
**Learning:** Mobile browsers may duplicate label text into input values when inputs in drawers lack explicit `aria-label` attributes or proper label association, causing severe usability issues.
**Action:** Always ensure inputs in drawers have unique IDs (using `useId`), explicit `htmlFor` label associations, and `aria-label` attributes to prevent this behavior and improve accessibility.
