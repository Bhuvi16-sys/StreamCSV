import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

# Locate the compiled streamcsv binary
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
STREAMCSV_BIN = WORKSPACE_DIR / "streamcsv.exe"
if not STREAMCSV_BIN.exists():
    STREAMCSV_BIN = WORKSPACE_DIR / "build" / "streamcsv.exe"
if not STREAMCSV_BIN.exists():
    STREAMCSV_BIN = WORKSPACE_DIR / "streamcsv"


def get_binary_path() -> Path:
    if not STREAMCSV_BIN.exists():
        raise FileNotFoundError(
            f"StreamCSV binary not found at '{STREAMCSV_BIN}'. Please build the project first."
        )
    return STREAMCSV_BIN


def inspect_csv(
    file_content: Optional[bytes] = None,
    file_path: Optional[str] = None,
    preview_count: int = 10,
    delimiter: str = ",",
    has_header: bool = True,
) -> Dict[str, Any]:
    """Runs StreamCSV inspect on CSV content or path and returns structured metrics."""
    bin_path = get_binary_path()

    temp_file = None
    target_path = file_path

    try:
        if file_content is not None:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
            temp_file.write(file_content)
            temp_file.flush()
            temp_file.close()
            target_path = temp_file.name

        cmd = [
            str(bin_path),
            "inspect",
            target_path,
            "-n",
            str(preview_count),
            "-d",
            delimiter,
        ]
        if has_header:
            cmd.append("--header")

        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

        if result.returncode == 2:
            return {
                "success": False,
                "exit_code": 2,
                "error": result.stderr.strip() or result.stdout.strip() or "Syntax or I/O error",
                "raw_output": result.stdout,
            }

        stdout = result.stdout
        total_records = 0
        min_cols = 0
        max_cols = 0
        is_ragged = False
        headers: List[str] = []
        preview_rows: List[List[str]] = []

        # Parse metrics from stdout
        rec_match = re.search(r"Total Records:\s+(\d+)", stdout)
        if rec_match:
            total_records = int(rec_match.group(1))

        header_match = re.search(r"Header \(\d+ columns\):\s*\[(.*?)\]", stdout)
        if header_match:
            headers = [h.strip() for h in header_match.group(1).split(",") if h.strip()]

        col_match = re.search(r"Columns:\s+(\d+)(?:\s+to\s+(\d+))?", stdout)
        if col_match:
            min_cols = int(col_match.group(1))
            max_cols = int(col_match.group(2)) if col_match.group(2) else min_cols
            if min_cols != max_cols or "WARNING: non-uniform" in stdout:
                is_ragged = True

        # Parse preview rows: "  Row   1 │ id │ name │ role │ active"
        for line in stdout.splitlines():
            line_str = line.strip()
            if "Row" in line_str and "│" in line_str:
                parts = [p.strip() for p in line_str.split("│")]
                if len(parts) > 1:
                    preview_rows.append(parts[1:])

        return {
            "success": True,
            "exit_code": 0,
            "total_records": total_records,
            "columns_min": min_cols,
            "columns_max": max_cols,
            "is_ragged": is_ragged,
            "headers": headers,
            "preview_rows": preview_rows,
            "raw_output": stdout,
        }

    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except OSError:
                pass


def validate_csv(
    column_types: List[str],
    file_content: Optional[bytes] = None,
    file_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Runs StreamCSV validate and returns structured validation issues."""
    bin_path = get_binary_path()

    temp_file = None
    target_path = file_path

    try:
        if file_content is not None:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
            temp_file.write(file_content)
            temp_file.flush()
            temp_file.close()
            target_path = temp_file.name

        cmd = [str(bin_path), "validate", target_path] + column_types
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

        # Parse issues from stderr/stdout
        issues: List[Dict[str, Any]] = []
        combined_output = (result.stderr + "\n" + result.stdout).strip()

        # Regex pattern: "[Error] Line 2, Field 0 ('id'): Value 'not_an_id' is not a valid Integer"
        pattern = re.compile(
            r"\[(Error|Warning)\]\s+Line\s+(\d+),\s+Field\s+(\d+)(?:\s+\('(.*?)'\))?:\s+(.*)"
        )

        for line in combined_output.splitlines():
            m = pattern.search(line.strip())
            if m:
                issues.append({
                    "severity": m.group(1),
                    "line": int(m.group(2)),
                    "field_index": int(m.group(3)),
                    "field_name": m.group(4) or f"Field {m.group(3)}",
                    "message": m.group(5).strip(),
                })

        records_processed = 0
        rec_m = re.search(r"(\d+)\s+record\(s\)\s+processed", combined_output)
        if rec_m:
            records_processed = int(rec_m.group(1))

        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "records_processed": records_processed,
            "issues_count": len(issues),
            "issues": issues,
            "raw_output": combined_output,
        }

    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except OSError:
                pass


def run_benchmark(row_count: int = 10000) -> Dict[str, Any]:
    """
    Generates a synthetic CSV workload of `row_count` rows, then measures:
      - Reader throughput: wall-clock time of `streamcsv.exe inspect`
      - Validator throughput: wall-clock time of `streamcsv.exe validate`
      - Writer throughput: wall-clock time of Python RFC 4180 write loop
    Returns all metrics as a flat dict ready for the frontend.
    """
    import time
    import io as _io

    bin_path = get_binary_path()

    # --- Build synthetic CSV in memory ---
    departments = ["Engineering", "Platform", "Data Infra", "DevOps", "Security"]
    lines = ["id,name,email,score,active,department\n"]
    for i in range(row_count):
        dept = departments[i % len(departments)]
        lines.append(
            f'{i + 1},User{i + 1},user{i + 1}@example.com,'
            f'{round((i % 100) + 0.5, 2)},'
            f'{"true" if i % 2 == 0 else "false"},'
            f'{dept}\n'
        )
    csv_content = "".join(lines)
    csv_bytes = csv_content.encode("utf-8")
    data_mb = round(len(csv_bytes) / (1024 * 1024), 3)

    # Write to temp file once; reuse for both reader and validator
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    tmp.write(csv_bytes)
    tmp.flush()
    tmp.close()
    tmp_path = tmp.name

    results: Dict[str, Any] = {
        "success": False,
        "row_count": row_count,
        "data_mb": data_mb,
    }

    try:
        # ── Reader benchmark (inspect with 0 preview rows) ──
        t0 = time.perf_counter()
        subprocess.run(
            [str(bin_path), "inspect", tmp_path, "-n", "0", "--header"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        reader_dur = time.perf_counter() - t0
        results["reader_mb_s"] = round(data_mb / reader_dur, 2) if reader_dur > 0 else 0
        results["reader_records_s"] = int(row_count / reader_dur) if reader_dur > 0 else 0
        results["reader_duration_ms"] = round(reader_dur * 1000, 1)

        # ── Validator benchmark ──
        col_types = ["int", "string", "string", "float", "bool", "string"]
        t0 = time.perf_counter()
        subprocess.run(
            [str(bin_path), "validate", tmp_path] + col_types,
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        validator_dur = time.perf_counter() - t0
        results["validator_rows_s"] = int(row_count / validator_dur) if validator_dur > 0 else 0
        results["validator_duration_ms"] = round(validator_dur * 1000, 1)

        # ── Writer benchmark (Python-side RFC 4180 loop) ──
        t0 = time.perf_counter()
        buf = _io.StringIO()
        for i in range(row_count):
            dept = departments[i % len(departments)]
            buf.write(
                f'{i + 1},User{i + 1},user{i + 1}@example.com,'
                f'{round((i % 100) + 0.5, 2)},'
                f'{"true" if i % 2 == 0 else "false"},'
                f'{dept}\r\n'
            )
        writer_content = buf.getvalue()
        writer_dur = time.perf_counter() - t0
        writer_mb = len(writer_content.encode("utf-8")) / (1024 * 1024)
        results["writer_mb_s"] = round(writer_mb / writer_dur, 2) if writer_dur > 0 else 0
        results["writer_records_s"] = int(row_count / writer_dur) if writer_dur > 0 else 0
        results["writer_duration_ms"] = round(writer_dur * 1000, 1)

        results["success"] = True

    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    return results
