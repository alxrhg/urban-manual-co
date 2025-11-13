# Search Refinement Benchmark

This benchmark compares the legacy in-memory refinement logic with the new server-side predicate builder that powers Supabase queries. It uses the synthetic dataset and helper utilities defined in `tests/refinement-benchmark.ts`.

## How to run

```
npm run benchmark:refinements
```

The script generates ~2,400 mock destinations, applies an identical set of refinements, and measures average latency over 50 iterations for both approaches.

## Results

| Approach | Avg. latency per run |
| --- | --- |
| Legacy in-memory filters | 1.84 ms |
| Predicate-based filters | 0.67 ms |

**Speedup:** ~2.75× faster filtering thanks to server-side predicates.

See the console output captured in the benchmark run for details.【58edf2†L1-L4】
