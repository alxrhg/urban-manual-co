export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] },
};

export const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.6 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

export const staggerChildren = (stagger = 0.08) => ({
  variants: {
    show: { transition: { staggerChildren: stagger } },
  },
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.3 },
});

export const childFade = {
  variants: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  },
  transition: { duration: 0.4, ease: 'easeOut' },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2, ease: 'easeIn' } },
};
