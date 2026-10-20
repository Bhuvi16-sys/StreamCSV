# StreamCSV

A modern C++17 library that reads CSV one record at a time in bounded memory, reports precise errors, validates records against a schema, and ships with a CLI, tests, fuzzing, CI, and a release.

---

## Directory Structure

```
StreamCSV/
├── CMakeLists.txt
├── README.md
├── LICENSE
├── .gitignore
├── .clang-format
├── .github/
│   └── workflows/
│       └── ci.yml
├── include/
│   └── streamcsv/
│       ├── csv.hpp
│       ├── reader.hpp
│       ├── record.hpp
│       ├── error.hpp
│       └── schema.hpp
├── src/
│   ├── reader.cpp
│   ├── char_source.cpp
│   ├── schema.cpp
│   └── cli/
│       └── main.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── test_reader.cpp
│   ├── test_errors.cpp
│   └── test_schema.cpp
├── examples/
│   └── basic_read.cpp
├── benchmarks/
│   └── benchmark.cpp
├── fuzz/
│   └── fuzz_reader.cpp
└── docs/
    ├── csv-contract.md
    └── architecture.md
```

---

## Architecture

Data flows strictly in one direction:

```
std::istream --> CharSource --> Reader (state machine) --> Record --> Validator --> Issues
  (bytes)        (buffer,        (grammar, ParseError)      (fields)   (schema)     (CLI prints)
                  BOM, line/col)
```

- **Bounded Memory**: `CharSource` streams chunks through a fixed-size buffer (default 8 KB).
- **Exact Coordinates**: Reports 1-based `line` and `column` numbers for all parse errors.
- **RFC 4180 Compliant**: Supports quoted fields, multiline values, escaped quotes (`""`), and UTF-8 BOM detection.

---

## Building and Testing

### Build with CMake

```bash
cmake -B build
cmake --build build
```

### Run Tests

```bash
ctest --test-dir build --output-on-failure
```

### CLI Usage

```bash
# Inspect a CSV file (counts, dimensions, preview)
./build/streamcsv inspect data.csv

# Validate a CSV file against expected column types (string, int, float, bool)
./build/streamcsv validate data.csv int string float bool
```

### Running Benchmark

```bash
./build/benchmark 100000
```
