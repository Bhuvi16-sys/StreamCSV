# StreamCSV Full-Stack Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Launching StreamCSV Full-Stack Web Studio        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compile C++ binary if not present
if (-not (Test-Path "streamcsv.exe")) {
    Write-Host "[*] Compiling StreamCSV C++17 engine..." -ForegroundColor Yellow
    g++ -std=c++17 -O3 -Wall -Wextra -Wpedantic -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp src/cli/main.cpp -o streamcsv.exe
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to compile streamcsv.exe"
        exit 1
    }
}

# 2. Start Backend
Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000" -PassThru

# 3. Start Frontend
Write-Host "[*] Starting React Frontend on http://localhost:5173 ..." -ForegroundColor Green
$frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

# 4. Open Browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  StreamCSV Studio is live at http://localhost:5173     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
