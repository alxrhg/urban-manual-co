'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION, EASE } from '@/lib/animations';

interface AnimatedTabsProps {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'pill' | 'segment';
}

/**
 * AnimatedTabs - Tab navigation with animated indicator
 */
export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'underline',
}: AnimatedTabsProps) {
  const shouldReduceMotion = useReducedMotion();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const activeTabElement = tabRefs.current[activeIndex];

    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  const variantStyles = {
    underline: {
      container: 'border-b border-gray-200 dark:border-gray-800',
      tab: 'px-4 py-3 text-sm font-medium',
      indicator: 'h-0.5 bottom-0 bg-gray-900 dark:bg-white',
    },
    pill: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-xl p-1',
      tab: 'px-4 py-2 text-sm font-medium rounded-lg',
      indicator: 'inset-y-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm',
    },
    segment: {
      container: 'border border-gray-200 dark:border-gray-800 rounded-xl p-1',
      tab: 'px-4 py-2 text-sm font-medium rounded-lg',
      indicator: 'inset-y-1 bg-gray-900 dark:bg-white rounded-lg',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn('relative flex', styles.container, className)}>
      {/* Animated indicator */}
      <motion.div
        className={cn('absolute', styles.indicator)}
        initial={false}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 500, damping: 30 }
        }
      />

      {/* Tabs */}
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
          onClick={() => onChange(tab.id)}
          className={cn(
            styles.tab,
            'relative z-10 transition-colors',
            activeTab === tab.id
              ? variant === 'segment'
                ? 'text-white dark:text-gray-900'
                : 'text-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

interface AnimatedChipsProps {
  chips: { id: string; label: string; icon?: ReactNode }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  className?: string;
}

/**
 * AnimatedChips - Chip/tag selection with animations
 */
export function AnimatedChips({
  chips,
  selected,
  onChange,
  multiple = false,
  className = '',
}: AnimatedChipsProps) {
  const shouldReduceMotion = useReducedMotion();

  const handleClick = (id: string) => {
    if (multiple) {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else {
        onChange([...selected, id]);
      }
    } else {
      onChange(selected.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {chips.map((chip) => {
        const isSelected = selected.includes(chip.id);

        return (
          <motion.button
            key={chip.id}
            onClick={() => handleClick(chip.id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            layout={!shouldReduceMotion}
            transition={SPRING.snappy}
          >
            <span className="flex items-center gap-1.5">
              {chip.icon}
              {chip.label}
              {isSelected && (
                <motion.svg
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface AnimatedBreadcrumbsProps {
  items: { label: string; href?: string; onClick?: () => void }[];
  className?: string;
}

/**
 * AnimatedBreadcrumbs - Breadcrumb navigation with animations
 */
export function AnimatedBreadcrumbs({
  items,
  className = '',
}: AnimatedBreadcrumbsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <nav className={cn('flex items-center', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <motion.li
            key={index}
            className="flex items-center"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: DURATION.fast }}
          >
            {index > 0 && (
              <svg
                className="h-4 w-4 text-gray-400 mx-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {item.href || item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
}

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * HamburgerMenu - Animated hamburger to X icon
 */
export function HamburgerMenu({
  isOpen,
  onClick,
  className = '',
}: HamburgerMenuProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-6 h-6 flex flex-col justify-center items-center',
        className
      )}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <motion.span
        className="absolute w-5 h-0.5 bg-current rounded-full"
        animate={
          shouldReduceMotion
            ? {}
            : {
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -6,
              }
        }
        transition={SPRING.snappy}
      />
      <motion.span
        className="absolute w-5 h-0.5 bg-current rounded-full"
        animate={
          shouldReduceMotion
            ? {}
            : {
                opacity: isOpen ? 0 : 1,
                scaleX: isOpen ? 0 : 1,
              }
        }
        transition={{ duration: DURATION.fast }}
      />
      <motion.span
        className="absolute w-5 h-0.5 bg-current rounded-full"
        animate={
          shouldReduceMotion
            ? {}
            : {
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 6,
              }
        }
        transition={SPRING.snappy}
      />
    </button>
  );
}

interface ScrollIndicatorProps {
  className?: string;
}

/**
 * ScrollIndicator - Page scroll progress indicator
 */
export function ScrollIndicator({ className = '' }: ScrollIndicatorProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn('fixed top-0 left-0 right-0 h-1 z-50 bg-gray-200 dark:bg-gray-800', className)}
    >
      <motion.div
        className="h-full bg-gray-900 dark:bg-white origin-left"
        style={{ scaleX: scrollProgress }}
      />
    </div>
  );
}

interface BackToTopProps {
  threshold?: number;
  className?: string;
}

/**
 * BackToTop - Animated back to top button
 */
export function BackToTop({ threshold = 300, className = '' }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg z-40',
            className
          )}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING.snappy}
          aria-label="Back to top"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default AnimatedTabs;
