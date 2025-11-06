@echo off
REM Quick start script for ML service local development (Windows)

echo Starting Urban Manual ML Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.11 or higher.
    pause
    exit /b 1
)

echo Python detected
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo.
echo Installing dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

echo Dependencies installed
echo.

REM Check for .env file
if not exist ".env" (
    echo No .env file found. Copying from .env.example...
    copy .env.example .env
    echo .env file created
    echo.
    echo Please edit .env and add your DATABASE_URL (Supabase connection string)
    echo.
    pause
)

REM Start the service
echo Starting ML service on http://localhost:8000...
echo.
echo Available endpoints:
echo   - Health check: http://localhost:8000/health
echo   - API docs: http://localhost:8000/docs
echo   - Recommendations: http://localhost:8000/api/recommend/collaborative
echo   - Forecasting: http://localhost:8000/api/forecast/demand
echo.
echo Press Ctrl+C to stop the service
echo.

REM Start uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
