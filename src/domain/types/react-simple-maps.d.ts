declare module 'react-simple-maps' {
  import { ReactNode } from 'react';

  export interface GeographyData {
    type: string;
    properties: {
      ISO_A2?: string;
      ISO_A2_EH?: string;
      NAME?: string;
      NAME_LONG?: string;
      NAME_EN?: string;
      [key: string]: unknown;
    };
    geometry: unknown;
    rsmKey?: string;
    svgPath?: string;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
    };
    className?: string;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children?: (args: {
      geographies: GeographyData[];
    }) => ReactNode;
  }

  export interface GeographyProps {
    geography?: GeographyData;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    className?: string;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    children?: ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
}

