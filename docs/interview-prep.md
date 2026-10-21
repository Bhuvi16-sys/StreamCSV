# StreamCSV: Technical Interview Preparation & Talking Points

**Project Author**: Bhuvi Jain  
**Level**: Senior Software Engineer / C++ Systems Engineer  

---

## 1. The 30-Second Project Pitch

> *"I designed and built **StreamCSV**, a modern C++17 library and CLI tool that parses, validates, and serializes CSV data one record at a time in bounded memory. Traditional CSV parsers often use regex or `std::getline`, which fails catastrophically on multiline quoted fields and exhausts RAM on multi-gigabyte files. StreamCSV uses an 8 KB chunked buffer with an RFC 4180 Deterministic Finite Automaton (DFA) state machine, guaranteeing constant $O(1)$ memory usage. It features declarative schema validation, microsecond line/column error diagnostics, and a full testing suite including 10,000-round fuzzing and AddressSanitizer verification, achieving over 420,000 records/sec throughput."*

---

## 2. Core Architectural Questions & Senior Answers

### Q1: Why not simply use `std::getline(stream, line, ',')`?
**Senior Answer**:
- `std::getline` with a comma delimiter cannot differentiate between a delimiter comma and a comma **inside** quotes (e.g., `"New York, NY"`).
- `std::getline` with a newline delimiter breaks when a quoted field spans multiple lines (RFC 4180 Section 2.6).
- `std::getline` allocates a dynamically growing `std::string`. If an unclosed quote spans 10 GB, `std::getline` will allocate until the process crashes with Out-Of-Memory (OOM).
- **StreamCSV Solution**: StreamCSV uses an explicit 4-state DFA (`StartOfField`, `UnquotedField`, `QuotedField`, `AfterQuote`) operating over a fixed 8 KB buffer, preserving quoted newlines and commas while enforcing strict `max_field_size` caps.

---

### Q2: How does StreamCSV guarantee "Bounded Memory"?
**Senior Answer**:
- **Buffer Bounding**: `CharSource` allocates a single fixed buffer (default: 8 KB). Characters are read in fixed chunks via `std::istream::read()`, never buffering whole files.
- **Field & Record Caps (DoS Protection)**: Even with streaming, a malicious file without a closing quote or delimiter could cause a single field or record vector to grow indefinitely. StreamCSV introduces configurable invariants:
  - `max_field_size` (default: 16 MB)
  - `max_fields_per_record` (default: 100,000)
  If an attacker attempts a memory exhaustion attack, `LimitError` is raised immediately before memory can explode.

---

### Q3: What is the subtle edge case with CRLF and buffer boundaries?
**Senior Answer**:
- In Windows files (`\r\n`), a line increment should only happen once per record break.
- If the 8 KB buffer ends exactly on `\r` (byte 8191), the subsequent `\n` is read on byte 0 of the *next* refilled buffer.
- Naive parsers double-increment the line counter (counting `\r` as line 2, and `\n` as line 3).
- **StreamCSV Solution**: `CharSource` tracks a `last_was_cr_` state boolean that persists across buffer refills. When `\n` arrives immediately following `last_was_cr_`, the line number is preserved, guaranteeing flawless 1-based coordinate diagnostics across operating systems.

---

### Q4: Why separate `Parser`, `Reader`, and `Validator` into distinct layers?
**Senior Answer**:
- **Single Responsibility Principle (SRP)**:
  1. `CharSource`: C++ streams, I/O, UTF-8 BOM, coordinates.
  2. `Parser`: Pure state machine (quotes, delimiters, escapes). Knows nothing about files or types.
  3. `Validator`: Semantic rules (integer ranges, booleans, required columns). Knows nothing about quotes or delimiters.
- **Testability**: This separation allows unit-testing the `Validator` with synthetic `Record` instances without involving CSV grammar, and testing grammar edge cases without touching disk or network I/O.

---

### Q5: How did you verify memory safety and avoid undefined behavior?
**Senior Answer**:
- **Strict Compiler Warnings**: Built with `-Wall -Wextra -Wpedantic` on GCC/Clang and `/W4` on MSVC with zero warnings.
- **Sanitizers**: Verified using **AddressSanitizer (ASan)** and **UndefinedBehaviorSanitizer (UBSan)** (`-fsanitize=address,undefined`).
- **Fuzzing Harness**: Implemented a LibFuzzer target and a standalone 10,000-iteration random mutation fuzzer that injects null bytes (`\0`), malformed quotes, and chaos bytes. Zero memory leaks, crashes, or undefined behavior occurred.

---

## 3. Empirical Metrics to Quote

| Metric | Measured Number | Context |
| :--- | :--- | :--- |
| **Streaming Reader Throughput** | **37.70 MB/s** | Single-threaded `std::istream` parsing with full quote unescaping |
| **Parsing Rate** | **420,587 records/s** | 100,000 records processed in **0.237 seconds** |
| **Schema Validation Rate** | **1,322,303 records/s** | Scalar type checking across 6 columns |
| **Streaming Writer Throughput** | **95.85 MB/s** | **1,177,351 records/s** generated with RFC 4180 escaping |
| **RAM Footprint** | **< 5 MB (RSS)** | Constant memory usage throughout 100,000 rows |
