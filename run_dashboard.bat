@echo off
echo ========================================================
echo        Launching StreamCSV Full-Stack Web Studio        
echo ========================================================
echo.

:: 1. Ensure streamcsv.exe is built
if not exist streamcsv.exe (
    echo [*] Compiling StreamCSV C++17 engine...
    g++ -std=c++17 -O3 -Wall -Wextra -Wpedantic -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp src/cli/main.cpp -o streamcsv.exe
    if errorlevel 1 (
        echo [ERROR] Failed to compile streamcsv.exe
        pause
        exit /b 1
    )
    echo [*] Engine compiled successfully.
)

:: 2. Launch FastAPI Backend in background window
echo [*] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "StreamCSV Backend (FastAPI)" cmd /k "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000"

:: 3. Launch Vite React Frontend
echo [*] Starting React Frontend on http://localhost:5173 ...
start "StreamCSV Frontend (Vite)" cmd /k "cd frontend && npm run dev"

:: 4. Open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo   StreamCSV Studio is running at http://localhost:5173
echo ========================================================
