import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

export const childFade: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' }
  }
};

export function staggerChildren(stagger: number = 0.04): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: stagger,
        delayChildren: 0.02
      }
    }
  };
}

import { MotionProps } from 'framer-motion';

export const fadeInUp: MotionProps = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] },
};

export const fadeIn: MotionProps = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.6 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

export const staggerChildren = (stagger = 0.08): MotionProps => ({
  variants: {
    show: { transition: { staggerChildren: stagger } },
  },
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.3 },
});

export const childFade: MotionProps = {
  variants: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  },
  transition: { duration: 0.4, ease: 'easeOut' },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } },
};
