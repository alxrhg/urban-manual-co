'use client';

import { ReactNode } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { DesktopDrawer } from './DesktopDrawer';
import { MobileDrawer } from './MobileDrawer';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

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
  const resolvedProps = applyTierDefaults(props);
  const {
    isOpen,
    onClose,
    zIndex = 50,
    showBackdrop = true,
    backdropOpacity = '15',
    keepStateOnClose = true,
  } = resolvedProps;

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

      <MobileDrawer {...resolvedProps} />
      <DesktopDrawer {...resolvedProps} />
    </>
  );
}

function applyTierDefaults(props: DrawerProps): DrawerProps {
  const tierDefaults = getTierDefaults(props.tier);

  return {
    ...props,
    style: props.style ?? tierDefaults.style,
    customBackground: props.customBackground ?? tierDefaults.customBackground,
    customBorderRadius: props.customBorderRadius ?? tierDefaults.customBorderRadius,
    customShadow: props.customShadow ?? tierDefaults.customShadow,
    customBlur: props.customBlur ?? tierDefaults.customBlur,
    customBorder: props.customBorder ?? tierDefaults.customBorder,
    showHandle: props.showHandle ?? tierDefaults.showHandle,
    mobileHeight: props.mobileHeight ?? tierDefaults.mobileHeight,
    mobileMaxHeight: props.mobileMaxHeight ?? tierDefaults.mobileMaxHeight,
    mobileBorderRadius: props.mobileBorderRadius ?? tierDefaults.mobileBorderRadius,
    backdropOpacity: props.backdropOpacity ?? tierDefaults.backdropOpacity,
  };
}

function getTierDefaults(tier?: DrawerProps['tier']): Partial<DrawerProps> {
  const radius = (value?: number) =>
    typeof value === 'number' ? `${value}px` : undefined;

  switch (tier) {
    case 'tier1': {
      const cornerRadius = radius(DRAWER_STYLES.tier1.cornerRadius);
      return {
        style: 'glassy',
        customBackground: DRAWER_STYLES.tier1.background,
        customBorderRadius: cornerRadius
          ? {
              topLeft: cornerRadius,
              topRight: cornerRadius,
              bottomLeft: cornerRadius,
              bottomRight: cornerRadius,
            }
          : undefined,
        customShadow: DRAWER_STYLES.shadow.value,
        customBlur: `${DRAWER_STYLES.backdrop.blur}px`,
        customBorder: {
          color: DRAWER_STYLES.darkMode.border,
          thickness: '1px',
        },
        showHandle: DRAWER_STYLES.tier1.showHandle,
        backdropOpacity: `${Math.round(DRAWER_STYLES.backdrop.opacity * 100)}`,
      };
    }
    case 'tier2': {
      const cornerRadius = radius(DRAWER_STYLES.tier2.cornerRadius);
      return {
        style: 'glassy',
        customBackground: DRAWER_STYLES.tier2.background,
        customBorderRadius: cornerRadius
          ? {
              topLeft: cornerRadius,
              topRight: cornerRadius,
              bottomLeft: cornerRadius,
              bottomRight: cornerRadius,
            }
          : undefined,
        customShadow: DRAWER_STYLES.shadow.value,
        customBlur: `${DRAWER_STYLES.tier2.headerBlur ?? DRAWER_STYLES.backdrop.blur}px`,
        customBorder: {
          color: DRAWER_STYLES.darkMode.border,
          thickness: '1px',
        },
      };
    }
    case 'tier3': {
      return {
        style: 'solid',
        customBackground: DRAWER_STYLES.tier3.background,
        customShadow: DRAWER_STYLES.shadow.value,
        customBlur: `${DRAWER_STYLES.backdrop.blur}px`,
        customBorder: {
          color: DRAWER_STYLES.darkMode.border,
          thickness: '1px',
        },
      };
    }
    default:
      return {};
  }
}
