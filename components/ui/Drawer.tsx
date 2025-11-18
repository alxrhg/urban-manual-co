'use client';

import { ReactNode } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { DesktopDrawer } from './DesktopDrawer';
import { MobileDrawer } from './MobileDrawer';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mobileVariant?: 'bottom' | 'side';
  desktopWidth?: string;
  zIndex?: number;
  showBackdrop?: boolean;
  backdropOpacity?: string;
  position?: 'right' | 'left';
  style?: 'glassy' | 'solid';
  mobileWidth?: string;
  desktopSpacing?: string;
  mobileHeight?: string;
  mobileMaxHeight?: string;
  mobileBorderRadius?: string;
  mobileExpanded?: boolean;
  keepStateOnClose?: boolean; // New: Keep state when drawer closes
  tier?: 'tier1' | 'tier2' | 'tier3';
  showHandle?: boolean;
  customBorderRadius?: { topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string };
  customShadow?: string;
  customBlur?: string;
  customMargin?: { top?: string; right?: string; bottom?: string; left?: string };
  customBackground?: string;
  customBorder?: { color?: string; thickness?: string };
  subtitle?: string;
  noOverlay?: boolean;
}

/**
 * Universal Drawer Component
 * 
 * Philosophy: "Drawers behave like pulling out a phone from your pocket."
 * - Every quick action is handled in a drawer; every deep action goes to a full page.
 * - Drawers never float; they slide from the right and sit above content.
 * - Smooth horizontal slide animation (220ms ease-out).
 * - Page scroll locked but visible.
 */
export function Drawer(props: DrawerProps) {
  const { isOpen, onClose, zIndex = 50, showBackdrop = true, backdropOpacity = '15', keepStateOnClose = true } = props;

  useBodyScrollLock(isOpen);

  // Don't unmount if keepStateOnClose is true
  if (!isOpen && !keepStateOnClose) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-220 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            zIndex: zIndex - 10,
          }}
          onClick={onClose}
        />
      )}

      <MobileDrawer {...props} />
      <DesktopDrawer {...props} />
    </>
  );
}
