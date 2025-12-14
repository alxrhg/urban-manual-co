## 2024-05-23 - Lazy Loading Modals
**Learning:** Heavy interactive components like `AISearchChat` that are initially hidden (modals) should be lazy-loaded using `next/dynamic` and conditionally rendered. This avoids bloating the initial JS bundle with code that isn't immediately needed.
**Action:** Always check large modal components and apply `dynamic` import + conditional rendering.
