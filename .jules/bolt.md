## 2024-03-20 - Memoizing Grid Items
**Learning:** React.memo on a list component like `UniversalGrid` is ineffective if the `items` prop is a new array reference on every render (e.g., from `.slice()`). You must memoize both the `renderItem` callback AND the derived `items` array to prevent unnecessary re-renders.
**Action:** When optimizing lists, check if the data source itself is stable. If it's derived inline (like slice/filter), use `useMemo` on the data first.
