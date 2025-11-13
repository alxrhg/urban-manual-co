"""Event correlation and enhancement for contextual recommendations."""

from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

try:
    from psycopg2.extras import RealDictCursor
except ImportError:  # pragma: no cover - optional dependency during tests
    RealDictCursor = None

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.database import get_db_connection

logger = get_logger(__name__)
settings = get_settings()


class EventCorrelationModel:
    """
    Correlate external events (festivals, exhibitions, weather) with destination traffic.
    
    Enhances recommendations and forecasts with event context.
    """

    def __init__(self):
        """Initialize the event correlation model."""
        self.event_destination_mappings: Dict[str, List[Dict[str, Any]]] = {}
        self.historical_correlations: Dict[str, List[Dict[str, Any]]] = {}
        self._event_cache: Dict[str, Dict[str, Any]] = {}
        self._traffic_cache: Dict[str, Dict[str, Any]] = {}
        self._manual_traffic_data: Optional[List[Dict[str, Any]]] = None
        self._cache_ttl = timedelta(hours=settings.cache_ttl_hours)
        self._event_cache_ttl = timedelta(hours=settings.event_cache_ttl_hours)
        self._event_lookup_window = timedelta(days=settings.event_lookup_window_days)
        self._enable_event_analysis = settings.enable_event_correlation
        self._enable_destination_analysis = settings.enable_event_destination_analysis
        self._enable_traffic_analysis = settings.enable_event_traffic_analysis
        self._enable_event_cache = settings.enable_event_cache

    def correlate_event_impact(
        self,
        event_name: str,
        city: str,
        event_dates: tuple,
        destination_ids: Optional[List[int]] = None
    ) -> Dict:
        """
        Analyze impact of an event on destination traffic.
        
        Args:
            event_name: Name of the event
            city: City where event occurs
            event_dates: (start_date, end_date) tuple
            destination_ids: Optional list of destination IDs to analyze
        
        Returns:
            Correlation analysis results
        """
        if not self._enable_event_analysis:
            return {
                'event_name': event_name,
                'city': city,
                'status': 'disabled',
                'reason': 'Event correlation disabled via configuration',
            }

        try:
            start_date, end_date = event_dates

            # Fetch traffic data before, during, and after event
            before_period = self._fetch_traffic_period(
                city,
                start_date - timedelta(days=30),
                start_date,
                destination_ids
            )
            
            during_period = self._fetch_traffic_period(
                city,
                start_date,
                end_date,
                destination_ids
            )
            
            after_period = self._fetch_traffic_period(
                city,
                end_date,
                end_date + timedelta(days=30),
                destination_ids
            )

            # Calculate impact metrics
            before_avg = self._calculate_average_traffic(before_period)
            during_avg = self._calculate_average_traffic(during_period)
            after_avg = self._calculate_average_traffic(after_period)

            # Calculate percentage changes
            during_change = ((during_avg - before_avg) / before_avg * 100) if before_avg > 0 else 0
            after_change = ((after_avg - before_avg) / before_avg * 100) if before_avg > 0 else 0

            # Identify most impacted destinations
            impacted_destinations = self._identify_impacted_destinations(
                before_period,
                during_period,
                destination_ids
            ) if self._enable_destination_analysis else []

            if impacted_destinations:
                self._register_event_correlation(event_name, city, impacted_destinations)

            return {
                'event_name': event_name,
                'city': city,
                'event_type': self._infer_event_type(event_name),
                'event_dates': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                },
                'traffic_impact': {
                    'before_avg': float(before_avg),
                    'during_avg': float(during_avg),
                    'after_avg': float(after_avg),
                    'during_change_pct': float(during_change),
                    'after_change_pct': float(after_change),
                },
                'impacted_destinations': impacted_destinations[:10],  # Top 10
                'analyzed_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error correlating event impact: {e}")
            return {
                'event_name': event_name,
                'status': 'error',
                'error': str(e),
            }

    def get_event_recommendations(
        self,
        city: str,
        event_date: datetime
    ) -> Dict:
        """
        Get destination recommendations based on upcoming events.
        
        Args:
            city: City name
            event_date: Date of interest
        
        Returns:
            Event-aware recommendations
        """
        try:
            # Find events around this date
            events = self._find_events(city, event_date)
            
            if not events:
                return {
                    'city': city,
                    'date': event_date.isoformat(),
                    'events': [],
                    'recommendations': [],
                }

            recommendations = []
            
            for event in events:
                correlated_destinations = self._get_event_destinations(
                    event['type'],
                    city
                )

                if not correlated_destinations and self._enable_traffic_analysis:
                    # fallback to recent traffic snapshot if we cannot find correlations
                    correlated_destinations = self._derive_recent_top_destinations(city)

                recommendations.extend(correlated_destinations)

            # Deduplicate and rank
            unique_recommendations = self._deduplicate_recommendations(recommendations)
            
            return {
                'city': city,
                'date': event_date.isoformat(),
                'events': events,
                'recommendations': unique_recommendations[:20],  # Top 20
            }

        except Exception as e:
            logger.error(f"Error getting event recommendations: {e}")
            return {
                'city': city,
                'status': 'error',
                'error': str(e),
            }

    def enhance_forecast_with_events(
        self,
        destination_id: int,
        forecast_dates: List[datetime],
        city: str
    ) -> Dict:
        """
        Enhance demand forecast with event information.
        
        Args:
            destination_id: Destination ID
            forecast_dates: List of dates to forecast
            city: City name
        
        Returns:
            Enhanced forecast with event adjustments
        """
        try:
            # Get base forecast (from Prophet model)
            # This would call the demand forecasting model
            
            # Find events during forecast period
            events = []
            for date in forecast_dates:
                date_events = self._find_events(city, date)
                events.extend(date_events)

            # Calculate event impact adjustments
            adjustments = {}
            for event in events:
                event_date = datetime.fromisoformat(event['date'])
                impact = self._estimate_event_impact(
                    event['type'],
                    destination_id,
                    city
                )
                
                if event_date in forecast_dates:
                    adjustments[event_date.isoformat()] = {
                        'event': event,
                        'impact_multiplier': impact,
                        'adjustment_pct': (impact - 1.0) * 100,
                    }

            return {
                'destination_id': destination_id,
                'forecast_dates': [d.isoformat() for d in forecast_dates],
                'event_adjustments': adjustments,
                'enhanced_at': datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error enhancing forecast with events: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def _fetch_traffic_period(
        self,
        city: str,
        start_date: datetime,
        end_date: datetime,
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Fetch traffic data for a time period."""
        try:
            if self._manual_traffic_data is not None:
                return self._filter_manual_traffic(city, start_date, end_date, destination_ids)

            cache_key = self._traffic_cache_key(city, start_date, end_date, destination_ids)
            cached = self._traffic_cache.get(cache_key)
            if cached and datetime.utcnow() - cached['cached_at'] <= self._cache_ttl:
                return cached['data']

            period_data = self._query_traffic_period(city, start_date, end_date, destination_ids)

            if self._enable_event_cache:
                self._traffic_cache[cache_key] = {
                    'data': period_data,
                    'cached_at': datetime.utcnow()
                }

            return period_data
        except Exception as e:
            logger.error(f"Error fetching traffic period: {e}")
            return []

    def _calculate_average_traffic(self, period_data: List[Dict]) -> float:
        """Calculate average traffic from period data."""
        if not period_data:
            return 0.0

        total_views = sum(d.get('view_count', d.get('views', 0)) for d in period_data)
        return total_views / len(period_data) if period_data else 0.0

    def _identify_impacted_destinations(
        self,
        before_period: List[Dict],
        during_period: List[Dict],
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Identify destinations most impacted by event."""
        if not before_period or not during_period:
            return []
        before_lookup = {item['destination_id']: item for item in before_period}
        during_lookup = {item['destination_id']: item for item in during_period}

        dest_ids = set(before_lookup.keys()) | set(during_lookup.keys())
        if destination_ids:
            dest_ids &= set(destination_ids)

        impacted: List[Dict[str, Any]] = []

        for dest_id in dest_ids:
            before_metrics = before_lookup.get(dest_id, {})
            during_metrics = during_lookup.get(dest_id, {})

            view_before = before_metrics.get('view_count', 0)
            view_during = during_metrics.get('view_count', 0)
            save_before = before_metrics.get('save_count', 0)
            save_during = during_metrics.get('save_count', 0)
            visit_before = before_metrics.get('visit_count', 0)
            visit_during = during_metrics.get('visit_count', 0)

            view_change = self._calculate_pct_change(view_before, view_during)
            save_change = self._calculate_pct_change(save_before, save_during)
            visit_change = self._calculate_pct_change(visit_before, visit_during)

            impact_score = (0.6 * view_change) + (0.3 * save_change) + (0.1 * visit_change)

            impacted.append({
                'destination_id': int(dest_id),
                'view_change_pct': float(view_change),
                'save_change_pct': float(save_change),
                'visit_change_pct': float(visit_change),
                'impact_score': float(impact_score),
                'before_metrics': {
                    'views': float(view_before),
                    'saves': float(save_before),
                    'visits': float(visit_before)
                },
                'during_metrics': {
                    'views': float(view_during),
                    'saves': float(save_during),
                    'visits': float(visit_during)
                }
            })

        impacted.sort(key=lambda item: (-item['impact_score'], item['destination_id']))
        return impacted

    def _find_events(self, city: str, date: datetime) -> List[Dict]:
        """Find events in a city around a date."""
        try:
            cache_key = self._get_event_cache_key(city, date)
            cached = self._event_cache.get(cache_key)
            if cached and self._enable_event_cache:
                if datetime.utcnow() - cached['cached_at'] <= self._event_cache_ttl:
                    return cached['events']

            events: List[Dict[str, Any]] = []

            if not self._enable_event_analysis:
                return events

            lookup_start = date - self._event_lookup_window
            lookup_end = date + self._event_lookup_window

            query = """
                SELECT title, city, opportunity_data, created_at
                FROM opportunity_alerts
                WHERE opportunity_type = 'event'
                  AND city ILIKE %s
                  AND created_at BETWEEN %s AND %s
                ORDER BY created_at DESC
                LIMIT 200
            """

            cursor_kwargs = {'cursor_factory': RealDictCursor} if RealDictCursor else {}
            with get_db_connection() as conn:
                with conn.cursor(**cursor_kwargs) as cur:
                    cur.execute(query, (city, lookup_start, lookup_end))
                    rows = cur.fetchall()

            for row in rows:
                payload = row.get('opportunity_data') or {}
                start_raw = payload.get('start_date') or row['created_at'].date().isoformat()
                end_raw = payload.get('end_date') or start_raw

                try:
                    start_dt = datetime.fromisoformat(start_raw)
                except ValueError:
                    start_dt = row['created_at']

                try:
                    end_dt = datetime.fromisoformat(end_raw)
                except ValueError:
                    end_dt = start_dt

                if not (start_dt.date() <= date.date() <= end_dt.date()):
                    continue

                events.append({
                    'name': row.get('title'),
                    'type': payload.get('event_type', self._infer_event_type(row.get('title', ''))),
                    'date': start_dt.isoformat(),
                    'end_date': end_dt.isoformat(),
                    'description': payload.get('description'),
                    'source': payload.get('source', 'opportunity_alerts')
                })

            if self._enable_event_cache:
                self._event_cache[cache_key] = {
                    'events': events,
                    'cached_at': datetime.utcnow()
                }

            return events
        except Exception as e:
            logger.error(f"Error finding events: {e}")
            return []

    def _get_event_destinations(
        self,
        event_type: str,
        city: str
    ) -> List[Dict]:
        """Get destinations correlated with an event type."""
        key = self._mapping_key(event_type, city)
        if key in self.event_destination_mappings:
            return self.event_destination_mappings[key]

        historical = self.historical_correlations.get(event_type, [])
        matched = []
        for record in historical:
            if record['city'].lower() == city.lower():
                matched.extend(record['destinations'])

        if not matched:
            matched = next((
                record['destinations']
                for record in self.historical_correlations.get('general', [])
                if record['city'].lower() == city.lower()
            ), [])

        self.event_destination_mappings[key] = matched
        return matched

    def _deduplicate_recommendations(
        self,
        recommendations: List[Dict]
    ) -> List[Dict]:
        """Deduplicate and rank recommendations."""
        # Simple deduplication by destination_id
        seen = set()
        unique = []
        for rec in recommendations:
            dest_id = rec.get('destination_id')
            if dest_id and dest_id not in seen:
                seen.add(dest_id)
                unique.append(rec)
        return unique

    def _estimate_event_impact(
        self,
        event_type: str,
        destination_id: int,
        city: Optional[str] = None
    ) -> float:
        """Estimate traffic impact multiplier for an event."""
        candidate_keys = []
        if city:
            candidate_keys.append(self._mapping_key(event_type, city))
        candidate_keys.append(self._mapping_key(event_type, None))
        if city:
            candidate_keys.append(self._mapping_key('general', city))
        candidate_keys.append(self._mapping_key('general', None))

        for key in candidate_keys:
            impacted = self.event_destination_mappings.get(key, [])
            for record in impacted:
                if record.get('destination_id') == destination_id:
                    impact_score = record.get('impact_score', 0)
                    multiplier = 1 + (impact_score / 100)
                    return max(0.1, multiplier)

        return 1.0

    def _derive_recent_top_destinations(self, city: str) -> List[Dict]:
        """Fallback recommendations using recent traffic data."""
        recent_end = datetime.utcnow()
        recent_start = recent_end - timedelta(days=30)
        period = self._fetch_traffic_period(city, recent_start, recent_end, None)
        if not period:
            return []
        ranked = sorted(period, key=lambda item: item.get('view_count', 0), reverse=True)
        return [
            {
                'destination_id': item['destination_id'],
                'impact_score': item.get('view_count', 0)
            }
            for item in ranked[:10]
        ]

    @staticmethod
    def _calculate_pct_change(before_value: float, after_value: float) -> float:
        """Safe percentage change helper."""
        denominator = before_value if before_value > 0 else 1.0
        return ((after_value - before_value) / denominator) * 100

    def _register_event_correlation(
        self,
        event_name: str,
        city: str,
        impacted_destinations: List[Dict]
    ) -> None:
        """Persist correlation results for future reuse."""
        event_type = self._infer_event_type(event_name)
        record = {
            'city': city,
            'destinations': impacted_destinations,
            'recorded_at': datetime.utcnow().isoformat()
        }
        self.historical_correlations.setdefault(event_type, []).append(record)
        self.event_destination_mappings[self._mapping_key(event_type, city)] = impacted_destinations

    def _infer_event_type(self, event_name: str) -> str:
        """Infer event type using basic keyword matching."""
        if not event_name:
            return 'general'

        name = event_name.lower()
        keyword_map = {
            'festival': ['festival', 'fair', 'carnival'],
            'sports': ['match', 'game', 'tournament', 'marathon'],
            'conference': ['conference', 'summit', 'expo', 'forum'],
            'holiday': ['holiday', 'christmas', 'new year'],
            'cultural': ['parade', 'ceremony', 'art', 'culture']
        }

        for event_type, keywords in keyword_map.items():
            if any(keyword in name for keyword in keywords):
                return event_type

        return 'general'

    def _mapping_key(self, event_type: str, city: Optional[str]) -> str:
        """Create a consistent mapping key for caches."""
        normalized_type = (event_type or 'general').lower()
        normalized_city = (city or 'global').lower()
        return f"{normalized_city}:{normalized_type}"

    def _get_event_cache_key(self, city: str, date: datetime) -> str:
        """Generate cache key for event lookups."""
        return f"{city.lower()}:{date.date().isoformat()}"

    def _traffic_cache_key(
        self,
        city: str,
        start_date: datetime,
        end_date: datetime,
        destination_ids: Optional[List[int]]
    ) -> str:
        """Cache key for traffic slices."""
        dest_key = ','.join(str(d) for d in sorted(destination_ids or [])) or 'all'
        return f"{city.lower()}:{start_date.isoformat()}:{end_date.isoformat()}:{dest_key}"

    def _filter_manual_traffic(
        self,
        city: str,
        start_date: datetime,
        end_date: datetime,
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Filter synthetic traffic data (used in tests)."""
        if not self._manual_traffic_data:
            return []

        dest_filter = set(destination_ids) if destination_ids else None
        aggregates: Dict[int, Dict[str, float]] = {}

        for entry in self._manual_traffic_data:
            if entry.get('city', '').lower() != city.lower():
                continue

            entry_date = entry.get('date')
            if isinstance(entry_date, str):
                entry_date = datetime.fromisoformat(entry_date)

            if not (start_date <= entry_date < end_date):
                continue

            dest_id = entry.get('destination_id')
            if dest_filter and dest_id not in dest_filter:
                continue

            aggregates.setdefault(dest_id, {
                'destination_id': dest_id,
                'view_count': 0.0,
                'save_count': 0.0,
                'visit_count': 0.0,
                'period_start': start_date.date().isoformat(),
                'period_end': end_date.date().isoformat()
            })

            aggregates[dest_id]['view_count'] += entry.get('view_count', 0)
            aggregates[dest_id]['save_count'] += entry.get('save_count', 0)
            aggregates[dest_id]['visit_count'] += entry.get('visit_count', 0)

        return list(aggregates.values())

    def _query_traffic_period(
        self,
        city: str,
        start_date: datetime,
        end_date: datetime,
        destination_ids: Optional[List[int]]
    ) -> List[Dict]:
        """Query analytics tables for traffic data."""
        dest_filter_sql = ''
        params: List[Any] = [city]
        if destination_ids:
            dest_filter_sql = ' AND id = ANY(%s)'
            params.append(destination_ids)

        params.extend([start_date, end_date, start_date, end_date, start_date, end_date])

        query = f"""
            WITH city_destinations AS (
                SELECT id
                FROM destinations
                WHERE city ILIKE %s
                {dest_filter_sql}
            ),
            views AS (
                SELECT ui.destination_id, COUNT(*) AS view_count
                FROM user_interactions ui
                WHERE ui.interaction_type = 'view'
                  AND ui.created_at >= %s AND ui.created_at < %s
                  AND ui.destination_id IN (SELECT id FROM city_destinations)
                GROUP BY ui.destination_id
            ),
            saves AS (
                SELECT d.id AS destination_id, COUNT(*) AS save_count
                FROM saved_places sp
                JOIN destinations d ON d.slug = sp.destination_slug
                WHERE sp.saved_at >= %s AND sp.saved_at < %s
                  AND d.id IN (SELECT id FROM city_destinations)
                GROUP BY d.id
            ),
            visits AS (
                SELECT d.id AS destination_id, COUNT(*) AS visit_count
                FROM visited_places vp
                JOIN destinations d ON d.slug = vp.destination_slug
                WHERE vp.visited_at >= %s AND vp.visited_at < %s
                  AND d.id IN (SELECT id FROM city_destinations)
                GROUP BY d.id
            )
            SELECT
                cd.id AS destination_id,
                COALESCE(v.view_count, 0) AS view_count,
                COALESCE(s.save_count, 0) AS save_count,
                COALESCE(vs.visit_count, 0) AS visit_count
            FROM city_destinations cd
            LEFT JOIN views v ON v.destination_id = cd.id
            LEFT JOIN saves s ON s.destination_id = cd.id
            LEFT JOIN visits vs ON vs.destination_id = cd.id
        """

        cursor_kwargs = {'cursor_factory': RealDictCursor} if RealDictCursor else {}
        with get_db_connection() as conn:
            with conn.cursor(**cursor_kwargs) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

        for row in rows:
            row['period_start'] = start_date.date().isoformat()
            row['period_end'] = end_date.date().isoformat()

        return rows


# Global model instance
_event_model_instance = None


def get_event_model() -> EventCorrelationModel:
    """Get or create the global event correlation model instance."""
    global _event_model_instance
    if _event_model_instance is None:
        _event_model_instance = EventCorrelationModel()
    return _event_model_instance

