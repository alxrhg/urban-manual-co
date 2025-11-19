import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextDrawerState, type DrawerType } from '@/contexts/DrawerContext';

test('opening a drawer closes any previously active drawer', () => {
  let state: DrawerType = null;

  state = getNextDrawerState(state, { type: 'open', drawer: 'account' });
  assert.equal(state, 'account');

  state = getNextDrawerState(state, { type: 'open', drawer: 'trips' });
  assert.equal(state, 'trips');
});

test('toggling an open drawer closes it', () => {
  const closedState = getNextDrawerState('saved-places', {
    type: 'toggle',
    drawer: 'saved-places',
  });

  assert.equal(closedState, null);
});

test('toggling switches focus between drawers', () => {
  const nextState = getNextDrawerState('visited-places', {
    type: 'toggle',
    drawer: 'settings',
  });

  assert.equal(nextState, 'settings');
});

test('close action always returns null', () => {
  assert.equal(getNextDrawerState('trips', { type: 'close' }), null);
});
