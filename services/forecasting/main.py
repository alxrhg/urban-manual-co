from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

# Optional Prophet import
try:
    from prophet import Prophet  # type: ignore
    HAS_PROPHET = True
except Exception:
    HAS_PROPHET = False

# Optional Supabase client for write-back
try:
    from supabase import create_client, Client  # type: ignore
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if (SUPABASE_URL and SUPABASE_KEY) else None
except Exception:
    supabase = None

app = FastAPI(title="Urban Manual Forecasting Service")

class SeriesPoint(BaseModel):
    ds: str  # ISO date
    y: float

class ForecastRequest(BaseModel):
    city: str
    series: List[SeriesPoint]
    periods: int = 28

class ForecastResponse(BaseModel):
    city: str
    interest_score: float
    trend_direction: str
    forecast: List[SeriesPoint]

@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    values = [p.y for p in req.series]
    if HAS_PROPHET and len(values) >= 7:
        import pandas as pd  # type: ignore
        df = pd.DataFrame({
            'ds': [p.ds for p in req.series],
            'y': values
        })
        m = Prophet(seasonality_mode='additive', weekly_seasonality=True, daily_seasonality=False)
        m.fit(df)
        future = m.make_future_dataframe(periods=req.periods)
        fc = m.predict(future).tail(req.periods)
        forecast = [SeriesPoint(ds=str(row['ds'].date()), y=float(row['yhat'])) for _, row in fc.iterrows()]
        interest = float(fc['yhat'].iloc[-1])
        # trend by slope sign of last window
        trend = "flat"
        if len(fc) >= 2:
            delta = float(fc['yhat'].iloc[-1] - fc['yhat'].iloc[0]) / max(abs(float(fc['yhat'].iloc[0])), 1e-6)
            trend = "up" if delta > 0.05 else "down" if delta < -0.05 else "flat"
    else:
        # Fallback: moving average + naive trend
        avg = sum(values) / max(len(values), 1)
        trend = "up" if len(values) > 1 and values[-1] > values[0] else "down" if len(values) > 1 and values[-1] < values[0] else "flat"
        forecast = []
        last = values[-1] if values else avg
        for i in range(req.periods):
            last = last * (1.01 if trend == "up" else 0.99 if trend == "down" else 1.0)
            forecast.append(SeriesPoint(ds=f"day+{i+1}", y=last))
        interest = last

    # Optional write-back to Supabase forecasting_data (city-level popularity proxy)
    if supabase is not None:
        try:
            supabase.table('forecasting_data').insert({
                'metric_type': 'popularity',
                'metric_value': interest,
                'recorded_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
                'metadata': { 'city': req.city },
                'interest_score': interest,
                'trend_direction': trend,
                'last_forecast': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
            }).execute()
        except Exception:
            pass

    return ForecastResponse(city=req.city, interest_score=interest, trend_direction=trend, forecast=forecast)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


