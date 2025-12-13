import { plannerOps } from './plannerOps';
import type {
  TripPatch,
  PatchResult,
  PatchActionType,
  AddBlockPayload,
  RemoveBlockPayload,
  UpdateBlockPayload,
  MoveBlockPayload,
  SetMealPayload,
  AddActivityPayload,
  AssignHotelPayload,
  ReorderDaysPayload,
  FillGapPayload,
  TimeBlock,
  Place,
  SuggestionPatch,
} from './types';
import { createTimeBlock } from './types';

interface Trip {
  days: any[];
  [key: string]: any;
}

// =============================================================================
// Legacy AIAction Support (backwards compatible)
// =============================================================================

interface AIAction {
  type: 'setMeal' | 'addActivity' | 'assignHotel' | 'reorderDays';
  payload: {
    dayIndex?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner';
    place?: Place;
    hotel?: Place;
    newOrder?: number[];
  };
}

/**
 * Apply AI-generated actions to a trip (legacy support)
 * @deprecated Use applyPatch or applyPatches instead
 * @param trip The trip to update
 * @param actions Array of AI actions to apply
 * @returns Updated trip with all actions applied
 */
export function applyAIActions(trip: Trip, actions: AIAction[]): Trip {
  let updated = { ...trip };

  for (const action of actions) {
    const { type, payload } = action;

    switch (type) {
      case 'setMeal':
        if (payload.dayIndex !== undefined && payload.mealType && payload.place) {
          updated = plannerOps.setMeal(
            updated,
            payload.dayIndex,
            payload.mealType,
            payload.place
          );
        }
        break;

      case 'addActivity':
        if (payload.dayIndex !== undefined && payload.place) {
          updated = plannerOps.addActivity(
            updated,
            payload.dayIndex,
            payload.place
          );
        }
        break;

      case 'assignHotel':
        if (payload.dayIndex !== undefined && payload.hotel) {
          updated = plannerOps.assignHotel(
            updated,
            payload.dayIndex,
            payload.hotel
          );
        }
        break;

      case 'reorderDays':
        if (payload.newOrder) {
          updated = plannerOps.reorderDays(updated, payload.newOrder);
        }
        break;
    }
  }

  return updated;
}

// =============================================================================
// New Patch-Based System
// =============================================================================

/**
 * Generate a unique ID for blocks
 */
function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Apply a single patch to a trip
 * @param trip The trip to update
 * @param patch The patch operation to apply
 * @returns Result with updated trip and undo patch
 */
export function applyPatch(trip: Trip, patch: TripPatch): { trip: Trip; result: PatchResult } {
  const updated = { ...trip, days: [...trip.days] };

  try {
    switch (patch.type) {
      case 'addBlock': {
        const payload = patch.payload as AddBlockPayload;
        const day = updated.days[payload.dayIndex];
        if (!day) {
          return { trip, result: { success: false, error: `Day ${payload.dayIndex} not found` } };
        }

        const newBlock = createTimeBlock(
          payload.block.type || 'activity',
          payload.block.title || 'New Activity',
          payload.block.durationMinutes || 60,
          {
            ...payload.block,
            id: payload.block.id || generateBlockId(),
          }
        );

        const blocks = day.blocks || day.items || [];
        let insertIndex = blocks.length;

        if (payload.insertAfterBlockId) {
          const afterIndex = blocks.findIndex((b: any) => b.id === payload.insertAfterBlockId);
          if (afterIndex >= 0) {
            insertIndex = afterIndex + 1;
          }
        }

        const newBlocks = [...blocks];
        newBlocks.splice(insertIndex, 0, newBlock);

        updated.days[payload.dayIndex] = {
          ...day,
          blocks: newBlocks,
          items: newBlocks,
        };

        const undoPatch: TripPatch = {
          type: 'removeBlock',
          payload: {
            dayIndex: payload.dayIndex,
            blockId: newBlock.id,
          } as RemoveBlockPayload,
        };

        return { trip: updated, result: { success: true, undoPatch } };
      }

      case 'removeBlock': {
        const payload = patch.payload as RemoveBlockPayload;
        const day = updated.days[payload.dayIndex];
        if (!day) {
          return { trip, result: { success: false, error: `Day ${payload.dayIndex} not found` } };
        }

        const blocks = day.blocks || day.items || [];
        const blockIndex = blocks.findIndex((b: any) => b.id === payload.blockId);
        if (blockIndex < 0) {
          return { trip, result: { success: false, error: `Block ${payload.blockId} not found` } };
        }

        const removedBlock = blocks[blockIndex];
        const newBlocks = blocks.filter((b: any) => b.id !== payload.blockId);
        const prevBlockId = blockIndex > 0 ? blocks[blockIndex - 1]?.id : undefined;

        updated.days[payload.dayIndex] = {
          ...day,
          blocks: newBlocks,
          items: newBlocks,
        };

        const undoPatch: TripPatch = {
          type: 'addBlock',
          payload: {
            dayIndex: payload.dayIndex,
            block: removedBlock,
            insertAfterBlockId: prevBlockId,
          } as AddBlockPayload,
        };

        return { trip: updated, result: { success: true, undoPatch } };
      }

      case 'updateBlock': {
        const payload = patch.payload as UpdateBlockPayload;
        const day = updated.days[payload.dayIndex];
        if (!day) {
          return { trip, result: { success: false, error: `Day ${payload.dayIndex} not found` } };
        }

        const blocks = day.blocks || day.items || [];
        const blockIndex = blocks.findIndex((b: any) => b.id === payload.blockId);
        if (blockIndex < 0) {
          return { trip, result: { success: false, error: `Block ${payload.blockId} not found` } };
        }

        const originalBlock = { ...blocks[blockIndex] };
        const newBlocks = [...blocks];
        newBlocks[blockIndex] = { ...originalBlock, ...payload.updates };

        updated.days[payload.dayIndex] = {
          ...day,
          blocks: newBlocks,
          items: newBlocks,
        };

        // Create undo patch with original values
        const undoUpdates: Partial<TimeBlock> = {};
        for (const key of Object.keys(payload.updates)) {
          undoUpdates[key as keyof TimeBlock] = originalBlock[key];
        }

        const undoPatch: TripPatch = {
          type: 'updateBlock',
          payload: {
            dayIndex: payload.dayIndex,
            blockId: payload.blockId,
            updates: undoUpdates,
          } as UpdateBlockPayload,
        };

        return { trip: updated, result: { success: true, undoPatch } };
      }

      case 'moveBlock': {
        const payload = patch.payload as MoveBlockPayload;
        const fromDay = updated.days[payload.fromDayIndex];
        const toDay = updated.days[payload.toDayIndex];

        if (!fromDay || !toDay) {
          return { trip, result: { success: false, error: 'Source or destination day not found' } };
        }

        const fromBlocks = fromDay.blocks || fromDay.items || [];
        const blockIndex = fromBlocks.findIndex((b: any) => b.id === payload.blockId);
        if (blockIndex < 0) {
          return { trip, result: { success: false, error: `Block ${payload.blockId} not found` } };
        }

        const movedBlock = fromBlocks[blockIndex];
        const prevBlockId = blockIndex > 0 ? fromBlocks[blockIndex - 1]?.id : undefined;

        // Remove from source day
        const newFromBlocks = fromBlocks.filter((b: any) => b.id !== payload.blockId);
        updated.days[payload.fromDayIndex] = {
          ...fromDay,
          blocks: newFromBlocks,
          items: newFromBlocks,
        };

        // Add to destination day
        const toBlocks = payload.fromDayIndex === payload.toDayIndex
          ? newFromBlocks
          : (toDay.blocks || toDay.items || []);

        let insertIndex = toBlocks.length;
        if (payload.insertAfterBlockId) {
          const afterIndex = toBlocks.findIndex((b: any) => b.id === payload.insertAfterBlockId);
          if (afterIndex >= 0) {
            insertIndex = afterIndex + 1;
          }
        }

        const newToBlocks = [...toBlocks];
        newToBlocks.splice(insertIndex, 0, movedBlock);

        updated.days[payload.toDayIndex] = {
          ...updated.days[payload.toDayIndex],
          blocks: newToBlocks,
          items: newToBlocks,
        };

        const undoPatch: TripPatch = {
          type: 'moveBlock',
          payload: {
            fromDayIndex: payload.toDayIndex,
            toDayIndex: payload.fromDayIndex,
            blockId: payload.blockId,
            insertAfterBlockId: prevBlockId,
          } as MoveBlockPayload,
        };

        return { trip: updated, result: { success: true, undoPatch } };
      }

      case 'setMeal': {
        const payload = patch.payload as SetMealPayload;
        const prevTrip = { ...trip };
        const result = plannerOps.setMeal(
          updated,
          payload.dayIndex,
          payload.mealType,
          payload.place
        );

        // Get the previous meal for undo
        const prevDay = prevTrip.days[payload.dayIndex];
        const prevMeal = prevDay?.meals?.[payload.mealType];

        const undoPatch: TripPatch = prevMeal
          ? {
              type: 'setMeal',
              payload: {
                dayIndex: payload.dayIndex,
                mealType: payload.mealType,
                place: prevMeal,
              } as SetMealPayload,
            }
          : {
              type: 'removeBlock',
              payload: {
                dayIndex: payload.dayIndex,
                blockId: `meal_${payload.mealType}`,
              } as RemoveBlockPayload,
            };

        return { trip: result, result: { success: true, undoPatch } };
      }

      case 'addActivity': {
        const payload = patch.payload as AddActivityPayload;
        const result = plannerOps.addActivity(
          updated,
          payload.dayIndex,
          payload.place
        );

        // The new activity ID would be generated by plannerOps
        // For undo, we'd need to track the ID
        const undoPatch: TripPatch = {
          type: 'removeBlock',
          payload: {
            dayIndex: payload.dayIndex,
            blockId: `activity_${payload.place.slug || payload.place.name}`,
          } as RemoveBlockPayload,
        };

        return { trip: result, result: { success: true, undoPatch } };
      }

      case 'assignHotel': {
        const payload = patch.payload as AssignHotelPayload;
        const prevHotel = updated.days[payload.dayIndex]?.hotel;
        const result = plannerOps.assignHotel(
          updated,
          payload.dayIndex,
          payload.hotel
        );

        const undoPatch: TripPatch = prevHotel
          ? {
              type: 'assignHotel',
              payload: {
                dayIndex: payload.dayIndex,
                hotel: prevHotel,
              } as AssignHotelPayload,
            }
          : {
              type: 'removeBlock',
              payload: {
                dayIndex: payload.dayIndex,
                blockId: 'hotel',
              } as RemoveBlockPayload,
            };

        return { trip: result, result: { success: true, undoPatch } };
      }

      case 'reorderDays': {
        const payload = patch.payload as ReorderDaysPayload;
        const prevOrder = updated.days.map((_, i) => i);
        const result = plannerOps.reorderDays(updated, payload.newOrder);

        // Calculate inverse order
        const inverseOrder = new Array(payload.newOrder.length);
        payload.newOrder.forEach((newPos, oldPos) => {
          inverseOrder[newPos] = oldPos;
        });

        const undoPatch: TripPatch = {
          type: 'reorderDays',
          payload: {
            newOrder: inverseOrder,
          } as ReorderDaysPayload,
        };

        return { trip: result, result: { success: true, undoPatch } };
      }

      case 'fillGap': {
        const payload = patch.payload as FillGapPayload;
        const day = updated.days[payload.dayIndex];
        if (!day) {
          return { trip, result: { success: false, error: `Day ${payload.dayIndex} not found` } };
        }

        const newBlock = createTimeBlock(
          payload.blockType,
          payload.place?.name || 'Activity',
          payload.durationMinutes,
          {
            startTime: payload.startTime,
            place: payload.place,
            category: payload.place?.category,
          }
        );

        const blocks = day.blocks || day.items || [];
        let insertIndex = blocks.length;

        if (payload.insertAfterBlockId) {
          const afterIndex = blocks.findIndex((b: any) => b.id === payload.insertAfterBlockId);
          if (afterIndex >= 0) {
            insertIndex = afterIndex + 1;
          }
        }

        const newBlocks = [...blocks];
        newBlocks.splice(insertIndex, 0, newBlock);

        updated.days[payload.dayIndex] = {
          ...day,
          blocks: newBlocks,
          items: newBlocks,
        };

        const undoPatch: TripPatch = {
          type: 'removeBlock',
          payload: {
            dayIndex: payload.dayIndex,
            blockId: newBlock.id,
          } as RemoveBlockPayload,
        };

        return { trip: updated, result: { success: true, undoPatch } };
      }

      default:
        return { trip, result: { success: false, error: `Unknown action type: ${patch.type}` } };
    }
  } catch (error) {
    return {
      trip,
      result: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Apply multiple patches to a trip
 * @param trip The trip to update
 * @param patches Array of patch operations
 * @returns Updated trip and array of undo patches (in reverse order for proper undo)
 */
export function applyPatches(
  trip: Trip,
  patches: TripPatch[]
): { trip: Trip; undoPatches: TripPatch[]; errors: string[] } {
  let currentTrip = trip;
  const undoPatches: TripPatch[] = [];
  const errors: string[] = [];

  for (const patch of patches) {
    const { trip: updatedTrip, result } = applyPatch(currentTrip, patch);
    currentTrip = updatedTrip;

    if (result.success && result.undoPatch) {
      undoPatches.unshift(result.undoPatch); // Add to front for reverse order
    } else if (!result.success && result.error) {
      errors.push(result.error);
    }
  }

  return { trip: currentTrip, undoPatches, errors };
}

/**
 * Apply suggestion patches to a trip
 * @param trip The trip to update
 * @param suggestions Array of suggestion patches
 * @returns Updated trip and undo information
 */
export function applySuggestionPatches(
  trip: Trip,
  suggestions: SuggestionPatch[]
): { trip: Trip; undoPatches: TripPatch[]; appliedIds: string[]; errors: string[] } {
  const patches = suggestions.map(s => s.patch);
  const { trip: updatedTrip, undoPatches, errors } = applyPatches(trip, patches);
  const appliedIds = suggestions.filter((_, i) => !errors[i]).map(s => s.id);

  return { trip: updatedTrip, undoPatches, appliedIds, errors };
}

/**
 * Convert legacy AIAction to TripPatch
 */
export function convertLegacyAction(action: AIAction): TripPatch | null {
  switch (action.type) {
    case 'setMeal':
      if (action.payload.dayIndex !== undefined && action.payload.mealType && action.payload.place) {
        return {
          type: 'setMeal',
          payload: {
            dayIndex: action.payload.dayIndex,
            mealType: action.payload.mealType,
            place: action.payload.place,
          } as SetMealPayload,
        };
      }
      break;

    case 'addActivity':
      if (action.payload.dayIndex !== undefined && action.payload.place) {
        return {
          type: 'addActivity',
          payload: {
            dayIndex: action.payload.dayIndex,
            place: action.payload.place,
          } as AddActivityPayload,
        };
      }
      break;

    case 'assignHotel':
      if (action.payload.dayIndex !== undefined && action.payload.hotel) {
        return {
          type: 'assignHotel',
          payload: {
            dayIndex: action.payload.dayIndex,
            hotel: action.payload.hotel,
          } as AssignHotelPayload,
        };
      }
      break;

    case 'reorderDays':
      if (action.payload.newOrder) {
        return {
          type: 'reorderDays',
          payload: {
            newOrder: action.payload.newOrder,
          } as ReorderDaysPayload,
        };
      }
      break;
  }

  return null;
}
