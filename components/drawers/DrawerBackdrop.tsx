'use client';

import { motion } from 'framer-motion';

interface DrawerBackdropProps {
  isVisible: boolean;
  onClick?: () => void;
  zIndex?: number;
  opacity?: number;
}

export function DrawerBackdrop({
  isVisible,
  onClick,
  zIndex = 40,
  opacity = 0.5,
}: DrawerBackdropProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black"
      style={{ zIndex }}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.32, 0.72, 0, 1],
      }}
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

export default DrawerBackdrop;
