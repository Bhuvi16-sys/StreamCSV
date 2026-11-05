import csv as _csv
import io as _io
import math
import os
import re
import statistics
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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

        # First pass: get total record count with 0 preview rows
        cmd_count = [str(bin_path), "inspect", target_path, "-n", "0", "-d", delimiter]
        if has_header:
            cmd_count.append("--header")
        count_result = subprocess.run(
            cmd_count, capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        total_records = 0
        rec_match = re.search(r"Total Records:\s+(\d+)", count_result.stdout)
        if rec_match:
            total_records = int(rec_match.group(1))

        # Second pass: use min(preview_count, total_records) so we never cut rows
        effective_preview = total_records if preview_count <= 0 else min(preview_count, max(total_records, 1))

        cmd = [
            str(bin_path), "inspect", target_path,
            "-n", str(effective_preview),
            "-d", delimiter,
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
        min_cols = 0
        max_cols = 0
        is_ragged = False
        headers: List[str] = []
        preview_rows: List[List[str]] = []

        header_match = re.search(r"Header \(\d+ columns\):\s*\[(.*?)\]", stdout)
        if header_match:
            headers = [h.strip() for h in header_match.group(1).split(",") if h.strip()]

        col_match = re.search(r"Columns:\s+(\d+)(?:\s+to\s+(\d+))?", stdout)
        if col_match:
            min_cols = int(col_match.group(1))
            max_cols = int(col_match.group(2)) if col_match.group(2) else min_cols
            if min_cols != max_cols or "WARNING: non-uniform" in stdout:
                is_ragged = True

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

        issues: List[Dict[str, Any]] = []
        combined_output = (result.stderr + "\n" + result.stdout).strip()

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


# ─────────────────────────────────────────────
#  INDUSTRY-GRADE DATA PROFILER
# ─────────────────────────────────────────────

def _try_int(v: str) -> bool:
    try:
        int(v.strip())
        return True
    except (ValueError, AttributeError):
        return False


def _try_float(v: str) -> bool:
    try:
        float(v.strip())
        return True
    except (ValueError, AttributeError):
        return False


def _try_bool(v: str) -> bool:
    return v.strip().lower() in ("true", "false", "1", "0", "yes", "no", "t", "f")


def _infer_type(values: List[str]) -> str:
    """Infer the dominant type for a column from non-null values."""
    non_null = [v for v in values if v.strip() != ""]
    if not non_null:
        return "empty"
    bool_count = sum(1 for v in non_null if _try_bool(v))
    int_count = sum(1 for v in non_null if _try_int(v))
    float_count = sum(1 for v in non_null if _try_float(v))
    n = len(non_null)
    if bool_count / n >= 0.9:
        return "bool"
    if int_count / n >= 0.8:
        return "int"
    if float_count / n >= 0.8:
        return "float"
    return "string"


def _pattern_fingerprint(value: str) -> str:
    """Classify string formatting pattern."""
    if not value.strip():
        return "empty"
    if value.isupper():
        return "UPPER_CASE"
    if value.islower():
        return "lower_case"
    if value.istitle():
        return "Title_Case"
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value.strip()):
        return "DATE_ISO"
    if re.match(r"^\d{2}/\d{2}/\d{4}$", value.strip()):
        return "DATE_DMY"
    if re.match(r"^[\w.+-]+@[\w-]+\.\w+$", value.strip()):
        return "EMAIL"
    return "mixed_case"


def _quartiles(nums: List[float]) -> Tuple[float, float, float]:
    """Return (Q1, median, Q3) without external libraries."""
    s = sorted(nums)
    n = len(s)
    if n == 0:
        return 0.0, 0.0, 0.0
    mid = n // 2
    median = (s[mid - 1] + s[mid]) / 2 if n % 2 == 0 else float(s[mid])
    lower = s[:mid]
    upper = s[mid:] if n % 2 == 0 else s[mid + 1:]
    q1 = (lower[len(lower) // 2 - 1] + lower[len(lower) // 2]) / 2 if lower and len(lower) % 2 == 0 else (float(lower[len(lower) // 2]) if lower else median)
    q3 = (upper[len(upper) // 2 - 1] + upper[len(upper) // 2]) / 2 if upper and len(upper) % 2 == 0 else (float(upper[len(upper) // 2]) if upper else median)
    return q1, median, q3


def profile_csv(
    file_content: Optional[bytes] = None,
    file_path: Optional[str] = None,
    delimiter: str = ",",
    has_header: bool = True,
) -> Dict[str, Any]:
    """
    Industry-grade data profiler. No external dependencies.
    Returns:
      - per-column statistical + quality profiles
      - anomalous_rows list (sorted by severity)
      - overall quality_score (0-100)
    """
    # ── 1. Parse CSV fully (no row limit) ──
    if file_content is not None:
        text = file_content.decode("utf-8", errors="replace")
    elif file_path is not None:
        with open(file_path, encoding="utf-8", errors="replace") as f:
            text = f.read()
    else:
        return {"success": False, "error": "No input provided"}

    reader = _csv.reader(_io.StringIO(text), delimiter=delimiter)
    all_rows: List[List[str]] = list(reader)
    if not all_rows:
        return {"success": False, "error": "Empty CSV"}

    headers: List[str] = []
    data_rows: List[List[str]] = []
    if has_header:
        headers = [h.strip() for h in all_rows[0]]
        data_rows = all_rows[1:]
    else:
        data_rows = all_rows
        headers = [f"col_{i+1}" for i in range(len(data_rows[0]) if data_rows else 0)]

    num_rows = len(data_rows)
    num_cols = len(headers)

    if num_rows == 0:
        return {"success": False, "error": "No data rows"}

    # ── 2. Build column value lists ──
    col_values: List[List[str]] = [[] for _ in range(num_cols)]
    for row in data_rows:
        for c in range(num_cols):
            col_values[c].append(row[c].strip() if c < len(row) else "")

    # ── 3. Per-column profiling ──
    column_profiles: List[Dict[str, Any]] = []
    col_outlier_sets: List[set] = [set() for _ in range(num_cols)]   # row indices
    col_null_sets: List[set] = [set() for _ in range(num_cols)]
    col_type_error_sets: List[set] = [set() for _ in range(num_cols)]

    for c, col_name in enumerate(headers):
        vals = col_values[c]
        null_indices = {i for i, v in enumerate(vals) if v == ""}
        non_null = [v for v in vals if v != ""]
        col_null_sets[c] = null_indices

        inferred_type = _infer_type(vals)
        profile: Dict[str, Any] = {
            "name": col_name,
            "index": c,
            "inferred_type": inferred_type,
            "total": num_rows,
            "null_count": len(null_indices),
            "null_pct": round(len(null_indices) / num_rows * 100, 1),
            "unique_count": len(set(non_null)),
            "cardinality_pct": round(len(set(non_null)) / max(len(non_null), 1) * 100, 1),
        }

        # ── Numeric stats ──
        if inferred_type in ("int", "float"):
            nums: List[float] = []
            type_err_indices: set = set()
            for i, v in enumerate(vals):
                if v == "":
                    continue
                try:
                    nums.append(float(v))
                except ValueError:
                    type_err_indices.add(i)

            col_type_error_sets[c] = type_err_indices

            if nums:
                q1, median, q3 = _quartiles(nums)
                iqr = q3 - q1
                lower_fence = q1 - 1.5 * iqr
                upper_fence = q3 + 1.5 * iqr
                mean = sum(nums) / len(nums)
                try:
                    std = statistics.stdev(nums) if len(nums) > 1 else 0.0
                except Exception:
                    std = 0.0

                # IQR outliers
                iqr_outlier_indices: set = set()
                z_outlier_indices: set = set()
                numeric_row_map = []
                ni = 0
                for i, v in enumerate(vals):
                    if v == "" or i in type_err_indices:
                        continue
                    fv = float(v)
                    numeric_row_map.append((i, fv))
                    if fv < lower_fence or fv > upper_fence:
                        iqr_outlier_indices.add(i)
                    if std > 0 and abs(fv - mean) / std > 3:
                        z_outlier_indices.add(i)

                all_outlier_idx = iqr_outlier_indices | z_outlier_indices
                col_outlier_sets[c] = all_outlier_idx

                outlier_details = []
                for i, fv in numeric_row_map:
                    if i in all_outlier_idx:
                        z = round((fv - mean) / std, 2) if std > 0 else None
                        outlier_details.append({
                            "row": i + 1,
                            "value": fv,
                            "method": "IQR" if i in iqr_outlier_indices else "Z-score",
                            "z_score": z,
                            "fence_low": round(lower_fence, 4),
                            "fence_high": round(upper_fence, 4),
                        })

                profile.update({
                    "min": round(min(nums), 4),
                    "max": round(max(nums), 4),
                    "mean": round(mean, 4),
                    "median": round(median, 4),
                    "std": round(std, 4),
                    "q1": round(q1, 4),
                    "q3": round(q3, 4),
                    "iqr": round(iqr, 4),
                    "outlier_count": len(all_outlier_idx),
                    "outlier_pct": round(len(all_outlier_idx) / num_rows * 100, 1),
                    "outliers": outlier_details,
                    "type_error_count": len(type_err_indices),
                    "type_error_rows": sorted(i + 1 for i in type_err_indices),
                })
            else:
                profile.update({
                    "type_error_count": len(type_err_indices),
                    "type_error_rows": sorted(i + 1 for i in type_err_indices),
                    "outlier_count": 0,
                    "outliers": [],
                })

        # ── String / categorical stats ──
        else:
            counter = Counter(non_null)
            top5 = counter.most_common(5)

            # Pattern fingerprinting
            patterns = [_pattern_fingerprint(v) for v in non_null]
            pattern_counter = Counter(patterns)
            dominant_pattern = pattern_counter.most_common(1)[0][0] if patterns else "empty"
            pattern_anomaly_indices = {
                i for i, v in enumerate(vals)
                if v != "" and _pattern_fingerprint(v) != dominant_pattern
            }
            col_type_error_sets[c] = pattern_anomaly_indices  # treat pattern anomalies as errors

            known_values = set(counter.keys())
            # Flag values that appear only once and differ from known set profile
            singleton_anomalies = {v for v, cnt in counter.items() if cnt == 1}

            profile.update({
                "top_values": [{"value": v, "count": c2} for v, c2 in top5],
                "dominant_pattern": dominant_pattern,
                "pattern_distribution": dict(pattern_counter),
                "pattern_anomaly_count": len(pattern_anomaly_indices),
                "pattern_anomaly_rows": sorted(i + 1 for i in pattern_anomaly_indices),
                "singleton_anomalies": list(singleton_anomalies)[:10],
                "type_error_count": 0,
                "outlier_count": 0,
                "outliers": [],
            })

        column_profiles.append(profile)

    # ── 4. Per-row anomaly scoring ──
    anomalous_rows: List[Dict[str, Any]] = []
    for r_idx, row in enumerate(data_rows):
        row_issues: List[Dict[str, Any]] = []

        for c in range(num_cols):
            cell = row[c].strip() if c < len(row) else ""
            issues_for_cell = []

            if r_idx in col_null_sets[c]:
                issues_for_cell.append({"type": "NULL", "severity": "ERROR", "detail": "Missing/empty value"})
            if r_idx in col_type_error_sets[c]:
                p = column_profiles[c]
                if p["inferred_type"] in ("int", "float"):
                    issues_for_cell.append({
                        "type": "TYPE_ERROR",
                        "severity": "ERROR",
                        "detail": f"'{cell}' is not a valid {p['inferred_type']}",
                    })
                else:
                    issues_for_cell.append({
                        "type": "PATTERN_ANOMALY",
                        "severity": "WARNING",
                        "detail": f"'{cell}' pattern differs from dominant '{p['dominant_pattern']}'",
                    })
            if r_idx in col_outlier_sets[c]:
                p = column_profiles[c]
                issues_for_cell.append({
                    "type": "OUTLIER",
                    "severity": "WARNING",
                    "detail": f"Value {cell} is a statistical outlier (IQR fence: [{p.get('q1', '?')-1.5*p.get('iqr', 0):.2f}, {p.get('q3', '?')+1.5*p.get('iqr', 0):.2f}])",
                })

            if issues_for_cell:
                row_issues.append({
                    "col_index": c,
                    "col_name": headers[c] if c < len(headers) else f"col_{c}",
                    "cell_value": cell,
                    "issues": issues_for_cell,
                })

        if row_issues:
            # Anomaly score: errors worth 2, warnings worth 1
            score = sum(
                2 if i["severity"] == "ERROR" else 1
                for col_issue in row_issues
                for i in col_issue["issues"]
            )
            anomalous_rows.append({
                "row": r_idx + 1,
                "cells": row[:num_cols],
                "anomaly_score": score,
                "issues": row_issues,
            })

    # Sort by severity descending
    anomalous_rows.sort(key=lambda x: -x["anomaly_score"])

    # ── 5. Quality Score ──
    total_cells = num_rows * num_cols
    total_nulls = sum(len(s) for s in col_null_sets)
    total_type_errors = sum(len(s) for s in col_type_error_sets)
    total_outliers = sum(len(s) for s in col_outlier_sets)

    null_pct = total_nulls / max(total_cells, 1) * 100
    type_err_pct = total_type_errors / max(total_cells, 1) * 100
    outlier_pct = total_outliers / max(total_cells, 1) * 100

    quality_score = max(0, round(
        100
        - (null_pct * 0.30)
        - (type_err_pct * 0.40)
        - (outlier_pct * 0.15)
    ))

    if quality_score >= 90:
        quality_band = "Excellent"
    elif quality_score >= 75:
        quality_band = "Good"
    elif quality_score >= 50:
        quality_band = "Fair"
    else:
        quality_band = "Poor"

    return {
        "success": True,
        "num_rows": num_rows,
        "num_cols": num_cols,
        "headers": headers,
        "quality_score": quality_score,
        "quality_band": quality_band,
        "total_null_count": total_nulls,
        "total_type_errors": total_type_errors,
        "total_outliers": total_outliers,
        "column_profiles": column_profiles,
        "anomalous_rows": anomalous_rows,
        "anomalous_row_count": len(anomalous_rows),
    }


def run_benchmark(row_count: int = 10000) -> Dict[str, Any]:
    """
    Generates a synthetic CSV workload of `row_count` rows, then measures:
      - Reader throughput: wall-clock time of `streamcsv.exe inspect`
      - Validator throughput: wall-clock time of `streamcsv.exe validate`
      - Writer throughput: wall-clock time of Python RFC 4180 write loop
    Returns all metrics as a flat dict ready for the frontend.
    """
    import time
    import io as _io2

    bin_path = get_binary_path()

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
        t0 = time.perf_counter()
        subprocess.run(
            [str(bin_path), "inspect", tmp_path, "-n", "0", "--header"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        reader_dur = time.perf_counter() - t0
        results["reader_mb_s"] = round(data_mb / reader_dur, 2) if reader_dur > 0 else 0
        results["reader_records_s"] = int(row_count / reader_dur) if reader_dur > 0 else 0
        results["reader_duration_ms"] = round(reader_dur * 1000, 1)

        col_types = ["int", "string", "string", "float", "bool", "string"]
        t0 = time.perf_counter()
        subprocess.run(
            [str(bin_path), "validate", tmp_path] + col_types,
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        validator_dur = time.perf_counter() - t0
        results["validator_rows_s"] = int(row_count / validator_dur) if validator_dur > 0 else 0
        results["validator_duration_ms"] = round(validator_dur * 1000, 1)

        t0 = time.perf_counter()
        buf = _io2.StringIO()
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
