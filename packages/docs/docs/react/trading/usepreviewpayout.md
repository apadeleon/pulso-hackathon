---
title: "usePreviewPayout"
sidebar_position: 4
description: "Preview hook that wraps previewPayoutCurve() from core with managed loading/error state and automatic request cancellation."
---

# usePreviewPayout

**`usePreviewPayout(marketId)`**

Preview hook that wraps `previewPayoutCurve()` from `@functionspace/core`. Manages loading and error state, and uses an internal `AbortController` to cancel in-flight requests when a new preview is requested. Does not auto-invalidate the cache (previews are read-only).

```typescript
function usePreviewPayout(
  marketId: string | number,
): {
  execute: (belief: BeliefVector, collateral: number) => Promise<PayoutCurve>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market to preview |

**Return shape:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `execute` | `(belief: BeliefVector, collateral: number) => Promise<PayoutCurve>` | Call to preview the payout curve. Resolves with the `PayoutCurve` on success. Throws on failure. |
| `loading` | `boolean` | `true` while a preview request is in flight |
| `error` | `Error \| null` | Most recent error from a failed preview, or `null` |
| `reset` | `() => void` | Clears the `error` state back to `null` |

**Behavior:**

* `execute` reads `numBuckets` from the market cache snapshot automatically -- the caller does not need to pass it.
* Each call to `execute` aborts any previous in-flight request before starting a new one. This prevents stale responses from overwriting newer ones during rapid input changes.
* When a request is aborted, the `AbortError` is re-thrown but does **not** set the `error` state. The `loading` state is not cleared for aborted requests (the new request takes over).
* Errors auto-clear after 5 seconds. Call `reset()` to clear immediately.
* No cache invalidation on success -- previews are read-only.
* Works in guest mode. The underlying `previewPayoutCurve()` request is treated as read-only even though it uses POST.
* Throws `"Market data not loaded. Cannot determine numBuckets for validation."` if `useMarket` has not yet loaded market data for this `marketId`.
* Throws `"usePreviewPayout must be used within FunctionSpaceProvider"` if rendered outside the provider.
* Debouncing is the caller's responsibility. The hook handles the request and cancellation; the component should debounce calls to `execute` (typically 500ms).

**Delegates to:** `previewPayoutCurve(client, marketId, belief, collateral, numBuckets, undefined, { signal })` from `@functionspace/core`.

**Example:**

```tsx
import { useEffect, useRef, useContext, useCallback } from 'react';
import { FunctionSpaceContext, useMarket, usePreviewPayout } from '@functionspace/react';
import { generateGaussian } from '@functionspace/core';

function PayoutPreview({ marketId, center, spread, amount }: {
  marketId: string;
  center: number;
  spread: number;
  amount: number;
}) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('Must be within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { execute: preview, loading, error } = usePreviewPayout(marketId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced payout preview
  useEffect(() => {
    if (!market || amount <= 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const { numBuckets, lowerBound, upperBound } = market.config;
    const belief = generateGaussian(center, spread, numBuckets, lowerBound, upperBound);

    debounceRef.current = setTimeout(async () => {
      try {
        const curve = await preview(belief, amount);
        ctx.setPreviewPayout(curve);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        ctx.setPreviewPayout(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [market, center, spread, amount]);

  return (
    <div>
      {loading && <span>Previewing...</span>}
      {error && <span>Preview error: {error.message}</span>}
    </div>
  );
}
```
