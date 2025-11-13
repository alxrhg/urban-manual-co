import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import axe from 'axe-core';

import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { AddToTripModal } from '@/components/AddToTripModal';
import {
  __setAuthContextOverrideForTests,
  type AuthContextType,
} from '@/contexts/AuthContext';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

const { window } = dom;

function setGlobal(name: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  } catch {
    try {
      // Attempt to remove existing descriptor before redefining
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as any)[name];
      Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
      });
    } catch {
      (globalThis as any)[name] = value;
    }
  }
}

function setupGlobals() {
  const win = window as unknown as Window & typeof globalThis;
  setGlobal('window', win);
  setGlobal('document', win.document);
  setGlobal('navigator', win.navigator);
  setGlobal('HTMLElement', win.HTMLElement);
  setGlobal('Element', win.Element);
  setGlobal('Node', win.Node);
  setGlobal('SVGElement', win.SVGElement);
  setGlobal('NodeFilter', win.NodeFilter);
  setGlobal('getComputedStyle', win.getComputedStyle.bind(win));
  setGlobal('MutationObserver', win.MutationObserver);
  setGlobal(
    'requestAnimationFrame',
    win.requestAnimationFrame ||
      ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16))
  );
  setGlobal(
    'cancelAnimationFrame',
    win.cancelAnimationFrame ||
      ((id: number) => clearTimeout(id))
  );
  setGlobal(
    'matchMedia',
    win.matchMedia ||
      ((query: string) => ({
        matches: false,
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }))
  );
  setGlobal(
    'ResizeObserver',
    win.ResizeObserver ||
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
  );
  setGlobal('alert', () => {});
  setGlobal('crypto', win.crypto);
}

setupGlobals();
process.env.NODE_ENV = 'test';

const authStub: AuthContextType = {
  user: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
};

__setAuthContextOverrideForTests(authStub);

const mountedRoots = new Map<HTMLElement, Root>();

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.set(container, root);
  root.render(ui);
  return { container };
}

function cleanup() {
  for (const [container, root] of mountedRoots.entries()) {
    root.unmount();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    mountedRoots.delete(container);
  }
}

async function waitForUpdates() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function assertNoViolations(name: string, element: React.ReactElement) {
  const { container } = render(element);
  try {
    await waitForUpdates();
    const results = await axe.run(container, {
      reporter: 'v2',
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });

    const formatted = results.violations
      .map(violation => {
        const nodes = violation.nodes
          .map(node => `    - ${node.target.join(' ')}`)
          .join('\n');
        return `${violation.id}: ${violation.help}\n${nodes}`;
      })
      .join('\n');

    assert.equal(
      results.violations.length,
      0,
      formatted ? `Axe detected violations in ${name}:\n${formatted}` :
        `Axe detected violations in ${name}`,
    );

    console.log(`✓ ${name} has no detectable axe violations`);
  } finally {
    cleanup();
  }
}

async function run() {
  const sharedProps = { isOpen: true, onClose: () => {} };

  await assertNoViolations(
    'SaveDestinationModal',
    <SaveDestinationModal
      destinationId={123}
      destinationSlug="test-destination"
      {...sharedProps}
    />
  );

  await assertNoViolations(
    'VisitedModal',
    <VisitedModal
      destinationSlug="test-destination"
      destinationName="Test Destination"
      {...sharedProps}
    />
  );

  await assertNoViolations(
    'AddToTripModal',
    <AddToTripModal
      destinationSlug="test-destination"
      destinationName="Test Destination"
      {...sharedProps}
    />
  );

  __setAuthContextOverrideForTests(null);
  console.log('Accessibility smoke tests completed successfully');
}

run().catch(error => {
  cleanup();
  console.error('Accessibility smoke tests failed');
  console.error(error);
  __setAuthContextOverrideForTests(null);
  process.exit(1);
});
