"""Shared pytest fixtures for the ML service tests."""

import os
import sys
import types
from pathlib import Path

# Ensure required environment variables exist before importing application modules.
DEFAULT_ENV_VARS = {
    "SUPABASE_URL": "http://localhost",
    "SUPABASE_ANON_KEY": "test-key",
    "SUPABASE_SERVICE_ROLE_KEY": "service-key",
    "POSTGRES_URL": "postgresql://user:pass@localhost:5432/postgres",
}

for key, value in DEFAULT_ENV_VARS.items():
    os.environ.setdefault(key, value)


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _ensure_stub_module(name: str, class_name: str):
    """Create a lightweight stub module if the dependency is missing."""

    if name in sys.modules:
        return

    module = types.ModuleType(name)

    class _Stub:  # type: ignore
        """Minimal placeholder class that raises if instantiated."""
        def __init__(self, *_, **__):
            """Abort usage to remind developers to install real dependencies."""
            raise RuntimeError(
                f"Stub for {name}.{class_name} was used. Install the real dependency for production use."
            )

    setattr(module, class_name, _Stub)
    sys.modules[name] = module


_ensure_stub_module("bertopic", "BERTopic")
_ensure_stub_module("sentence_transformers", "SentenceTransformer")


def _ensure_pandas_stub():
    """Register a minimal pandas stub when the real dependency is absent."""
    if "pandas" in sys.modules:
        return

    module = types.ModuleType("pandas")

    def _read_sql_query(*_, **__):  # pragma: no cover - stub for offline tests
        """Disallow accidental SQL execution while running unit tests."""
        raise RuntimeError("pandas is required for database queries in production")

    class _DataFrame(list):
        """Placeholder DataFrame type used by pandas stubs in tests."""
        pass

    module.read_sql_query = _read_sql_query
    module.DataFrame = _DataFrame
    sys.modules["pandas"] = module


def _ensure_pydantic_settings_stub():
    """Load a lightweight replacement for pydantic_settings when missing."""
    if "pydantic_settings" in sys.modules:
        return

    module = types.ModuleType("pydantic_settings")

    class BaseSettings:  # type: ignore
        """Simplified settings loader that mirrors pydantic_settings.BaseSettings."""

        def __init__(self, **values):
            """Populate attributes from provided values or environment fallbacks."""
            annotations = getattr(self.__class__, "__annotations__", {})
            for field in annotations:
                env_key = field.upper()
                if field in values:
                    value = values[field]
                elif env_key in os.environ:
                    value = os.environ[env_key]
                else:
                    value = getattr(self.__class__, field, None)
                setattr(self, field, value)

    module.BaseSettings = BaseSettings
    sys.modules["pydantic_settings"] = module


_ensure_pandas_stub()
_ensure_pydantic_settings_stub()


def _ensure_sklearn_stub():
    """Inject a minimal sklearn.feature_extraction.text namespace if needed."""
    if "sklearn.feature_extraction.text" in sys.modules:
        return

    sklearn_module = types.ModuleType("sklearn")
    feature_extraction = types.ModuleType("sklearn.feature_extraction")
    text_module = types.ModuleType("sklearn.feature_extraction.text")
    text_module.ENGLISH_STOP_WORDS = {"a", "the", "and", "is", "in"}

    sys.modules["sklearn"] = sklearn_module
    sys.modules["sklearn.feature_extraction"] = feature_extraction
    sys.modules["sklearn.feature_extraction.text"] = text_module


_ensure_sklearn_stub()


def _ensure_psycopg_stub():
    """Provide psycopg2 stubs to prevent real database usage during tests."""
    if "psycopg2" in sys.modules:
        return

    module = types.ModuleType("psycopg2")
    pool_module = types.ModuleType("psycopg2.pool")

    class ThreadedConnectionPool:  # type: ignore
        """Stub pool implementation used to block real database access in tests."""

        def __init__(self, *_, **__):
            """Immediately fail creation to avoid unintended connections."""
            raise RuntimeError("Database access is not available in test stubs")

        def closeall(self):
            """No-op placeholder to satisfy pool interface expectations."""
            pass

    pool_module.ThreadedConnectionPool = ThreadedConnectionPool
    module.pool = pool_module
    sys.modules["psycopg2"] = module
    sys.modules["psycopg2.pool"] = pool_module


_ensure_psycopg_stub()


def _ensure_jsonlogger_stub():
    """Create a pythonjsonlogger stub when the logger dependency is unavailable."""
    if "pythonjsonlogger" in sys.modules:
        return

    module = types.ModuleType("pythonjsonlogger")

    class _JsonLogger:  # type: ignore
        """Lightweight formatter shim that mirrors pythonjsonlogger.JsonFormatter."""

        def __init__(self, *_, **__):
            """Accept arbitrary parameters for compatibility with real formatter."""
            pass

        def format(self, record):
            """Return the stored message from a log record if present."""
            return getattr(record, "msg", "")

    module.jsonlogger = types.SimpleNamespace(JsonFormatter=_JsonLogger)
    sys.modules["pythonjsonlogger"] = module


_ensure_jsonlogger_stub()
