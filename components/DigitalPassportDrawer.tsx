'use client';

import { useDrawer } from '@/contexts/DrawerContext';
import { Drawer } from '@/components/ui/Drawer';
import DigitalPassportDrawerContent from '@/components/drawers/DigitalPassportDrawer';

/**
 * Digital Passport Drawer - Wrapper component using legacy DrawerContext
 * Visualizes visited countries as stamps in a digital passport
 */
export function DigitalPassportDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('passport');

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer} position="right">
      <DigitalPassportDrawerContent isOpen={isOpen} onClose={closeDrawer} />
    </Drawer>
  );
}
