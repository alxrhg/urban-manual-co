'use client';

import { useEffect } from 'react';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

    const createConfetti = () => {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
        size: number;
        rotation: number;
        rotationSpeed: number;
      }> = [];

      // Create particles
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * 3 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
        });
      }

      const animate = () => {
        if (Date.now() > animationEnd) {
          document.body.removeChild(canvas);
          onComplete?.();
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          // Update position
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1; // gravity
          p.rotation += p.rotationSpeed;

          // Draw particle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();

          // Respawn if off screen
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
        });

        requestAnimationFrame(animate);
      };

      animate();
      return canvas;
    };

    const canvas = createConfetti();

    return () => {
      if (canvas && document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [trigger, onComplete]);

  return null;
}
