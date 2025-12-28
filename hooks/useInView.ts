'use client';

import { useState, useEffect, useRef } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

const observers = new Map<string, IntersectionObserver>();
const callbacks = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>();

const getObserverKey = (options: IntersectionObserverInit) => {
  const margin = options.rootMargin || '0px';
  const threshold = Array.isArray(options.threshold)
    ? options.threshold.join(',')
    : options.threshold || 0;
  return `${margin}-${threshold}`;
};

export function useInView({
  triggerOnce = true,
  rootMargin = '0px',
  threshold = 0,
}: UseInViewOptions = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const options = { rootMargin, threshold };
    const key = getObserverKey(options);

    let observer = observers.get(key);

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const callback = callbacks.get(entry.target);
          if (callback) callback(entry);
        });
      }, options);
      observers.set(key, observer);
    }

    callbacks.set(element, (entry) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (triggerOnce) {
          observer?.unobserve(element);
          callbacks.delete(element);
        }
      } else if (!triggerOnce) {
        setIsInView(false);
      }
    });

    observer.observe(element);

    return () => {
      observer?.unobserve(element);
      callbacks.delete(element);
    };
  }, [rootMargin, threshold, triggerOnce]);

  return { ref, isInView };
}
