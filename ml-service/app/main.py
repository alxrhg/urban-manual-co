from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime, timedelta
import pandas as pd
from prophet import Prophet
import numpy as np

app = FastAPI(title="Urban Manual ML Service")

# Database connection (using Supabase or direct PostgreSQL)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class DemandForecastRequest(BaseModel):
    destination_id: int
    forecast_days: int = 7
    include_confidence: bool = True

class PeakTimeRequest(BaseModel):
    destination_id: int
    forecast_days: int = 7

class ForecastResult(BaseModel):
    destination_id: int
    forecast_date: str
    predicted_demand: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None

class PeakTimeResult(BaseModel):
    destination_id: int
    day_of_week: int
    hour: int
    predicted_visits: float
    crowd_level: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-service"}

@app.post("/api/forecast/demand", response_model=List[ForecastResult])
async def forecast_demand(request: DemandForecastRequest):
    """
    Forecast demand for a destination using Prophet time-series model
    """
    try:
        # TODO: Fetch historical data from database
        # For now, return mock data structure
        # In production, this would:
        # 1. Fetch historical visit/engagement data
        # 2. Train Prophet model
        # 3. Generate forecasts
        
        forecasts = []
        base_date = datetime.now()
        
        for i in range(request.forecast_days):
            forecast_date = base_date + timedelta(days=i)
            # Mock prediction (replace with actual Prophet forecast)
            predicted_demand = 100 + np.random.normal(0, 10)
            
            result = ForecastResult(
                destination_id=request.destination_id,
                forecast_date=forecast_date.isoformat(),
                predicted_demand=max(0, predicted_demand),
            )
            
            if request.include_confidence:
                result.confidence_lower = max(0, predicted_demand - 15)
                result.confidence_upper = predicted_demand + 15
            
            forecasts.append(result)
        
        return forecasts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/forecast/peak-times", response_model=List[PeakTimeResult])
async def forecast_peak_times(request: PeakTimeRequest):
    """
    Predict peak times for a destination
    """
    try:
        # TODO: Fetch historical crowding data
        # Analyze patterns by day of week and hour
        # Return predictions
        
        peak_times = []
        
        for day in range(7):  # Sunday to Saturday
            for hour in range(24):
                # Mock prediction (replace with actual model)
                predicted_visits = 50 + np.random.normal(0, 20)
                
                # Determine crowd level
                if predicted_visits < 30:
                    crowd_level = "quiet"
                elif predicted_visits < 60:
                    crowd_level = "moderate"
                elif predicted_visits < 90:
                    crowd_level = "busy"
                else:
                    crowd_level = "very_busy"
                
                peak_times.append(PeakTimeResult(
                    destination_id=request.destination_id,
                    day_of_week=day,
                    hour=hour,
                    predicted_visits=max(0, predicted_visits),
                    crowd_level=crowd_level,
                ))
        
        return peak_times
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
