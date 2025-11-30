import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CMSPage, CMSBlock, BlockStyles, CSSProperties, Breakpoint } from '@/types/cms';

interface CMSPageRendererProps {
  page: CMSPage;
  blocks: CMSBlock[];
}

export function CMSPageRenderer({ page, blocks }: CMSPageRendererProps) {
  const layoutConfig = page.layout_config;

  // Build block tree (nested structure)
  const rootBlocks = blocks
    .filter((b) => !b.parent_id && !b.is_hidden)
    .sort((a, b) => a.position - b.position);

  const getChildBlocks = (parentId: string) =>
    blocks
      .filter((b) => b.parent_id === parentId && !b.is_hidden)
      .sort((a, b) => a.position - b.position);

  return (
    <main
      className="min-h-screen"
      style={{
        maxWidth: layoutConfig.maxWidth,
        margin: '0 auto',
        padding: layoutConfig.padding
          ? `${layoutConfig.padding.y || 0}px ${layoutConfig.padding.x || 0}px`
          : undefined,
      }}
    >
      {rootBlocks.map((block) => (
        <PublicBlockRenderer
          key={block.id}
          block={block}
          getChildBlocks={getChildBlocks}
        />
      ))}
    </main>
  );
}

interface PublicBlockRendererProps {
  block: CMSBlock;
  getChildBlocks: (parentId: string) => CMSBlock[];
}

function PublicBlockRenderer({ block, getChildBlocks }: PublicBlockRendererProps) {
  const props = block.props as Record<string, unknown>;
  const children = getChildBlocks(block.id);

  // Combine responsive styles (mobile-first approach)
  const getResponsiveClasses = (styles: BlockStyles) => {
    const classes: string[] = [];
    // This is a simplified approach - in production you'd want CSS custom properties
    // or a more sophisticated responsive system
    return classes.join(' ');
  };

  const inlineStyles = block.styles.desktop as React.CSSProperties || {};

  switch (block.type) {
    case 'container': {
      const maxWidth = (props.maxWidth as string) || '1280px';
      const padding = props.padding as { x?: number; y?: number } | undefined;
      const align = (props.align as string) || 'center';

      return (
        <div
          style={{
            maxWidth,
            margin: align === 'center' ? '0 auto' : undefined,
            marginLeft: align === 'left' ? 0 : undefined,
            marginRight: align === 'right' ? 0 : undefined,
            padding: padding ? `${padding.y || 0}px ${padding.x || 0}px` : undefined,
            ...inlineStyles,
          }}
        >
          {children.map((child) => (
            <PublicBlockRenderer key={child.id} block={child} getChildBlocks={getChildBlocks} />
          ))}
        </div>
      );
    }

    case 'section': {
      const background = (props.background as string) || 'transparent';
      const padding = props.padding as { y?: number } | undefined;
      const fullWidth = props.fullWidth as boolean;

      return (
        <section
          style={{
            background,
            padding: padding ? `${padding.y || 0}px 0` : undefined,
            width: fullWidth ? '100vw' : undefined,
            marginLeft: fullWidth ? 'calc(-50vw + 50%)' : undefined,
            ...inlineStyles,
          }}
        >
          <div className="max-w-7xl mx-auto px-4">
            {children.map((child) => (
              <PublicBlockRenderer key={child.id} block={child} getChildBlocks={getChildBlocks} />
            ))}
          </div>
        </section>
      );
    }

    case 'columns': {
      const columns = (props.columns as number) || 2;
      const gap = (props.gap as number) || 24;
      const responsive = props.responsive as Record<string, number> | undefined;

      return (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
            ...inlineStyles,
          }}
        >
          {children.map((child) => (
            <PublicBlockRenderer key={child.id} block={child} getChildBlocks={getChildBlocks} />
          ))}
        </div>
      );
    }

    case 'grid': {
      const columnsConfig = props.columns as Record<string, number> | undefined;
      const gap = (props.gap as number) || 24;
      const columnCount = columnsConfig?.desktop ?? 3;

      return (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: `${gap}px`,
            ...inlineStyles,
          }}
        >
          {children.map((child) => (
            <PublicBlockRenderer key={child.id} block={child} getChildBlocks={getChildBlocks} />
          ))}
        </div>
      );
    }

    case 'heading': {
      const text = (props.text as string) || '';
      const level = (props.level as number) || 2;
      const align = (props.align as string) || 'left';

      const sizeClasses: Record<number, string> = {
        1: 'text-4xl md:text-5xl font-bold',
        2: 'text-3xl md:text-4xl font-bold',
        3: 'text-2xl md:text-3xl font-semibold',
        4: 'text-xl md:text-2xl font-semibold',
        5: 'text-lg md:text-xl font-medium',
        6: 'text-base md:text-lg font-medium',
      };

      const headingProps = {
        className: `${sizeClasses[level]} text-gray-900 dark:text-white mb-4`,
        style: { textAlign: align as 'left' | 'center' | 'right', ...inlineStyles },
      };

      switch (level) {
        case 1: return <h1 {...headingProps}>{text}</h1>;
        case 2: return <h2 {...headingProps}>{text}</h2>;
        case 3: return <h3 {...headingProps}>{text}</h3>;
        case 4: return <h4 {...headingProps}>{text}</h4>;
        case 5: return <h5 {...headingProps}>{text}</h5>;
        case 6: return <h6 {...headingProps}>{text}</h6>;
        default: return <h2 {...headingProps}>{text}</h2>;
      }
    }

    case 'text': {
      const content = (props.content as string) || '';
      const align = (props.align as string) || 'left';
      const size = (props.size as string) || 'base';

      const sizeClasses: Record<string, string> = {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
      };

      return (
        <p
          className={`${sizeClasses[size]} text-gray-600 dark:text-gray-300 leading-relaxed mb-4`}
          style={{ textAlign: align as 'left' | 'center' | 'right' | 'justify', ...inlineStyles }}
        >
          {content}
        </p>
      );
    }

    case 'button': {
      const text = (props.text as string) || 'Click me';
      const variant = (props.variant as string) || 'primary';
      const size = (props.size as string) || 'md';
      const url = (props.url as string) || '#';
      const fullWidth = props.fullWidth as boolean;
      const openInNewTab = props.openInNewTab as boolean;

      const variantClasses: Record<string, string> = {
        primary: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700',
        outline: 'border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900',
        ghost: 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
      };

      const sizeClasses: Record<string, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      };

      return (
        <Link
          href={url}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          className={`
            inline-flex items-center justify-center font-medium rounded-lg
            transition-all duration-200 ease-out
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${fullWidth ? 'w-full' : ''}
          `}
          style={inlineStyles}
        >
          {text}
        </Link>
      );
    }

    case 'image': {
      const src = (props.src as string) || '';
      const alt = (props.alt as string) || '';
      const objectFit = (props.objectFit as string) || 'cover';
      const aspectRatio = (props.aspectRatio as string) || '16/9';
      const rounded = (props.rounded as string) || 'lg';
      const caption = props.caption as string;

      const roundedClasses: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
      };

      if (!src) return null;

      return (
        <figure className="mb-4" style={inlineStyles}>
          <div
            className={`relative overflow-hidden ${roundedClasses[rounded]}`}
            style={{ aspectRatio }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              className={`object-${objectFit}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {caption && (
            <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'hero': {
      const title = (props.title as string) || '';
      const subtitle = (props.subtitle as string) || '';
      const backgroundImage = props.backgroundImage as string;
      const overlay = (props.overlay as number) ?? 0.4;
      const height = (props.height as string) || '70vh';
      const align = (props.align as string) || 'center';
      const cta = props.cta as { text: string; url: string; variant: string } | undefined;

      const alignClasses: Record<string, string> = {
        left: 'items-start text-left',
        center: 'items-center text-center',
        right: 'items-end text-right',
      };

      return (
        <div
          className="relative flex flex-col justify-center px-8 mb-8"
          style={{
            height,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...inlineStyles,
          }}
        >
          {backgroundImage && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlay }}
            />
          )}
          <div className={`relative z-10 max-w-4xl mx-auto flex flex-col ${alignClasses[align]}`}>
            {title && (
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xl md:text-2xl text-white/80 mb-8">
                {subtitle}
              </p>
            )}
            {cta && (
              <Link
                href={cta.url}
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {cta.text}
              </Link>
            )}
          </div>
        </div>
      );
    }

    case 'card': {
      const title = (props.title as string) || '';
      const description = (props.description as string) || '';
      const image = props.image as string;
      const url = props.url as string;
      const badge = props.badge as string;

      const CardWrapper = url ? Link : 'div';
      const cardProps = url ? { href: url } : {};

      return (
        <CardWrapper
          {...(cardProps as any)}
          className="group block bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
          style={inlineStyles}
        >
          {image && (
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={image}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {badge && (
                <span className="absolute top-3 left-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                  {badge}
                </span>
              )}
            </div>
          )}
          <div className="p-4">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </CardWrapper>
      );
    }

    case 'spacer': {
      const heightConfig = props.height as Record<string, number> | undefined;
      const spacerHeight = heightConfig?.desktop ?? 64;

      return <div style={{ height: spacerHeight, ...inlineStyles }} />;
    }

    case 'divider': {
      const color = (props.color as string) || '#E5E5E5';
      const thickness = (props.thickness as number) || 1;
      const dividerStyle = (props.style as string) || 'solid';

      return (
        <hr
          className="my-8"
          style={{
            border: 'none',
            borderTop: `${thickness}px ${dividerStyle} ${color}`,
            ...inlineStyles,
          }}
        />
      );
    }

    case 'accordion': {
      const items = (props.items as Array<{ title: string; content: string }>) || [];

      return (
        <div className="space-y-2 mb-4" style={inlineStyles}>
          {items.map((item, index) => (
            <details key={index} className="group bg-gray-50 dark:bg-gray-900 rounded-lg">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-gray-900 dark:text-white">
                {item.title}
                <span className="ml-2 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
                {item.content}
              </div>
            </details>
          ))}
        </div>
      );
    }

    case 'code': {
      const code = (props.code as string) || '';
      const language = (props.language as string) || 'javascript';

      return (
        <pre
          className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4"
          style={inlineStyles}
        >
          <code>{code}</code>
        </pre>
      );
    }

    default:
      return null;
  }
}
