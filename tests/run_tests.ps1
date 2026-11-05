# StreamCSV C++ Automated Test Suite Runner
$ErrorActionPreference = "Stop"
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "       Running StreamCSV C++17 Test Suites       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    @{ Name = "Types & Coordinate Tracking"; Src = "tests/test_types.cpp"; Out = "test_types.exe" },
    @{ Name = "CharSource & BOM Handling"; Src = "tests/test_char_source.cpp"; Out = "test_char_source.exe" },
    @{ Name = "Streaming Reader DFA"; Src = "tests/test_reader.cpp"; Out = "test_reader.exe" },
    @{ Name = "Error Handling & Limits"; Src = "tests/test_errors.cpp"; Out = "test_errors.exe" },
    @{ Name = "Schema & Validator"; Src = "tests/test_schema.cpp"; Out = "test_schema.exe" },
    @{ Name = "RFC 4180 Writer"; Src = "tests/test_writer.cpp"; Out = "test_writer.exe" },
    @{ Name = "CLI Exit Codes & Inspect"; Src = "tests/test_cli.cpp"; Out = "test_cli.exe" }
)

$passed = 0
$failed = 0

foreach ($t in $tests) {
    Write-Host "[*] Compiling and running: $($t.Name)..." -ForegroundColor Yellow
    g++ -std=c++17 -Wall -Wextra -Wpedantic -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp $t.Src -o $t.Out
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Compilation error for $($t.Name)" -ForegroundColor Red
        $failed++
        continue
    }

    & ".\$($t.Out)"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] $($t.Name)`n" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FAIL] $($t.Name) exited with code $LASTEXITCODE`n" -ForegroundColor Red
        $failed++
    }

    if (Test-Path $t.Out) {
        Remove-Item $t.Out -Force
    }
}

$summaryColor = if ($failed -eq 0) { "Green" } else { "Red" }
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Summary: $passed Passed, $failed Failed" -ForegroundColor $summaryColor
Write-Host "=================================================" -ForegroundColor Cyan
exit $failed
