import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type FocusTrapOptions = {
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
};

function isVisible(element: HTMLElement) {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') {
    return false;
  }
  if (element.offsetParent === null && style.position !== 'fixed') {
    return false;
  }
  if (element.getClientRects().length === 0 && style.position !== 'fixed') {
    return false;
  }
  return true;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  options: FocusTrapOptions = {}
) {
  const { initialFocusRef, returnFocusRef, onEscape } = options;

  useEffect(() => {
    if (!isActive) return;
    if (typeof document === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter(isVisible);
    };

    const focusInitialElement = () => {
      const target = initialFocusRef?.current && isVisible(initialFocusRef.current)
        ? initialFocusRef.current
        : getFocusableElements()[0];

      target?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    };

    const rafId = window.requestAnimationFrame(focusInitialElement);
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('keydown', handleKeyDown);

      const returnTarget = returnFocusRef?.current || previousActiveElement;
      returnTarget?.focus();
    };
  }, [containerRef, isActive, initialFocusRef, onEscape, returnFocusRef]);
}
