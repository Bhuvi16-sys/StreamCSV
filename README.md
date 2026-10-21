# StreamCSV

A modern C++17 library that streams CSV records in bounded memory, reports exact line/column errors, validates records against schemas, writes RFC 4180 compliant CSV, and ships with a CLI, unit tests, fuzzing, CI, and benchmarks.

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
│       ├── writer.hpp
│       ├── error.hpp
│       └── schema.hpp
├── src/
│   ├── reader.cpp
│   ├── char_source.cpp
│   ├── writer.cpp
│   ├── schema.cpp
│   └── cli/
│       └── main.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── test_types.cpp
│   ├── test_reader.cpp
│   ├── test_writer.cpp
│   ├── test_errors.cpp
│   └── test_schema.cpp
├── examples/
│   ├── basic_read.cpp
│   └── basic_write.cpp
├── benchmarks/
│   └── benchmark.cpp
├── fuzz/
│   └── fuzz_reader.cpp
└── docs/
    ├── csv-contract.md
    ├── architecture.md
    └── interview-prep.md
```

---

## Architecture

Data flows strictly in one direction:

```
std::istream --> CharSource --> Reader (state machine) --> Record --> Validator --> Issues
  (bytes)        (buffer,        (grammar, ParseError)      (fields,   (schema)     (CLI prints)
                  BOM, line/col)                             types)

Record / Typed Values --> Writer (escaping, quoting) --> std::ostream
```

- **Bounded Memory**: `CharSource` streams chunks through a fixed-size buffer (default 8 KB) with upper bounds on field size and column count.
- **Exact Coordinates**: Reports 1-based `line` and `column` numbers for all parse errors.
- **RFC 4180 Compliant**: Supports quoted fields, multiline values, escaped quotes (`""`), and UTF-8 BOM detection.
- **Modern C++17 Ergonomics**: Range-based for loops over `Reader`, typed record getters (`record.get<T>()`), header mappings (`record["name"]`), and variadic row writing (`writer.write_row(...)`).

---

## Quickstart C++ API

### Streaming Reader with Range-Based Loop and Typed Accessors

```cpp
#include <streamcsv/csv.hpp>
#include <iostream>
#include <fstream>

int main() {
    std::ifstream file("data.csv");
    
    streamcsv::ReaderConfig config;
    config.has_header = true;
    streamcsv::Reader reader(file, config);

    // Range-based for loop with header lookup and typed conversions
    for (const auto& record : reader) {
        int id = record.get<int>("id");
        std::string name = record["name"];
        double score = record.get<double>("score");
        bool active = record.get<bool>("active");

        std::cout << id << ": " << name << " (" << score << ") active=" << active << "\n";
    }
}
```

### Streaming Writer with RFC 4180 Quoting

```cpp
#include <streamcsv/csv.hpp>
#include <iostream>

int main() {
    streamcsv::Writer writer(std::cout);

    // 1. Write header record
    writer.write_record({"id", "name", "notes", "score"});

    // 2. Write rows with automatic quote escaping
    writer.write_row(1, "Alice", "Notes with, comma and \"quotes\"", 99.5);
    writer.write_row(2, "Bob", "Multiline\nnotes\nsupported", 84.0);
}
```

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
# Build with optimizations
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release

# Run benchmark with 100,000 records
./build/benchmark 100000
```

### Empirical Performance (Measured on 100,000 records)

| Component | Throughput | Processing Rate | Latency (100k rows) | Memory (RSS) |
| :--- | :---: | :---: | :---: | :---: |
| **Streaming Reader** | **37.70 MB/s** | **420,587 records/s** | 0.2378 s | Constant (< 5 MB) |
| **Schema Validator** | — | **1,322,303 records/s** | 0.0756 s | Constant (< 2 MB) |
| **Streaming Writer** | **95.85 MB/s** | **1,177,351 records/s** | 0.0849 s | Constant (< 3 MB) |

*Measured using GCC 15 `-O3 -DNDEBUG` on a standard development machine.*

