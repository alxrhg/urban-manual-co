import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ContextStack } from '@/components/design-system/homepage/ContextStack';
import { IntentChipGroup } from '@/components/design-system/homepage/IntentChipGroup';
import { SearchField } from '@/components/design-system/homepage/SearchField';
import { type ExtractedIntent } from '@/app/api/intent/schema';

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

runTest('ContextStack renders session resume content', () => {
  const markup = renderToStaticMarkup(
    <ContextStack
      renderSession={() => <div role="status">Resume session</div>}
      renderContext={() => <div>Context</div>}
    >
      <div>Hero</div>
    </ContextStack>
  );
  assert.ok(markup.includes('Resume session'));
  assert.ok(markup.includes('Context'));
  assert.ok(markup.includes('Hero'));
});

runTest('IntentChipGroup renders chips when intent is provided', () => {
  const intent: ExtractedIntent = {
    primaryIntent: 'discover',
    city: 'Tokyo',
    category: 'restaurant',
    queryComplexity: 'simple',
  } as ExtractedIntent;

  const markup = renderToStaticMarkup(
    <IntentChipGroup intent={intent} heading="Intent summary" />
  );

  assert.ok(markup.includes('Intent summary'));
  assert.ok(markup.includes('Discover'));
  assert.ok(markup.includes('Tokyo'));
});

runTest('SearchField shows pending indicator when searching', () => {
  const markup = renderToStaticMarkup(
    <SearchField label="Search" pending value="Sushi" readOnly />
  );

  assert.ok(markup.includes('aria-busy="true"'));
  assert.ok(markup.includes('Sushi'));
});
