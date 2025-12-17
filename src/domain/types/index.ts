// Domain Types - Re-exported from src/domain/types

export * from "./destination";
export * from "./trip";
export * from "./architecture";
export * from "./achievement";
export * from "./common";
// Explicitly re-export database types excluding duplicates with common.ts
export {
  type UserSavedDestination,
  type UserVisitedDestination,
  type DestinationUserStatus
} from "./database";
export * from "./discovery";
export * from "./mem0";
// Explicitly re-export personalization types excluding Collection (already in common.ts)
export {
  type HomeBase,
  type UserProfile,
  type SavedDestination,
  type VisitHistory,
  type UserInteraction,
  type PersonalizationScore,
  type PersonalizationInsights
} from "./personalization";
