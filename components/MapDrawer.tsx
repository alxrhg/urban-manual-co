'use client';

import React, { ReactNode } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { Map } from 'lucide-react';

interface MapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function MapDrawer({ isOpen, onClose, title = 'Map View', children }: MapDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} mobileVariant="bottom" mobileHeight="40vh">
      <DrawerHeader
        title={title}
        leftAccessory={<Map className="h-5 w-5 text-gray-500" />}
      />

      <div className="overflow-y-auto max-h-[calc(40vh-4rem)]">
        <DrawerSection>
          {children}
        </DrawerSection>
      </div>
    </Drawer>
  );
}
