'use client';

import { ReactNode, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  slideUpVariants,
  fadeVariants,
  scaleVariants,
  DURATION,
  EASE,
} from '@/lib/animations';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
}

/**
 * ScrollReveal - Reveal elements when they enter viewport
 *
 * @example
 * <ScrollReveal direction="up">
 *   <Card />
 * </ScrollReveal>
 */
export function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = DURATION.medium,
  distance = 30,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const getInitialState = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: distance };
      case 'right':
        return { opacity: 0, x: -distance };
      case 'scale':
        return { opacity: 0, scale: 0.9 };
      case 'fade':
      default:
        return { opacity: 0 };
    }
  };

  const getAnimateState = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      case 'scale':
        return { opacity: 1, scale: 1 };
      case 'fade':
      default:
        return { opacity: 1 };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialState()}
      animate={isInView ? getAnimateState() : getInitialState()}
      transition={{
        duration,
        delay,
        ease: EASE.easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}

interface ScrollRevealGroupProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  staggerDelay?: number;
  once?: boolean;
}

/**
 * ScrollRevealGroup - Reveal multiple elements with stagger when in viewport
 */
export function ScrollRevealGroup({
  children,
  className = '',
  direction = 'up',
  staggerDelay = 0.1,
  once = true,
}: ScrollRevealGroupProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();
  const childArray = Array.isArray(children) ? children : [children];

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      {childArray.map((child, index) => (
        <ScrollReveal
          key={index}
          direction={direction}
          delay={isInView ? index * staggerDelay : 0}
          once={once}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
}

/**
 * Parallax - Create parallax scrolling effect
 */
export function Parallax({
  children,
  className = '',
  speed = 0.5,
  direction = 'up',
}: ParallaxProps) {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        willChange: 'transform',
      }}
      initial={{ y: 0 }}
      whileInView={{
        y: direction === 'up' ? -50 * speed : 50 * speed,
      }}
      transition={{
        type: 'tween',
        ease: 'linear',
      }}
      viewport={{ once: false, amount: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
