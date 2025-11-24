'use client';

import React from 'react';
import DOMPurify from 'dompurify';

interface UntitledUIIconProps {
  name: string;
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

// Validate icon name to prevent path traversal attacks
function isValidIconName(name: string): boolean {
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length < 100;
}

/**
 * Untitled UI Icon Component
 *
 * Renders SVG icons from Untitled UI icon library.
 * SVG content is sanitized using DOMPurify to prevent XSS attacks.
 *
 * To use:
 * 1. Download icons from https://www.untitledui.com/free-icons
 * 2. Place SVG files in public/icons/untitled-ui/ directory
 * 3. Use icon name (without .svg extension) as the `name` prop
 *
 * Example:
 * <UntitledUIIcon name="utensils" className="w-4 h-4" />
 */
export function UntitledUIIcon({
  name,
  className = '',
  size = 16,
  strokeWidth = 1.5
}: UntitledUIIconProps) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Validate icon name to prevent path traversal
    if (!isValidIconName(name)) {
      setError(true);
      return;
    }

    // Load SVG from public directory
    fetch(`/icons/untitled-ui/${name}.svg`)
      .then(res => {
        if (!res.ok) throw new Error('Icon not found');
        return res.text();
      })
      .then(svg => {
        // Sanitize SVG content to prevent XSS attacks
        // Only allow safe SVG elements and attributes
        const sanitizedSvg = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['use'],
          ADD_ATTR: ['xlink:href', 'href'],
        });

        // Parse and modify sanitized SVG to accept className and size
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(sanitizedSvg, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (svgElement) {
          // Set attributes
          svgElement.setAttribute('width', typeof size === 'number' ? `${size}` : size);
          svgElement.setAttribute('height', typeof size === 'number' ? `${size}` : size);
          svgElement.setAttribute('class', className);
          svgElement.setAttribute('stroke-width', strokeWidth.toString());

          // Make stroke and fill currentColor for theming
          svgElement.setAttribute('stroke', 'currentColor');
          svgElement.setAttribute('fill', 'none');

          setSvgContent(svgElement.outerHTML);
        }
      })
      .catch(() => {
        setError(true);
      });
  }, [name, className, size, strokeWidth]);

  if (error) {
    // Fallback: return a simple placeholder
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  if (!svgContent) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: svgContent }} />;
}

