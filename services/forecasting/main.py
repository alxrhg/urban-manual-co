from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

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
    # Stubbed: simple moving average + naive trend
    values = [p.y for p in req.series]
    avg = sum(values) / max(len(values), 1)
    trend = "up" if len(values) > 1 and values[-1] > values[0] else "down" if len(values) > 1 and values[-1] < values[0] else "flat"
    forecast = []
    last = values[-1] if values else avg
    for i in range(req.periods):
        last = last * (1.01 if trend == "up" else 0.99 if trend == "down" else 1.0)
        forecast.append(SeriesPoint(ds=f"day+{i+1}", y=last))
    interest = last
    return ForecastResponse(city=req.city, interest_score=interest, trend_direction=trend, forecast=forecast)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


