# 2025-02-23 - Standardizing Loading States and Icon Button Accessibility

**Learning:**
Standardizing loading states in the base `Button` component significantly reduces boilerplate code and ensures consistent visual feedback across the application. Previously, developers manually implemented spinner logic, leading to inconsistencies and visual clutter.

Additionally, icon-only buttons frequently lack `aria-label` attributes, making them inaccessible to screen reader users. This is a common pattern in admin interfaces where space is tight.

**Action:**
1. Always prefer using the `isLoading` prop on the `Button` component instead of manually rendering spinners.
2. When reviewing or creating icon-only buttons (especially those with `size="icon"`), strictly enforce the presence of a descriptive `aria-label`.
3. Use the `Button` component instead of raw HTML `button` elements to leverage built-in accessibility and styling features.
