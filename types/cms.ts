// CMS Page Builder Types
// Framer-like visual editor type definitions

// =====================================================
// CORE TYPES
// =====================================================

export type PageStatus = 'draft' | 'published' | 'archived';
export type BlockCategory = 'layout' | 'content' | 'media' | 'interactive' | 'utility' | 'domain';
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

// Responsive value helper
export interface ResponsiveValue<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}

// Spacing/padding/margin
export interface SpacingValue {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  x?: number;
  y?: number;
}

// =====================================================
// PAGE
// =====================================================

export interface CMSPage {
  id: string;
  slug: string;
  name: string;
  title?: string;
  description?: string;
  meta_image?: string;
  status: PageStatus;
  is_homepage: boolean;
  layout_config: PageLayoutConfig;
  seo_config: SEOConfig;
  created_at: string;
  updated_at: string;
  published_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface PageLayoutConfig {
  maxWidth: string;
  padding: SpacingValue;
  gap: number;
  background?: string;
}

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
  canonical?: string;
}

// =====================================================
// BLOCK
// =====================================================

export interface CMSBlock {
  id: string;
  page_id: string;
  parent_id?: string;
  type: string;
  name?: string;
  props: Record<string, unknown>;
  styles: BlockStyles;
  position: number;
  is_locked: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // Runtime only
  children?: CMSBlock[];
}

export interface BlockStyles {
  desktop: CSSProperties;
  tablet: CSSProperties;
  mobile: CSSProperties;
  wide?: CSSProperties;
}

export interface CSSProperties {
  // Layout
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number | string;
  gridTemplateColumns?: string;

  // Spacing
  margin?: SpacingValue | string;
  padding?: SpacingValue | string;

  // Sizing
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  aspectRatio?: string;

  // Position
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;

  // Background
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;

  // Border
  border?: string;
  borderRadius?: string;
  borderWidth?: number | string;
  borderColor?: string;
  borderStyle?: string;

  // Typography
  color?: string;
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string | number;
  textAlign?: string;
  textTransform?: string;
  letterSpacing?: string;

  // Effects
  opacity?: number;
  boxShadow?: string;
  transform?: string;
  transition?: string;
  filter?: string;
  backdropFilter?: string;

  // Overflow
  overflow?: string;
  overflowX?: string;
  overflowY?: string;

  // Other
  cursor?: string;
  pointerEvents?: string;
  userSelect?: string;
}

// =====================================================
// BLOCK DEFINITION (Registry)
// =====================================================

export interface BlockDefinition {
  type: string;
  label: string;
  description?: string;
  icon: string;
  category: BlockCategory;
  props_schema: JSONSchema;
  default_props: Record<string, unknown>;
  default_styles?: BlockStyles;
  supports_children: boolean;
  max_children?: number;
  allowed_children?: string[];
  is_builtin: boolean;
  created_at: string;
}

// Simplified JSON Schema for prop validation
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
}

export interface JSONSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
}

// =====================================================
// VERSION HISTORY
// =====================================================

export interface PageVersion {
  id: string;
  page_id: string;
  version_number: number;
  snapshot: PageSnapshot;
  change_description?: string;
  created_at: string;
  created_by?: string;
}

export interface PageSnapshot {
  page: CMSPage;
  blocks: CMSBlock[];
}

// =====================================================
// TEMPLATES
// =====================================================

export interface CMSTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: 'page' | 'section' | 'block';
  snapshot: PageSnapshot | CMSBlock[];
  is_public: boolean;
  created_at: string;
  created_by?: string;
}

// =====================================================
// ASSETS
// =====================================================

export interface CMSAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'font';
  mime_type?: string;
  size?: number;
  width?: number;
  height?: number;
  alt_text?: string;
  metadata: Record<string, unknown>;
  folder: string;
  created_at: string;
  created_by?: string;
}

// =====================================================
// DESIGN TOKENS
// =====================================================

export interface DesignTokens {
  id: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: Record<string, string>;
  breakpoints: Record<Breakpoint, string>;
  shadows: Record<string, string>;
  borders: BorderTokens;
  updated_at: string;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  [key: string]: string;
}

export interface TypographyTokens {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: Record<string, string>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, number>;
}

export interface BorderTokens {
  radius: Record<string, string>;
}

// =====================================================
// EDITOR STATE
// =====================================================

export interface EditorState {
  page: CMSPage | null;
  blocks: CMSBlock[];
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  draggedBlockId: string | null;
  breakpoint: Breakpoint;
  zoom: number;
  showGrid: boolean;
  showOutlines: boolean;
  isPreviewing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  clipboard: CMSBlock | null;
}

export interface HistoryEntry {
  blocks: CMSBlock[];
  timestamp: number;
  action: string;
}

// =====================================================
// EDITOR ACTIONS
// =====================================================

export type EditorAction =
  | { type: 'SET_PAGE'; payload: CMSPage }
  | { type: 'SET_BLOCKS'; payload: CMSBlock[] }
  | { type: 'SELECT_BLOCK'; payload: string | null }
  | { type: 'HOVER_BLOCK'; payload: string | null }
  | { type: 'ADD_BLOCK'; payload: { block: CMSBlock; parentId?: string; index?: number } }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; updates: Partial<CMSBlock> } }
  | { type: 'DELETE_BLOCK'; payload: string }
  | { type: 'MOVE_BLOCK'; payload: { id: string; parentId?: string; index: number } }
  | { type: 'DUPLICATE_BLOCK'; payload: string }
  | { type: 'COPY_BLOCK'; payload: string }
  | { type: 'PASTE_BLOCK'; payload: { parentId?: string; index?: number } }
  | { type: 'SET_BREAKPOINT'; payload: Breakpoint }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_OUTLINES' }
  | { type: 'TOGGLE_PREVIEW' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }
  | { type: 'MARK_SAVED' };

// =====================================================
// BLOCK PROPS (Specific block type props)
// =====================================================

// Layout blocks
export interface ContainerProps {
  maxWidth: string;
  padding: SpacingValue;
  align: 'left' | 'center' | 'right';
  background?: string;
}

export interface ColumnsProps {
  columns: number;
  gap: number;
  responsive: ResponsiveValue<number>;
  verticalAlign?: 'top' | 'center' | 'bottom' | 'stretch';
}

export interface GridProps {
  columns: ResponsiveValue<number>;
  gap: number;
  rowGap?: number;
}

export interface SectionProps {
  background: string;
  padding: SpacingValue;
  fullWidth: boolean;
  minHeight?: string;
}

// Content blocks
export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: 'left' | 'center' | 'right';
}

export interface TextProps {
  content: string;
  align: 'left' | 'center' | 'right' | 'justify';
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

export interface ButtonProps {
  text: string;
  url: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  openInNewTab?: boolean;
}

// Media blocks
export interface ImageProps {
  src: string;
  alt: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none';
  aspectRatio?: string;
  rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  caption?: string;
}

export interface VideoProps {
  src: string;
  poster?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls?: boolean;
}

export interface HeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  overlay: number;
  height: string;
  align: 'left' | 'center' | 'right';
  cta?: {
    text: string;
    url: string;
    variant: string;
  };
}

// Interactive blocks
export interface CardProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  badge?: string;
  imagePosition?: 'top' | 'left' | 'right' | 'background';
}

export interface AccordionProps {
  items: Array<{
    title: string;
    content: string;
    defaultOpen?: boolean;
  }>;
  allowMultiple?: boolean;
}

export interface TabsProps {
  items: Array<{
    label: string;
    content: string;
  }>;
  defaultTab?: number;
  variant?: 'line' | 'pill' | 'enclosed';
}

// Utility blocks
export interface SpacerProps {
  height: ResponsiveValue<number>;
}

export interface DividerProps {
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
  width?: string;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers: boolean;
  theme?: 'light' | 'dark';
}

// Domain-specific blocks
export interface DestinationCardProps {
  destinationId?: number;
  destinationSlug?: string;
  variant: 'default' | 'compact' | 'featured';
}

export interface DestinationGridProps {
  filter: {
    city?: string;
    category?: string;
    tags?: string[];
  };
  limit: number;
  columns: ResponsiveValue<number>;
  showFilters?: boolean;
}

export interface CityShowcaseProps {
  city: string;
  showMap: boolean;
  limit: number;
  showDescription?: boolean;
}

export interface CollectionPreviewProps {
  collectionId?: string;
  title?: string;
  showAll: boolean;
  limit?: number;
}

// =====================================================
// PROP EDITOR TYPES
// =====================================================

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'url'
  | 'richtext'
  | 'code'
  | 'spacing'
  | 'responsive'
  | 'array'
  | 'object'
  | 'icon'
  | 'destination'
  | 'collection';

export interface PropEditorConfig {
  key: string;
  type: PropType;
  label: string;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  required?: boolean;
  group?: string;
  condition?: (props: Record<string, unknown>) => boolean;
}
