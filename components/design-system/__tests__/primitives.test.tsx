import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CardShell,
  Section,
  SectionDescription,
  SectionHeader,
  Surface,
  PillButton,
  IconButton,
  cardShellClasses,
} from '..';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('design system primitives', () => {
  it('applies canonical spacing to Section', () => {
    const html = render(
      <Section>
        <div />
      </Section>
    );
    assert.ok(html.includes('py-[var(--um-section-space-y)]'));
    assert.ok(html.includes('px-4'));
  });

  it('renders section header and description tokens', () => {
    const header = render(<SectionHeader>Title</SectionHeader>);
    assert.ok(header.includes('tracking-tight'));
    const description = render(<SectionDescription>Body</SectionDescription>);
    assert.ok(description.includes('text-um-muted'));
  });

  it('renders surface with shared radius and border tokens', () => {
    const html = render(<Surface />);
    assert.ok(html.includes('rounded-[var(--um-radius-lg)]'));
    assert.ok(html.includes('border-um-border'));
  });

  it('exposes pill and icon buttons with hover states', () => {
    const pill = render(<PillButton>Explore</PillButton>);
    assert.ok(pill.includes('rounded-full'));
    assert.ok(pill.includes('bg-um-pill'));

    const icon = render(<IconButton aria-label="Open" />);
    assert.ok(icon.includes('h-10'));
    assert.ok(icon.includes('bg-um-surface'));
  });

  it('keeps card shell classes synced with exported constants', () => {
    assert.ok(cardShellClasses.wrapper.includes('group'));
    assert.ok(cardShellClasses.media.includes('aspect-'));
    assert.ok(cardShellClasses.title.includes('line-clamp-2'));
    assert.ok(cardShellClasses.meta.includes('text-xs'));

    const html = render(
      <CardShell>
        <div className={cardShellClasses.media} />
        <p className={cardShellClasses.title}>Headline</p>
        <div className={cardShellClasses.meta}>Meta</div>
      </CardShell>
    );
    assert.ok(html.includes(cardShellClasses.wrapper.split(' ')[0]!));
    assert.ok(html.includes('rounded-[var(--um-radius-lg)]'));
  });
});
