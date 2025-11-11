export type LayoutWidthPreset = 'narrow' | 'standard' | 'wide';

export const LAYOUT_MAX_WIDTHS: Record<LayoutWidthPreset, string> = {
  narrow: 'max-w-[960px]',
  standard: 'max-w-[1280px]',
  wide: 'max-w-[1800px]',
};

export const SITE_MAX_WIDTH_CLASS = LAYOUT_MAX_WIDTHS.wide;
