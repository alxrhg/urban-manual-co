"""Tests for event correlation model."""

from datetime import datetime, timedelta
from pathlib import Path
import sys
import unittest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from app.models.event_correlation import EventCorrelationModel  # noqa: E402


class EventCorrelationModelTest(unittest.TestCase):
    """Exercise the event correlation flows with synthetic data."""

    def setUp(self):
        self.model = EventCorrelationModel()
        self.model._manual_traffic_data = [
            {
                'destination_id': 1,
                'date': datetime(2024, 4, 15),
                'view_count': 100,
                'save_count': 20,
                'visit_count': 5,
                'city': 'Paris',
            },
            {
                'destination_id': 1,
                'date': datetime(2024, 5, 11),
                'view_count': 180,
                'save_count': 35,
                'visit_count': 9,
                'city': 'Paris',
            },
            {
                'destination_id': 2,
                'date': datetime(2024, 4, 10),
                'view_count': 80,
                'save_count': 12,
                'visit_count': 4,
                'city': 'Paris',
            },
            {
                'destination_id': 2,
                'date': datetime(2024, 5, 12),
                'view_count': 200,
                'save_count': 50,
                'visit_count': 14,
                'city': 'Paris',
            },
        ]

    def test_correlate_event_impact_returns_ranked_destinations(self):
        """Synthetic traffic should surface a ranked impact list."""
        event_start = datetime(2024, 5, 10)
        event_end = datetime(2024, 5, 13)
        result = self.model.correlate_event_impact(
            event_name="Paris Food Festival",
            city="Paris",
            event_dates=(event_start, event_end),
            destination_ids=[1, 2],
        )

        self.assertEqual(result['city'], 'Paris')
        self.assertEqual(result['event_type'], 'festival')
        impacted = result['impacted_destinations']
        self.assertTrue(impacted, "Impact list should not be empty")
        self.assertGreaterEqual(impacted[0]['impact_score'], impacted[-1]['impact_score'])

    def test_enhance_forecast_with_events_uses_cached_event_data(self):
        """Cached events and mappings should produce deterministic adjustments."""
        event_date = datetime(2024, 6, 1)
        cache_key = self.model._get_event_cache_key('Paris', event_date)
        self.model._event_cache[cache_key] = {
            'events': [
                {
                    'name': 'Tech Expo',
                    'type': 'conference',
                    'date': event_date.isoformat(),
                    'end_date': (event_date + timedelta(days=1)).isoformat(),
                }
            ],
            'cached_at': datetime.utcnow(),
        }
        mapping_key = self.model._mapping_key('conference', 'Paris')
        self.model.event_destination_mappings[mapping_key] = [
            {
                'destination_id': 1,
                'impact_score': 40.0,
                'view_change_pct': 40.0,
                'save_change_pct': 25.0,
                'visit_change_pct': 10.0,
            }
        ]

        result = self.model.enhance_forecast_with_events(
            destination_id=1,
            forecast_dates=[event_date],
            city='Paris',
        )

        self.assertIn(event_date.isoformat(), result['event_adjustments'])
        adjustment = result['event_adjustments'][event_date.isoformat()]
        self.assertAlmostEqual(adjustment['impact_multiplier'], 1.4, places=2)
        self.assertGreater(adjustment['adjustment_pct'], 0)


if __name__ == '__main__':
    unittest.main()
