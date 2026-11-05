# StreamCSV: Comprehensive Project Documentation & Execution Guide

**Author**: Bhuvi Jain  
**Repository**: [https://github.com/Bhuvi16-sys/StreamCSV](https://github.com/Bhuvi16-sys/StreamCSV)  
**Releases**: [`v0.1.0`](https://github.com/Bhuvi16-sys/StreamCSV/releases/tag/v0.1.0) · [`v0.2.0`](https://github.com/Bhuvi16-sys/StreamCSV/releases/tag/v0.2.0)  
**Standard**: C++17 (Strict `-Wall -Wextra -Wpedantic` / MSVC `/W4`)  
**Memory Model**: Strictly Bounded $O(1)$ RAM ($< 5\text{ MB}$ RSS across arbitrarily large files)  

---

## 1. Executive Summary & Purpose

In production engineering (high-frequency trading, telemetry, bioinformatics, server access logs), CSV datasets frequently reach **20 GB to 100 GB**. Naive parsers built with `std::getline` or regular expressions fail in production because they:
1. Attempt to load whole lines or whole files into memory (`O(N)` memory explosion).
2. Fail to parse multiline quoted fields and escaped double-quotes (`""`) as specified by **RFC 4180**.
3. Cause denial-of-service (DoS) crashes when unclosed quotes or missing delimiters cause unbounded string growth.
4. Conflate I/O buffering with grammar parsing and semantic schema validation.

**StreamCSV** solves this by establishing a **bounded-memory, streaming, four-layer architecture**. Data flows in a strictly unidirectional pipeline from raw bytes to validated records, providing sub-millisecond line/column error diagnostics, deterministic schema checking, RFC 4180 writing, and high-throughput streaming.

---

## 2. The 4-Layer Architecture

StreamCSV enforces the **Single Responsibility Principle (SRP)** by splitting the engine into 4 decoupled layers:

```
[Layer 4: CLI Application (app/main.cpp / src/cli/main.cpp)]
       │   (inspect, validate, stdout/stderr formatting, Unix exit codes 0, 1, 2)
       ▼
[Layer 3: Schema Validator (schema.hpp, schema.cpp)]
       │   (Scalar types int, float, bool, required rules, custom lambdas)
       ▼
[Layer 2: Streaming Reader & Input Layer (reader.hpp, char_source.cpp)]
       │   (8 KB chunk buffer, BOM stripping, line/column coordinate tracking)
       ▼
[Layer 1: Pure Grammar Parser (src/reader.cpp)]
           (DFA: StartOfField, UnquotedField, QuotedField, AfterQuote)

[Complementary Output: Streaming Writer (writer.hpp, writer.cpp)]
           (RFC 4180 escaping, conditional quoting, variadic write_row())
```

---

## 3. Summary of Completed Phases (Phases 1 – 8)

1. **Phase 1: Foundations, Contract & Types**
   - Locked down RFC 4180 rules, quoted newlines, and bounded memory caps in `docs/csv-contract.md`.
   - Implemented `Record` with bounds-checked `.at()`, `operator==`, named header lookups, and typed accessors.
   - Built polymorphic `CsvError` hierarchy (`ParseError`, `LimitError`, `IoError`, `ValidationError`).
   - Verified via `tests/test_types.cpp`.

2. **Phase 2: Input Layer (`CharSource`)**
   - Implemented fixed-size 8 KB chunked buffering over raw `std::istream`.
   - Added automatic UTF-8 BOM (`\xEF\xBB\xBF`) stripping with coordinate alignment.
   - Handled cross-platform newline tracking (CRLF, LF, CR) and CRLF buffer boundary splits.
   - Verified via `tests/test_char_source.cpp`.

3. **Phase 3: Pure State Machine Parser (DFA)**
   - 4-state Deterministic Finite Automaton (`StartOfField`, `UnquotedField`, `QuotedField`, `AfterQuote`).
   - Quote origin localization: Reports the line where an unclosed quote began.
   - Enforced `max_field_size` (16 MB cap) and `max_fields_per_record` (100k cap) to prevent DoS attacks.
   - Verified via `tests/test_reader.cpp` and `tests/test_errors.cpp`.

4. **Phase 4: CLI Foundation & `inspect` Command**
   - Dimension analysis with ragged row detection (`min_cols != max_cols`).
   - Standard input piping (`cat data.csv | streamcsv inspect -`).
   - Flags: `--preview/-n`, `--delimiter/-d`, `--header`.
   - Strict Unix exit codes: `0` (Success), `1` (Validation failure), `2` (Parse/IO error).
   - Verified via `tests/test_cli.cpp`.

5. **Phase 5: Schema Validation Layer**
   - Decoupled semantic validator for `Integer`, `Float`, `Boolean`, and `String`.
   - Added support for custom lambda business rules and custom error messages.
   - Implemented CLI `validate` command with exit code `1` contract.
   - Verified via `tests/test_schema.cpp`.

6. **Phase 6: Hardening, Sanitizers & Fuzzing**
   - Dual-mode fuzzer supporting Clang LibFuzzer and standalone 10,000-iteration random chaos engine.
   - Added `STREAMCSV_ENABLE_ASAN` option for AddressSanitizer and UndefinedBehaviorSanitizer.
   - Ran 10,000 fuzz rounds with **0 crashes, leaks, or undefined behavior**.

7. **Phase 7: Empirical Benchmarking**
   - Built `benchmarks/benchmark.cpp` measuring Reader, Validator, and Writer performance on 100,000 records (~9.0 MB workload) with `-O3`:
     - **Reader**: **37.70 MB/s** (**420,587 records/s**) in 0.2378 s.
     - **Validator**: **1,322,303 records/s** in 0.0756 s.
     - **Writer**: **95.85 MB/s** (**1,177,351 records/s**) in 0.0849 s.
     - **Memory (RSS)**: Flat, constant memory ($< 5\text{ MB}$).

8. **Phase 8: Release Packaging & Interview Preparation**
   - Created `docs/interview-prep.md` with complete technical question-and-answer guide.
   - GitHub Actions CI running on Ubuntu and Windows.
   - Tagged releases `v0.1.0` and `v0.2.0` on GitHub.

9. **Complementary Feature: Streaming CSV Writer**
   - Implemented `include/streamcsv/writer.hpp` and `src/writer.cpp` with RFC 4180 escaping and variadic `write_row()`.
   - Verified via `tests/test_writer.cpp`.

---

## 4. Execution Guide (How to Run Everything)

### 4.1 Building the Project

```bash
# Configure and build in Release mode:
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

### 4.2 Running the CLI Tool

```bash
# 1. Inspect a CSV file:
./build/streamcsv inspect sample.csv -n 3 --header

# 2. Stream via standard input pipeline:
cat sample.csv | ./build/streamcsv inspect - -n 2

# 3. Validate column types (int, string, string, bool):
./build/streamcsv validate sample.csv int string string bool
```

### 4.3 Running the Test Suite (7 Target Suites)

```bash
# Run all tests using CTest:
ctest --test-dir build --output-on-failure
```

Or compile and run individually:
```powershell
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_types.cpp -o test_types.exe; .\test_types.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_char_source.cpp -o test_char_source.exe; .\test_char_source.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_reader.cpp -o test_reader.exe; .\test_reader.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_errors.cpp -o test_errors.exe; .\test_errors.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_schema.cpp -o test_schema.exe; .\test_schema.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_writer.cpp -o test_writer.exe; .\test_writer.exe
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp tests/test_cli.cpp -o test_cli.exe; .\test_cli.exe
```

### 4.4 Running Benchmarks

```bash
# Compile and run 100,000-row benchmark:
g++ -std=c++17 -O3 -DNDEBUG -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp benchmarks/benchmark.cpp -o benchmark.exe
./benchmark.exe 100000
```

### 4.5 Running Security Fuzzing

```bash
# Compile and run 10,000 randomized chaos mutations:
g++ -std=c++17 -O2 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp fuzz/fuzz_reader.cpp -o fuzz_reader.exe
./fuzz_reader.exe 10000
```

### 4.6 Running Examples

```bash
# Basic Read Example:
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp examples/basic_read.cpp -o basic_read.exe
./basic_read.exe

# Basic Write Example:
g++ -std=c++17 -I include src/char_source.cpp src/reader.cpp src/schema.cpp src/writer.cpp examples/basic_write.cpp -o basic_write.exe
./basic_write.exe
```

### 4.7 Running inside VS Code
- Open **Terminal** &rarr; **Run Task...**
- Select from:
  - `1. Build StreamCSV CLI`
  - `2. Run CLI Inspect (sample.csv)`
  - `3. Run CLI Validate (sample.csv)`
  - `4. Run Basic Example`
  - `5. Run Test Suite`
  - `6. Run Benchmark`
  - `7. Start Backend API Server`
  - `8. Start Frontend Dev Server`
  - `9. Launch Web Studio (Full Stack)`

---

## 5. Web Studio (Modern Full-Stack Dashboard)

StreamCSV includes a modern web dashboard built with **React 18 + Vite + Tailwind CSS** connected via a high-performance **FastAPI** bridge to the C++17 streaming engine.

### 5.1 Architecture of the Web Studio

```
[React 18 SPA (Vite / Tailwind / Lucide)]  ──(HTTP / JSON)──>  [FastAPI Bridge (Python 3.11)]
            │                                                               │
            │                                                      (Subprocess Streams)
            │                                                               ▼
            └───────────────────────────────────────────────────>  [streamcsv.exe (C++17)]
```

### 5.2 Key Features
1. **Interactive Inspector & Visualizer**:
   - Drag-and-drop CSV upload or instant text editing.
   - Live dimension analysis (total records, min/max columns, ragged row detection).
   - Paginated data preview grid with detected header styling.
2. **Visual Schema Builder & Validator**:
   - Column-level scalar type selector (`int`, `float`, `bool`, `string`).
   - Real-time schema validation execution with line and column error badges.
   - Comprehensive issue logs explaining type mismatches directly from the C++ validator.
3. **RFC 4180 CSV Writer Studio**:
   - Interactive table cell editor to compose tabular data.
   - Live RFC 4180 escaping preview (handles quotes, commas, newlines).
   - One-click `.csv` file export and download.
4. **Engine Telemetry & Architectural Walkthrough**:
   - Empirical throughput telemetry display (420,000+ rows/sec, $< 5\text{ MB}$ RAM).
   - Live bridge connection monitor with health probes.

### 5.3 How to Launch the Web Studio

#### Method A: One-Click Launch Script (Recommended)
Double-click `run_dashboard.bat` (or run in terminal):
```powershell
.\run_dashboard.bat
# or in PowerShell:
.\run_dashboard.ps1
```
This automatically compiles `streamcsv.exe` if not present, starts the FastAPI backend on `http://127.0.0.1:8000`, starts the Vite dev server on `http://localhost:5173`, and opens the dashboard in your default browser.

#### Method B: Standalone Production Mode (Single Process)
The production bundle is already pre-built in `frontend/dist`. You can run both the API and the React frontend with a single command:
```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```
Then navigate directly to:
```
http://127.0.0.1:8000
```

#### Method C: Developer Mode (Hot Module Replacement)
1. **Terminal 1 (Backend)**:
   ```powershell
   python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```
2. **Terminal 2 (Frontend with HMR)**:
   ```powershell
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173`.

