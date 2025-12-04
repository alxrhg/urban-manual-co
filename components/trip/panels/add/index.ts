// Add to Trip Panel Components
// Main panel container and exports

export { AddToTripPanel, type AddToTripPanelProps } from "./AddToTripPanel";
export { AddPanelHeader } from "./AddPanelHeader";
export { AddPanelTabs, type AddPanelTab } from "./AddPanelTabs";

// Places tab
export { PlacesTab } from "./PlacesTab";
export { CuratedResultCard } from "./CuratedResultCard";
export { GoogleResultRow, type GooglePlace } from "./GoogleResultRow";
export { SuggestedSection } from "./SuggestedSection";
export { AddDetailSheet } from "./AddDetailSheet";
export { CustomActivityForm } from "./CustomActivityForm";

// Transport tab
export { TransportTab } from "./TransportTab";
export { FlightForm } from "./FlightForm";
export { TrainForm } from "./TrainForm";
export { TransferForm } from "./TransferForm";

// Stay tab
export { StayTab } from "./StayTab";
export { StayResultCard } from "./StayResultCard";
export { HotelDetailsForm } from "./HotelDetailsForm";
export { AddHotelActivitySheet } from "./AddHotelActivitySheet";

// Shared components
export {
  TimeSlotPicker,
  type TimeSlot,
  DayPicker,
  AmenityToggle,
  BookingStatusSelect,
  AirportAutocomplete,
} from "./shared";
