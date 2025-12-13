/**
 * Premium Ticket Design System for Trip Itinerary
 *
 * A polymorphic card system with four distinct variants:
 * 1. PlaceTicket - Standard place with time slot on left
 * 2. BoardingPassCard - Flight with boarding pass design (dashed divider, notches)
 * 3. HotelTicket - Check-in/Check-out with distinct icons
 * 4. NightPassCard - Footer hotel card with dark styling
 */

export { default as TicketCard, TicketTimeSlot, TicketContent, TicketDivider, TicketBadge } from './TicketCard';
export { default as PlaceTicket } from './PlaceTicket';
export { default as BoardingPassCard } from './BoardingPassCard';
export { default as HotelTicket } from './HotelTicket';
export { default as NightPassCard } from './NightPassCard';
export { default as ItineraryTicket } from './ItineraryTicket';
