import type { CSSProperties } from "react";

export const GRID_TOKENS = {
  columns: 12,
  gapX: {
    base: "1.25rem",
    lg: "1.75rem",
  },
  gapY: {
    base: "1.25rem",
    lg: "1.5rem",
  },
  cardPadding: {
    sm: "1rem",
    base: "1.25rem",
    lg: "1.75rem",
  },
  cardRadius: "1.25rem",
  cardBorder: "1px solid rgba(15,23,42,0.14)",
  gridlineColor: "rgba(148,163,184,0.25)",
  gridlineSize: "64px",
  font: {
    label: "text-[0.7rem] tracking-[0.2em] uppercase font-semibold text-slate-500 dark:text-slate-400",
    title: "text-3xl font-semibold tracking-tight text-slate-900 dark:text-white",
  },
};

export const GRID_CSS_VARIABLES: CSSProperties = {
  "--admin-grid-gap-x": GRID_TOKENS.gapX.base,
  "--admin-grid-gap-y": GRID_TOKENS.gapY.base,
  "--admin-grid-card-padding": GRID_TOKENS.cardPadding.base,
  "--admin-grid-card-padding-sm": GRID_TOKENS.cardPadding.sm,
  "--admin-grid-card-padding-lg": GRID_TOKENS.cardPadding.lg,
  "--admin-grid-card-radius": GRID_TOKENS.cardRadius,
  "--admin-gridline-size": GRID_TOKENS.gridlineSize,
  "--admin-gridline-color": GRID_TOKENS.gridlineColor,
};
