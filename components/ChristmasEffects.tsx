'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChristmasTheme } from '@/contexts/ChristmasThemeContext';

// Konami Code: up up down down left right left right b a
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// Christmas countdown component
function ChristmasCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isChristmas, setIsChristmas] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const christmas = new Date(currentYear, 11, 25); // December 25th

      // If Christmas has passed this year, target next year
      if (now > christmas) {
        christmas.setFullYear(currentYear + 1);
      }

      const difference = christmas.getTime() - now.getTime();

      if (difference <= 0) {
        setIsChristmas(true);
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isChristmas) {
    return (
      <div className="christmas-countdown christmas-countdown-celebration">
        Merry Christmas!
      </div>
    );
  }

  if (!timeLeft) return null;

  return (
    <div className="christmas-countdown">
      <span className="countdown-label">Until Christmas:</span>
      <span className="countdown-time">
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}

// Floating Santa's sleigh that occasionally flies across
function FlyingSanta() {
  const [isFlying, setIsFlying] = useState(false);

  useEffect(() => {
    // Fly Santa every 45-90 seconds
    const scheduleFlight = () => {
      const delay = 45000 + Math.random() * 45000;
      return setTimeout(() => {
        setIsFlying(true);
        setTimeout(() => setIsFlying(false), 8000);
        scheduleFlight();
      }, delay);
    };

    // Initial flight after 10-20 seconds
    const initialDelay = setTimeout(() => {
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 8000);
      scheduleFlight();
    }, 10000 + Math.random() * 10000);

    return () => clearTimeout(initialDelay);
  }, []);

  if (!isFlying) return null;

  return (
    <div className="flying-santa" aria-hidden="true">
      <span className="santa-sleigh">🎅🛷🦌🦌🦌</span>
    </div>
  );
}

// Sparkle effect on click
function ClickSparkles() {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      const sparkle = { id, x: e.clientX, y: e.clientY };
      setSparkles(prev => [...prev, sparkle]);

      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== id));
      }, 1000);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="click-sparkle"
          style={{ left: sparkle.x, top: sparkle.y }}
          aria-hidden="true"
        >
          <span className="sparkle-emoji">✨</span>
          <span className="sparkle-emoji sparkle-2">❄️</span>
          <span className="sparkle-emoji sparkle-3">⭐</span>
        </div>
      ))}
    </>
  );
}

// Gift box that appears and can be clicked for surprise
function GiftBox() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState({ bottom: 20, right: 20 });

  const messages = [
    'Happy Holidays! 🎄',
    'Wishing you joy! ✨',
    'Ho Ho Ho! 🎅',
    'Season\'s Greetings! 🌟',
    'Stay cozy! ☕',
    'You\'re amazing! 💝',
    'Spread the cheer! 🎉',
    'Winter wonderland! ❄️',
  ];

  useEffect(() => {
    // Show gift box every 60-120 seconds
    const scheduleGift = () => {
      const delay = 60000 + Math.random() * 60000;
      return setTimeout(() => {
        setPosition({
          bottom: 20 + Math.random() * 100,
          right: 20 + Math.random() * 100
        });
        setIsVisible(true);
        setIsOpened(false);
      }, delay);
    };

    const timer = scheduleGift();
    return () => clearTimeout(timer);
  }, [isOpened]);

  const handleClick = () => {
    if (!isOpened) {
      setIsOpened(true);
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
  };

  if (!isVisible) return null;

  return (
    <button
      className={`gift-box ${isOpened ? 'gift-opened' : 'gift-closed'}`}
      style={{ bottom: position.bottom, right: position.right }}
      onClick={handleClick}
      aria-label="Mystery gift - click to open"
    >
      {isOpened ? (
        <span className="gift-message">{message}</span>
      ) : (
        <span className="gift-emoji">🎁</span>
      )}
    </button>
  );
}

export function ChristmasEffects() {
  const { isChristmasMode } = useChristmasTheme();
  const [konamiActivated, setKonamiActivated] = useState(false);
  const [konamiIndex, setKonamiIndex] = useState(0);

  // Konami code easter egg
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === KONAMI_CODE[konamiIndex]) {
      const newIndex = konamiIndex + 1;
      if (newIndex === KONAMI_CODE.length) {
        setKonamiActivated(true);
        setKonamiIndex(0);
        // Add super Christmas mode
        document.documentElement.classList.add('christmas-super-mode');
        // Show celebration
        setTimeout(() => {
          alert('🎄 SUPER CHRISTMAS MODE ACTIVATED! 🎅\n\nYou found the secret! Enjoy extra festive effects!');
        }, 100);
      } else {
        setKonamiIndex(newIndex);
      }
    } else {
      setKonamiIndex(0);
    }
  }, [konamiIndex]);

  useEffect(() => {
    if (isChristmasMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isChristmasMode, handleKeyDown]);

  if (!isChristmasMode) return null;

  return (
    <>
      {/* Christmas lights along the top */}
      <div className="christmas-lights" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="christmas-light"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Countdown to Christmas */}
      <ChristmasCountdown />

      {/* Flying Santa (occasional) */}
      <FlyingSanta />

      {/* Click sparkles */}
      <ClickSparkles />

      {/* Random gift box */}
      <GiftBox />

      {/* Snow pile at bottom */}
      <div className="snow-pile" aria-hidden="true" />

      {/* Super mode effects */}
      {konamiActivated && (
        <div className="super-christmas-overlay" aria-hidden="true">
          <div className="super-snow" />
        </div>
      )}
    </>
  );
}
