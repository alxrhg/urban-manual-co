import { useEffect } from 'react';

let scrollLockCount = 0;
let previousOverflow: string | null = null;

export function useBodyScrollLock(shouldLock: boolean) {
  useEffect(() => {
    if (!shouldLock) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const body = document.body;
    if (scrollLockCount === 0) {
      previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = 'hidden';
    }

    scrollLockCount += 1;

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0 && typeof document !== 'undefined') {
        body.style.overflow = previousOverflow ?? '';
      }
    };
  }, [shouldLock]);
}
