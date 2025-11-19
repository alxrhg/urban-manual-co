import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as navigation from 'next/navigation';

import {
  NoResultsEmptyState,
  NoSavedPlacesEmptyState,
  NoVisitedPlacesEmptyState,
  TripsEmptyState,
} from '@/components/EmptyStates';

(navigation as any).useRouter = () => ({
  push: () => {},
  refresh: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => Promise.resolve(),
});

const findOrder = (html: string, labels: string[]) =>
  labels.map(label => html.indexOf(label));

describe('Empty states', () => {
  it('keeps primary and secondary actions ordered for saved places', () => {
    const html = renderToStaticMarkup(<NoSavedPlacesEmptyState />);
    const [primaryIndex, secondaryIndex] = findOrder(html, [
      'Browse top cities',
      'Import a Google trip',
    ]);

    assert.ok(primaryIndex >= 0, 'Primary action should render');
    assert.ok(secondaryIndex >= 0, 'Secondary action should render');
    assert.ok(
      primaryIndex < secondaryIndex,
      'Primary action should appear before secondary action for focus order',
    );
  });

  it('keeps primary and secondary actions ordered for visited places', () => {
    const html = renderToStaticMarkup(<NoVisitedPlacesEmptyState />);
    const [primaryIndex, secondaryIndex] = findOrder(html, [
      'Log a recent visit',
      'Import a Google trip',
    ]);

    assert.ok(primaryIndex >= 0, 'Primary action should render');
    assert.ok(secondaryIndex >= 0, 'Secondary action should render');
    assert.ok(
      primaryIndex < secondaryIndex,
      'Primary action should appear before secondary action for focus order',
    );
  });

  it('exposes contextual actions for trips empty states', () => {
    const html = renderToStaticMarkup(
      <TripsEmptyState onCreateTrip={() => {}} onImportTrip={() => {}} />,
    );

    const [primaryIndex, secondaryIndex] = findOrder(html, [
      'Plan a new trip',
      'Import a Google trip',
    ]);

    assert.ok(primaryIndex >= 0);
    assert.ok(secondaryIndex >= 0);
    assert.ok(primaryIndex < secondaryIndex);
    assert.match(html, /organizing your next adventure/i);
  });

  it('renders actionable search empty state', () => {
    const html = renderToStaticMarkup(
      <NoResultsEmptyState searchTerm="matcha" onTryNearby={() => {}} />,
    );

    const [primaryIndex, secondaryIndex] = findOrder(html, [
      'Try nearby filters',
      'Browse top cities',
    ]);

    assert.ok(primaryIndex >= 0);
    assert.ok(secondaryIndex >= 0);
    assert.ok(primaryIndex < secondaryIndex);
    assert.match(html, /No places match "matcha"/);
  });
});
