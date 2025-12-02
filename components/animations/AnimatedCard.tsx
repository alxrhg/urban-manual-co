'use client';

import { ReactNode, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION, EASE } from '@/lib/animations';

interface AnimatedCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  hover?: 'lift' | 'glow' | 'scale' | 'tilt' | 'none';
  pressable?: boolean;
  className?: string;
  as?: 'div' | 'article' | 'button' | 'a';
  onClick?: () => void;
}

/**
 * AnimatedCard - Card with hover and tap interactions
 *
 * Features:
 * - Multiple hover effects (lift, glow, scale, tilt)
 * - Press feedback
 * - Smooth transitions
 */
export function AnimatedCard({
  children,
  variant = 'default',
  hover = 'lift',
  pressable = false,
  className = '',
  as = 'div',
  onClick,
}: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  const variantStyles = {
    default:
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl',
    elevated:
      'bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-900/50',
    outlined:
      'bg-transparent border border-gray-200 dark:border-gray-800 rounded-2xl',
    ghost: 'bg-transparent rounded-2xl',
  };

  if (shouldReduceMotion) {
    const StaticComponent = as;
    return (
      <StaticComponent
        className={cn(variantStyles[variant], onClick && 'cursor-pointer', className)}
        onClick={onClick}
      >
        {children}
      </StaticComponent>
    );
  }

  // Calculate hover animations based on type
  const getHoverAnimation = () => {
    switch (hover) {
      case 'lift':
        return { y: -4, boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.15)' };
      case 'glow':
        return { boxShadow: '0 0 30px rgba(0, 0, 0, 0.1)' };
      case 'scale':
        return { scale: 1.02 };
      case 'tilt':
        return {}; // Handled separately with mouse position
      case 'none':
      default:
        return {};
    }
  };

  return (
    <motion.div
      className={cn(variantStyles[variant], onClick && 'cursor-pointer', className)}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={hover !== 'none' ? getHoverAnimation() : undefined}
      whileTap={pressable ? { scale: 0.98 } : undefined}
      transition={SPRING.snappy}
    >
      {children}

      {/* Glow overlay for glow effect */}
      {hover === 'glow' && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: DURATION.fast }}
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.div>
  );
}

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltAmount?: number;
  glareEnabled?: boolean;
}

/**
 * TiltCard - Card with 3D tilt effect on hover
 */
export function TiltCard({
  children,
  tiltAmount = 10,
  glareEnabled = true,
  className = '',
}: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTilt({
      x: (y - 0.5) * tiltAmount,
      y: (x - 0.5) * -tiltAmount,
    });

    setGlarePosition({
      x: x * 100,
      y: y * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  if (shouldReduceMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      transition={SPRING.snappy}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {children}

      {/* Glare effect */}
      {glareEnabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
          }}
          transition={{ duration: 0.1 }}
        />
      )}
    </motion.div>
  );
}

interface ImageRevealCardProps {
  children: ReactNode;
  image: string;
  imageAlt: string;
  className?: string;
}

/**
 * ImageRevealCard - Card with image zoom on hover
 */
export function ImageRevealCard({
  children,
  image,
  imageAlt,
  className = '',
}: ImageRevealCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
        className
      )}
      whileHover="hover"
      initial="rest"
    >
      {/* Image with zoom effect */}
      <motion.div
        className="relative aspect-video overflow-hidden"
        variants={{
          rest: { scale: 1 },
          hover: shouldReduceMotion ? { scale: 1 } : { scale: 1.05 },
        }}
        transition={{ duration: DURATION.medium, ease: EASE.out }}
      >
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover"
        />

        {/* Overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-black/20"
          variants={{
            rest: { opacity: 0 },
            hover: { opacity: 1 },
          }}
          transition={{ duration: DURATION.fast }}
        />
      </motion.div>

      {/* Content */}
      {children}
    </motion.div>
  );
}

export default AnimatedCard;
