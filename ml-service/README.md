# ML Service Infrastructure

This directory contains the Python microservice for ML models and forecasting.

## Setup

### Prerequisites
- Python 3.9+
- pip or poetry

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://...
```

### Running the Service

```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Endpoints

- `POST /api/forecast/demand` - Demand forecasting
- `POST /api/forecast/peak-times` - Peak time predictions
- `POST /api/recommendations/collaborative` - Collaborative filtering
- `GET /health` - Health check

## Models

- **Prophet** - Time-series forecasting for demand prediction
- **LightFM** - Collaborative filtering for recommendations
- **Scikit-learn** - Additional ML utilities
