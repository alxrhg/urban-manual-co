import assert from 'node:assert/strict';

import {
  saveTripDraft,
  type PlannerDayInput,
  type PlannerStopInput,
  type FlightDraft,
  type HotelDraft,
  type TripPlannerRepository,
} from '@/lib/trip-planner/saveTripDraft';
import type {
  InsertItineraryItem,
  InsertTrip,
  Trip,
} from '@/types/trip';

class InMemoryTripRepo implements TripPlannerRepository {
  public insertedTrip: InsertTrip | null = null;
  public insertedItems: InsertItineraryItem[] = [];

  async insertTrip(payload: InsertTrip): Promise<Trip> {
    this.insertedTrip = payload;
    return {
      ...payload,
      id: 'trip-e2e',
      description: payload.description ?? null,
      cover_image: payload.cover_image ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Trip;
  }

  async insertItineraryItems(payload: InsertItineraryItem[]): Promise<void> {
    this.insertedItems = payload;
  }
}

async function testHomeTripPlannerFlow() {
  const repo = new InMemoryTripRepo();
  const days: PlannerDayInput[] = [
    {
      dayNumber: 1,
      date: '2025-05-01',
      items: [
        {
          id: 'stop-1',
          title: 'Blue Bottle Aoyama',
          slug: 'blue-bottle-aoyama',
          city: 'Tokyo',
          category: 'Cafe',
          image: 'https://example.com/cafe.jpg',
          source: 'saved',
        } as PlannerStopInput,
      ],
    },
    {
      dayNumber: 2,
      date: '2025-05-02',
      items: [
        {
          id: 'stop-2',
          title: 'teamLab Planets',
          slug: 'teamlab-planets',
          city: 'Tokyo',
          category: 'Attraction',
          image: 'https://example.com/art.jpg',
          source: 'search',
        } as PlannerStopInput,
      ],
    },
  ];

  const hotel: HotelDraft = {
    name: 'Park Hyatt Tokyo',
    checkIn: '2025-05-01',
    checkOut: '2025-05-03',
  };

  const flight: FlightDraft = {
    airline: 'ANA',
    flightNumber: 'NH10',
    from: 'SFO',
    to: 'HND',
    departureDate: '2025-04-30',
    departureTime: '11:00',
    arrivalDate: '2025-05-01',
    arrivalTime: '15:30',
  };

  const result = await saveTripDraft({
    repo,
    userId: 'user-e2e',
    tripName: 'Golden Week Test',
    tripCity: 'Tokyo',
    startDate: '2025-05-01',
    endDate: '2025-05-02',
    days,
    hotel,
    flight,
  });

  assert.equal(result.tripId, 'trip-e2e', 'should return trip id');
  assert.ok(repo.insertedTrip, 'trip payload recorded');
  assert.equal(repo.insertedTrip?.user_id, 'user-e2e');
  assert.equal(repo.insertedTrip?.destination, 'Tokyo');
  assert.equal(repo.insertedItems.length, 4, 'two stops + hotel + flight');

  const hotelEntry = repo.insertedItems.find((item) =>
    item.notes?.includes('"type":"hotel"')
  );
  assert.ok(hotelEntry, 'hotel entry included');
  const flightEntry = repo.insertedItems.find((item) =>
    item.notes?.includes('"type":"flight"')
  );
  assert.ok(flightEntry, 'flight entry included');

  const placeEntries = repo.insertedItems.filter((item) =>
    item.notes?.includes('"type":"place"')
  );
  assert.equal(placeEntries.length, 2, 'two planner stops inserted');
  assert.deepEqual(
    placeEntries.map((entry) => entry.day),
    [1, 2],
    'stops preserved per day'
  );

  console.log('Home trip planner e2e passed');
}

async function run() {
  await testHomeTripPlannerFlow();
}

run().catch((error) => {
  console.error('Home trip planner e2e failed');
  console.error(error);
  process.exit(1);
});
