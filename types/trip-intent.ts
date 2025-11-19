export type TripPlannerCommandAction =
  | 'openTripPlanner'
  | 'addToTrip'
  | 'openTripPage';

export interface TripPlannerCommand {
  action: TripPlannerCommandAction;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  slot?: string | null;
  itemName?: string | null;
  tripId?: string | null;
  requiresDates?: boolean;
  activityType?: string | null;
  timeDescriptor?: string | null;
  rawText?: string;
}
