'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION } from '@/lib/animations';

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  className?: string;
}

/**
 * Confetti - Canvas-based confetti celebration effect
 */
export function Confetti({
  isActive,
  duration = 3000,
  particleCount = 150,
  className = '',
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive || shouldReduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Particle class
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      shape: 'square' | 'circle' | 'triangle';
    }

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    ];

    const shapes: Particle['shape'][] = ['square', 'circle', 'triangle'];

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    let animationId: number;
    const startTime = Date.now();

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      switch (p.shape) {
        case 'square':
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
          break;
      }

      ctx.restore();
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        cancelAnimationFrame(animationId);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.vx *= 0.99; // Air resistance
        p.rotation += p.rotationSpeed;

        // Fade out near the end
        const fadeStart = duration * 0.7;
        if (elapsed > fadeStart) {
          ctx.globalAlpha = 1 - (elapsed - fadeStart) / (duration - fadeStart);
        }

        drawParticle(p);
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, duration, particleCount, shouldReduceMotion]);

  if (shouldReduceMotion || !isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 pointer-events-none z-[9999]', className)}
    />
  );
}

interface SuccessCheckmarkProps {
  isVisible: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onComplete?: () => void;
}

/**
 * SuccessCheckmark - Animated success checkmark
 */
export function SuccessCheckmark({
  isVisible,
  size = 'md',
  className = '',
  onComplete,
}: SuccessCheckmarkProps) {
  const shouldReduceMotion = useReducedMotion();

  const sizeStyles = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 2.5 : 2;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn('flex items-center justify-center', className)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={shouldReduceMotion ? { duration: DURATION.fast } : SPRING.bouncy}
          onAnimationComplete={() => {
            if (onComplete) {
              setTimeout(onComplete, 500);
            }
          }}
        >
          <motion.div
            className={cn(
              'rounded-full bg-green-500 flex items-center justify-center',
              sizeStyles[size]
            )}
            initial={shouldReduceMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING.bouncy}
          >
            <svg
              className={cn(
                'text-white',
                size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
                d="M5 13l4 4L19 7"
                initial={shouldReduceMotion ? {} : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface HeartAnimationProps {
  isLiked: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * HeartAnimation - Animated heart/like button
 */
export function HeartAnimation({
  isLiked,
  onToggle,
  size = 'md',
  className = '',
}: HeartAnimationProps) {
  const shouldReduceMotion = useReducedMotion();
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  const sizeStyles = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = () => {
    if (!isLiked && !shouldReduceMotion) {
      // Add burst particles
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.cos((i / 6) * Math.PI * 2) * 20,
        y: Math.sin((i / 6) * Math.PI * 2) * 20,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 500);
    }
    onToggle();
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn('relative', className)}
      whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
    >
      {/* Burst particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-red-500"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
              scale: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Heart icon */}
      <motion.svg
        className={cn(sizeStyles[size], isLiked ? 'text-red-500' : 'text-gray-400')}
        viewBox="0 0 24 24"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        animate={
          shouldReduceMotion
            ? {}
            : isLiked
            ? { scale: [1, 1.3, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.3 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </motion.svg>
    </motion.button>
  );
}

interface CelebrationBannerProps {
  isVisible: boolean;
  title: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

/**
 * CelebrationBanner - Animated celebration banner/toast
 */
export function CelebrationBanner({
  isVisible,
  title,
  description,
  onClose,
  duration = 5000,
  className = '',
}: CelebrationBannerProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isVisible && onClose && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'fixed top-4 left-1/2 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-lg',
            className
          )}
          initial={
            shouldReduceMotion
              ? { opacity: 0, x: '-50%' }
              : { opacity: 0, y: -50, x: '-50%', scale: 0.9 }
          }
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0, x: '-50%' }
              : { opacity: 0, y: -50, x: '-50%', scale: 0.9 }
          }
          transition={shouldReduceMotion ? { duration: DURATION.fast } : SPRING.bouncy}
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="text-2xl"
              animate={shouldReduceMotion ? {} : { rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              🎉
            </motion.span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-white/80">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AchievementUnlockProps {
  isVisible: boolean;
  title: string;
  description: string;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
}

/**
 * AchievementUnlock - Achievement unlocked animation
 */
export function AchievementUnlock({
  isVisible,
  title,
  description,
  icon,
  onClose,
  className = '',
}: AchievementUnlockProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isVisible && onClose) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Confetti */}
          <Confetti isActive={isVisible} duration={2000} particleCount={80} />

          {/* Achievement card */}
          <motion.div
            className={cn(
              'fixed top-1/2 left-1/2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 text-center',
              className
            )}
            initial={
              shouldReduceMotion
                ? { opacity: 0, x: '-50%', y: '-50%' }
                : { opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }
            }
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={
              shouldReduceMotion
                ? { opacity: 0, x: '-50%', y: '-50%' }
                : { opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }
            }
            transition={shouldReduceMotion ? { duration: DURATION.fast } : SPRING.bouncy}
          >
            <motion.div
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
              animate={shouldReduceMotion ? {} : { rotate: [0, 360] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {icon || (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Achievement Unlocked
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Confetti;
