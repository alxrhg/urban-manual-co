'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { CMSBlock, Breakpoint, BlockStyles, CSSProperties } from '@/types/cms';
import { usePageBuilder } from '@/contexts/PageBuilderContext';

interface BlockRendererProps {
  block: CMSBlock;
  breakpoint: Breakpoint;
  isEditing?: boolean;
  isPreview?: boolean;
}

// Merge responsive styles based on breakpoint
function getResponsiveStyles(styles: BlockStyles, breakpoint: Breakpoint): CSSProperties {
  // Apply styles in order: desktop (base) -> tablet -> mobile
  const breakpointOrder: Breakpoint[] = ['desktop', 'tablet', 'mobile', 'wide'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  let mergedStyles: CSSProperties = {};

  // Start from desktop and merge down to current breakpoint
  for (let i = 0; i <= currentIndex; i++) {
    const bp = breakpointOrder[i];
    if (styles[bp as keyof BlockStyles]) {
      mergedStyles = { ...mergedStyles, ...styles[bp as keyof BlockStyles] };
    }
  }

  return mergedStyles;
}

// Convert style object to React CSS properties
function toReactStyles(styles: CSSProperties): React.CSSProperties {
  return styles as React.CSSProperties;
}

export function BlockRenderer({ block, breakpoint, isEditing, isPreview }: BlockRendererProps) {
  const { getChildBlocks, selectBlock, hoverBlock, state } = usePageBuilder();

  const responsiveStyles = getResponsiveStyles(block.styles, breakpoint);
  const props = block.props as Record<string, unknown>;

  // Render based on block type
  switch (block.type) {
    case 'container': {
      const children = getChildBlocks(block.id);
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
            ...toReactStyles(responsiveStyles),
          }}
        >
          {children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              breakpoint={breakpoint}
              isEditing={false}
            />
          ))}
          {children.length === 0 && !isPreview && (
            <div className="min-h-[100px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Drop blocks here
            </div>
          )}
        </div>
      );
    }

    case 'section': {
      const children = getChildBlocks(block.id);
      const background = (props.background as string) || 'transparent';
      const padding = props.padding as { y?: number } | undefined;
      const fullWidth = props.fullWidth as boolean;

      return (
        <section
          style={{
            background,
            padding: padding ? `${padding.y || 0}px 0` : undefined,
            width: fullWidth ? '100%' : undefined,
            ...toReactStyles(responsiveStyles),
          }}
        >
          {children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              breakpoint={breakpoint}
              isEditing={false}
            />
          ))}
          {children.length === 0 && !isPreview && (
            <div className="min-h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Drop blocks here
            </div>
          )}
        </section>
      );
    }

    case 'columns': {
      const children = getChildBlocks(block.id);
      const columns = (props.columns as number) || 2;
      const gap = (props.gap as number) || 24;
      const responsive = props.responsive as Record<string, number> | undefined;

      const columnCount = responsive?.[breakpoint] ?? columns;

      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: `${gap}px`,
            ...toReactStyles(responsiveStyles),
          }}
        >
          {children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              breakpoint={breakpoint}
              isEditing={false}
            />
          ))}
          {children.length === 0 && !isPreview && (
            <>
              {Array.from({ length: columnCount }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[100px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm"
                >
                  Column {i + 1}
                </div>
              ))}
            </>
          )}
        </div>
      );
    }

    case 'grid': {
      const children = getChildBlocks(block.id);
      const columnsConfig = props.columns as Record<string, number> | undefined;
      const gap = (props.gap as number) || 24;

      const columnCount = columnsConfig?.[breakpoint] ?? columnsConfig?.desktop ?? 3;

      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: `${gap}px`,
            ...toReactStyles(responsiveStyles),
          }}
        >
          {children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              breakpoint={breakpoint}
              isEditing={false}
            />
          ))}
          {children.length === 0 && !isPreview && (
            <div className="col-span-full min-h-[100px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Drop cards here
            </div>
          )}
        </div>
      );
    }

    case 'heading': {
      const text = (props.text as string) || 'Heading';
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

      const headingContent = isEditing ? (
        <span className="outline-none" contentEditable suppressContentEditableWarning>
          {text}
        </span>
      ) : (
        text
      );

      const headingProps = {
        className: `${sizeClasses[level]} text-gray-900 dark:text-white`,
        style: { textAlign: align as 'left' | 'center' | 'right', ...toReactStyles(responsiveStyles) },
      };

      switch (level) {
        case 1: return <h1 {...headingProps}>{headingContent}</h1>;
        case 2: return <h2 {...headingProps}>{headingContent}</h2>;
        case 3: return <h3 {...headingProps}>{headingContent}</h3>;
        case 4: return <h4 {...headingProps}>{headingContent}</h4>;
        case 5: return <h5 {...headingProps}>{headingContent}</h5>;
        case 6: return <h6 {...headingProps}>{headingContent}</h6>;
        default: return <h2 {...headingProps}>{headingContent}</h2>;
      }
    }

    case 'text': {
      const content = (props.content as string) || 'Enter your text here...';
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
          className={`${sizeClasses[size]} text-gray-600 dark:text-gray-300 leading-relaxed`}
          style={{ textAlign: align as 'left' | 'center' | 'right' | 'justify', ...toReactStyles(responsiveStyles) }}
        >
          {isEditing ? (
            <span className="outline-none" contentEditable suppressContentEditableWarning>
              {content}
            </span>
          ) : (
            content
          )}
        </p>
      );
    }

    case 'button': {
      const text = (props.text as string) || 'Click me';
      const variant = (props.variant as string) || 'primary';
      const size = (props.size as string) || 'md';
      const url = props.url as string;
      const fullWidth = props.fullWidth as boolean;

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

      const Component = url && !isEditing ? 'a' : 'button';

      return (
        <Component
          href={url}
          className={`
            inline-flex items-center justify-center font-medium rounded-lg
            transition-all duration-200 ease-out
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${fullWidth ? 'w-full' : ''}
          `}
          style={toReactStyles(responsiveStyles)}
        >
          {text}
        </Component>
      );
    }

    case 'image': {
      const src = (props.src as string) || '';
      const alt = (props.alt as string) || '';
      const objectFit = (props.objectFit as string) || 'cover';
      const aspectRatio = (props.aspectRatio as string) || '16/9';
      const rounded = (props.rounded as string) || 'lg';

      const roundedClasses: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
      };

      if (!src) {
        return (
          <div
            className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 ${roundedClasses[rounded]}`}
            style={{ aspectRatio, ...toReactStyles(responsiveStyles) }}
          >
            <span className="text-sm">Select an image</span>
          </div>
        );
      }

      return (
        <div
          className={`relative overflow-hidden ${roundedClasses[rounded]}`}
          style={{ aspectRatio, ...toReactStyles(responsiveStyles) }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className={`object-${objectFit}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      );
    }

    case 'hero': {
      const title = (props.title as string) || 'Welcome';
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
          className="relative flex flex-col justify-center px-8"
          style={{
            height,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...toReactStyles(responsiveStyles),
          }}
        >
          {/* Overlay */}
          {backgroundImage && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlay }}
            />
          )}

          {/* Content */}
          <div className={`relative z-10 max-w-4xl mx-auto flex flex-col ${alignClasses[align]}`}>
            <motion.h1
              className="text-4xl md:text-6xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                className="text-xl md:text-2xl text-white/80 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {subtitle}
              </motion.p>
            )}
            {cta && (
              <motion.a
                href={cta.url}
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {cta.text}
              </motion.a>
            )}
          </div>
        </div>
      );
    }

    case 'card': {
      const title = (props.title as string) || 'Card Title';
      const description = (props.description as string) || '';
      const image = props.image as string;
      const url = props.url as string;
      const badge = props.badge as string;

      const CardWrapper = url && !isEditing ? 'a' : 'div';

      return (
        <CardWrapper
          href={url}
          className="group block bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300"
          style={toReactStyles(responsiveStyles)}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
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
      const spacerHeight = heightConfig?.[breakpoint] ?? heightConfig?.desktop ?? 64;

      return (
        <div
          style={{ height: spacerHeight, ...toReactStyles(responsiveStyles) }}
          className={isEditing ? 'bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700' : ''}
        />
      );
    }

    case 'divider': {
      const color = (props.color as string) || '#E5E5E5';
      const thickness = (props.thickness as number) || 1;
      const dividerStyle = (props.style as string) || 'solid';

      return (
        <hr
          style={{
            border: 'none',
            borderTop: `${thickness}px ${dividerStyle} ${color}`,
            ...toReactStyles(responsiveStyles),
          }}
        />
      );
    }

    case 'accordion': {
      const items = (props.items as Array<{ title: string; content: string }>) || [];

      return (
        <div className="space-y-2" style={toReactStyles(responsiveStyles)}>
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
          {items.length === 0 && (
            <div className="p-4 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Add accordion items in the properties panel
            </div>
          )}
        </div>
      );
    }

    case 'tabs': {
      const items = (props.items as Array<{ label: string; content: string }>) || [];
      const [activeTab, setActiveTab] = React.useState(0);

      return (
        <div style={toReactStyles(responsiveStyles)}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === index
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {items[activeTab]?.content || (
              <span className="text-gray-400 text-sm">Add tab items in the properties panel</span>
            )}
          </div>
        </div>
      );
    }

    case 'code': {
      const code = (props.code as string) || '';
      const language = (props.language as string) || 'javascript';

      return (
        <pre
          className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono"
          style={toReactStyles(responsiveStyles)}
        >
          <code>{code || '// Enter your code here'}</code>
        </pre>
      );
    }

    // Domain-specific blocks - placeholders for now
    case 'destination-card':
    case 'destination-grid':
    case 'city-showcase':
    case 'collection-preview': {
      return (
        <div
          className="p-8 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center"
          style={toReactStyles(responsiveStyles)}
        >
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {block.type} block - Configure in properties panel
          </span>
        </div>
      );
    }

    default:
      return (
        <div
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          style={toReactStyles(responsiveStyles)}
        >
          <span className="text-red-600 dark:text-red-400 text-sm">
            Unknown block type: {block.type}
          </span>
        </div>
      );
  }
}
