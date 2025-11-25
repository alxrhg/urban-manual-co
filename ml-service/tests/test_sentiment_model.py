"""Tests for the sentiment analysis model."""

import os
import sys
from pathlib import Path
from dataclasses import dataclass
import types

# Ensure ml-service/app is importable
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

if "transformers" not in sys.modules:  # pragma: no cover - test shim
    transformers_stub = types.ModuleType("transformers")
    transformers_stub.pipeline = lambda *args, **kwargs: None
    sys.modules["transformers"] = transformers_stub

    if "numpy" not in sys.modules:  # pragma: no cover - test shim
        numpy_stub = types.ModuleType("numpy")

    def _mean(values):
        """Lightweight stand-in for numpy.mean for test environments."""
        return sum(values) / len(values) if values else 0.0

    numpy_stub.mean = _mean
    sys.modules["numpy"] = numpy_stub

    if "pydantic_settings" not in sys.modules:  # pragma: no cover - test shim
        pydantic_stub = types.ModuleType("pydantic_settings")

    class BaseSettings:  # type: ignore
        """Minimal BaseSettings replacement that reads from kwargs or env vars."""
        def __init__(self, **kwargs):
            """Populate attributes using provided values, environment, or defaults."""
            annotations = getattr(self, "__annotations__", {})
            for field in annotations:
                env_key = field.upper()
                if field in kwargs:
                    value = kwargs[field]
                elif env_key in os.environ:
                    value = os.environ[env_key]
                elif hasattr(self.__class__, field):
                    value = getattr(self.__class__, field)
                else:
                    value = None
                setattr(self, field, value)

    pydantic_stub.BaseSettings = BaseSettings
    sys.modules["pydantic_settings"] = pydantic_stub

    if "psycopg2" not in sys.modules:  # pragma: no cover - test shim
        psycopg_stub = types.ModuleType("psycopg2")

    class _ThreadedConnectionPool:  # pragma: no cover - helper
        """Test double that satisfies the psycopg2 pool API without DB access."""
        def __init__(self, *args, **kwargs):
            """Ignore connection parameters during initialization."""
            pass

        def getconn(self):
            """Raise to indicate database access is unavailable in tests."""
            raise RuntimeError("Database access not available in tests")

        def putconn(self, conn):
            """Return connections to the pool (no-op in tests)."""
            return None

        def closeall(self):
            """Close all tracked connections (no-op in tests)."""
            return None

    psycopg_stub.pool = types.SimpleNamespace(ThreadedConnectionPool=_ThreadedConnectionPool)
    sys.modules["psycopg2"] = psycopg_stub

    if "pythonjsonlogger" not in sys.modules:  # pragma: no cover - test shim
        json_logger_stub = types.ModuleType("pythonjsonlogger")

    class _JsonFormatter:  # pragma: no cover - helper
        """Stub JSON formatter that mirrors pythonjsonlogger's interface."""
        def __init__(self, *args, **kwargs):
            """Accept arbitrary arguments to mimic the real formatter."""
            pass

        def format(self, record):
            """Render the log record message or its string representation."""
            return record.getMessage() if hasattr(record, "getMessage") else str(record)

    json_logger_stub.jsonlogger = types.SimpleNamespace(JsonFormatter=_JsonFormatter)
    sys.modules["pythonjsonlogger"] = json_logger_stub

    if "pandas" not in sys.modules:  # pragma: no cover - test shim
        pandas_stub = types.ModuleType("pandas")

    class _StubDataFrame(list):  # pragma: no cover - helper
        """Simple list-backed DataFrame stub for pandas-dependent code paths."""
        def __init__(self, data=None, columns=None):
            """Initialize the stub with optional data and column metadata."""
            super().__init__(data or [])
            self.columns = columns or []

        @property
        def empty(self):
            """Report whether the stub contains any rows."""
            return len(self) == 0

    def _read_sql_query(*args, **kwargs):
        """Guard against unexpected database access in isolated tests."""
        raise RuntimeError("Database access not available in tests")

    pandas_stub.DataFrame = _StubDataFrame
    pandas_stub.read_sql_query = _read_sql_query
    sys.modules["pandas"] = pandas_stub

# Provide dummy environment configuration for pydantic settings
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("POSTGRES_URL", "postgres://user:pass@localhost:5432/postgres")

from app.models.sentiment import SentimentAnalysisModel
from app.utils.data_fetcher import DataFetcher


@dataclass
class FakeSeries:
    """Sequence-like wrapper that exposes a pandas-compatible tolist method."""
    values: list

    def tolist(self):  # pragma: no cover - helper
        """Return the underlying values as a standard list."""
        return list(self.values)


class FakeDataFrame:
    """Lightweight mock of a pandas DataFrame used for sentiment tests."""
    def __init__(self, rows):
        """Store provided rows for later indexed access."""
        self._rows = rows

    @property
    def empty(self):  # pragma: no cover - helper
        """Return whether any rows are available in the fake frame."""
        return len(self._rows) == 0

    def __len__(self):
        """Expose number of rows to mimic DataFrame length semantics."""
        return len(self._rows)

    def __getitem__(self, key):  # pragma: no cover - helper
        """Return a FakeSeries for the requested column name."""
        return FakeSeries([row.get(key) for row in self._rows])


def test_fetch_destination_texts_cleaning_and_limits(monkeypatch):
    """_fetch_destination_texts should clean, deduplicate, and paginate text."""

    monkeypatch.setattr(SentimentAnalysisModel, "_load_model", lambda self: None)
    model = SentimentAnalysisModel()
    model.TEXT_PAGE_SIZE = 2
    model.MAX_TEXTS = 3

    page_size = model.TEXT_PAGE_SIZE

    page_one = FakeDataFrame([
        {
            "text": "### **Incredible** stay! <br> Loved it.",
            "source": "saved_places",
        },
        {
            "text": "Visit [site](https://example.com) ASAP _now_",
            "source": "visited_places",
        },
    ])

    long_text = "a" * 800
    page_two = FakeDataFrame([
        {
            "text": "### **Incredible** stay! <br> Loved it.",
            "source": "reviews",
        },
        {
            "text": long_text,
            "source": "reviews",
        },
    ])

    empty_page = FakeDataFrame([])

    def fake_fetch(destination_id, days, limit, offset):  # pragma: no cover - helper
        """Return paginated fake destination texts to simulate Supabase pagination."""
        if offset == 0:
            return page_one
        if offset == page_size:
            return page_two
        return empty_page

    monkeypatch.setattr(DataFetcher, "fetch_destination_texts", staticmethod(fake_fetch))

    cleaned = model._fetch_destination_texts(destination_id=1, days=30)

    assert len(cleaned) == 3  # Duplicate entries removed
    assert cleaned[0] == "Incredible stay! Loved it."
    assert cleaned[1] == "Visit site ASAP now"
    assert len(cleaned[2]) == model.TEXT_MAX_LENGTH
    assert all("http" not in text for text in cleaned)


def test_analyze_destination_sentiment_counts(monkeypatch):
    """Analyze sentiment should differ when destination has no text."""

    monkeypatch.setattr(SentimentAnalysisModel, "_load_model", lambda self: None)
    model = SentimentAnalysisModel()

    class DummyAnalyzer:
        """Deterministic analyzer stub that labels texts based on content."""

        def __call__(self, texts, batch_size=32, truncation=True):  # pragma: no cover - helper
            """Return positive or negative labels depending on keyword presence."""
            return [
                {
                    "label": "POSITIVE" if "love" in text else "NEGATIVE",
                    "score": 0.9 if "love" in text else 0.6,
                }
                for text in texts
            ]

    model.analyzer = DummyAnalyzer()

    def fake_fetch(self, destination_id, days):  # pragma: no cover - helper
        """Provide deterministic review samples for sentiment calculations."""
        if destination_id == 1:
            return ["I love this place", "Not my favorite"]
        return []

    monkeypatch.setattr(SentimentAnalysisModel, "_fetch_destination_texts", fake_fetch)

    populated = model.analyze_destination_sentiment(destination_id=1)
    empty = model.analyze_destination_sentiment(destination_id=2)

    assert populated["positive_count"] == 1
    assert populated["negative_count"] == 1
    assert populated["total_reviews"] == 2
    assert empty["total_reviews"] == 0
    assert empty["positive_count"] == 0
