# StreamCSV Contract Specification

**Status**: Settled Engineering Decision  
**Standard Reference**: RFC 4180 with deterministic strictness and resource bounds

---

## 1. Settled Engineering Decisions

### 1.1 Quoted Newlines
- Newline characters (`\r\n`, `\n`, `\r`) are permitted inside quoted fields.
- Quoted newlines do not terminate the record; they are preserved verbatim as field data.
- The record's starting line number is preserved regardless of how many newlines occur inside quoted fields.

### 1.2 Empty Fields and Trailing Commas
- Consecutive delimiters (`,,`) evaluate to an explicit empty string field (`""`).
- A trailing delimiter before a newline or EOF produces an explicit empty string field (`""`).
- An empty file yields 0 records.

### 1.3 Blank Lines
- Blank lines (containing only `\r`, `\n`, or CRLF) are skipped when `skip_empty_lines = true` (default).
- This avoids generating spurious empty single-field records on trailing or interspersed newlines.

### 1.4 Quotes in Unquoted Fields
- In strict mode (`strict = true`, default), a quote appearing inside an unquoted field (e.g. `foo"bar`) is treated as a syntax violation and raises `ParseError`.
- Following a closing quote, no characters other than a delimiter, a record break, or EOF are permitted; unexpected characters raise `ParseError`.

### 1.5 Line Endings and UTF-8 BOM
- Supports Windows CRLF (`\r\n`), Unix LF (`\n`), and legacy Mac CR (`\r`).
- A leading UTF-8 Byte Order Mark (`0xEF, 0xBB, 0xBF`) is detected and transparently stripped before parsing.

### 1.6 Resource Limits (Bounded Memory Guarantee)
- Memory usage is strictly bounded:
  - `CharSource` streams via a fixed-size buffer (default 8 KB).
  - `max_field_size`: A configurable cap (default 16 MB) prevents unbounded string allocation from malicious or unclosed quotes. Exceeding this cap raises `LimitError`.
  - `max_fields_per_record`: A configurable cap (default 100,000) prevents record vector exhaustion.

### 1.7 Error Hierarchy
All exceptions inherit from `streamcsv::CsvError`:
- `ParseError`: Syntax violation in CSV grammar (reports exact 1-based `line` and `column`).
- `LimitError`: Bounded memory resource threshold exceeded.
- `IoError`: Stream or filesystem read failure.
- `ValidationError`: Schema and data type constraints violated.

### 1.8 CLI Contract
- Command: `streamcsv inspect <file.csv | ->`
- Command: `streamcsv validate <file.csv | -> [col_type1 col_type2 ...]`
- Exit Codes:
  - `0`: Success / valid
  - `1`: Validation issues detected
  - `2`: Syntax parse error, resource limit exceeded, or I/O failure
