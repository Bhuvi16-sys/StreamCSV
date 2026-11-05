from typing import Any, Dict, List, Optional
import io
import json
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.engine_bridge import inspect_csv, validate_csv, get_binary_path, run_benchmark

app = FastAPI(
    title="StreamCSV Engine API",
    description="High-performance backend bridge to StreamCSV C++17 streaming parser and validator",
    version="0.2.0",
)

# Enable CORS for local Vite React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInspectRequest(BaseModel):
    csv_text: str
    preview_count: int = 10
    delimiter: str = ","
    has_header: bool = True


class TextValidateRequest(BaseModel):
    csv_text: str
    column_types: List[str]


class WriteRequest(BaseModel):
    records: List[List[str]]
    delimiter: str = ","
    quote: str = '"'


class BenchmarkRequest(BaseModel):
    row_count: int = 10000


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    try:
        bin_path = str(get_binary_path())
        return {
            "status": "healthy",
            "engine": "StreamCSV C++17 Engine",
            "binary_path": bin_path,
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
        }


@app.get("/api/metrics")
def engine_metrics() -> Dict[str, Any]:
    """Returns static engine metadata: buffer size, memory model, version."""
    try:
        bin_path = str(get_binary_path())
    except Exception:
        bin_path = "not found"
    return {
        "chunk_buffer_kb": 8,
        "memory_model": "O(1)",
        "version": "0.2.0",
        "binary_path": bin_path,
        "description": "Bounded 8 KB chunk buffer; heap footprint does not grow with input size",
    }


@app.post("/api/benchmark")
def benchmark_endpoint(req: BenchmarkRequest) -> Dict[str, Any]:
    """Generates a synthetic CSV workload and times the C++ Reader and Validator plus Python Writer."""
    if req.row_count < 100:
        req.row_count = 100
    if req.row_count > 200_000:
        req.row_count = 200_000
    return run_benchmark(req.row_count)


@app.get("/api/sample")
def get_sample_csv() -> Dict[str, str]:
    sample = (
        "id,name,email,score,active,bio\n"
        "101,Alice Smith,alice@example.com,98.5,true,\"Senior Platform Engineer\"\n"
        "102,Bob Jones,bob@example.com,84.0,false,\"Product \\\"Specialist\\\" & Designer\"\n"
        "103,Charlie Brown,charlie@example.com,91.25,true,\"DevOps \\\"Kubernetes\\\" Lead\"\n"
        "104,Diana Prince,diana@example.com,99.9,true,\"Engineering Director\"\n"
    )
    return {"csv_text": sample}


@app.post("/api/inspect")
async def inspect_endpoint(
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    preview_count: int = Form(10),
    delimiter: str = Form(","),
    has_header: bool = Form(True),
) -> Dict[str, Any]:
    content: Optional[bytes] = None

    if file is not None:
        content = await file.read()
    elif csv_text is not None:
        content = csv_text.encode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Either 'file' or 'csv_text' must be provided.")

    return inspect_csv(
        file_content=content,
        preview_count=preview_count,
        delimiter=delimiter,
        has_header=has_header,
    )


@app.post("/api/inspect/json")
def inspect_json_endpoint(req: TextInspectRequest) -> Dict[str, Any]:
    return inspect_csv(
        file_content=req.csv_text.encode("utf-8"),
        preview_count=req.preview_count,
        delimiter=req.delimiter,
        has_header=req.has_header,
    )


@app.post("/api/validate")
async def validate_endpoint(
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    column_types: str = Form("[]"),  # JSON array string: '["int", "string", ...]'
) -> Dict[str, Any]:
    content: Optional[bytes] = None

    if file is not None:
        content = await file.read()
    elif csv_text is not None:
        content = csv_text.encode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Either 'file' or 'csv_text' must be provided.")

    try:
        types_list = json.loads(column_types) if isinstance(column_types, str) else column_types
    except Exception:
        types_list = [t.strip() for t in column_types.split(",") if t.strip()]

    return validate_csv(
        column_types=types_list,
        file_content=content,
    )


@app.post("/api/validate/json")
def validate_json_endpoint(req: TextValidateRequest) -> Dict[str, Any]:
    return validate_csv(
        column_types=req.column_types,
        file_content=req.csv_text.encode("utf-8"),
    )


@app.post("/api/write")
def write_endpoint(req: WriteRequest) -> PlainTextResponse:
    output = io.StringIO()
    delim = req.delimiter
    quote = req.quote

    for row in req.records:
        escaped_fields = []
        for field in row:
            # RFC 4180 quote escaping
            if delim in field or quote in field or "\n" in field or "\r" in field:
                escaped = field.replace(quote, quote + quote)
                escaped_fields.append(f"{quote}{escaped}{quote}")
            else:
                escaped_fields.append(field)
        output.write(delim.join(escaped_fields) + "\r\n")

    return PlainTextResponse(output.getvalue(), media_type="text/csv")


# Serve compiled React frontend assets if built
dist_path = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")
