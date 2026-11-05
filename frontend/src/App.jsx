import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, Terminal, Settings2, Download, RefreshCw, Sliders,
  ShieldCheck, Layers, Zap, FileText, Table2,
  Plus, Trash2, ChevronDown, ChevronRight, Play, ArrowDownToLine,
  TrendingUp, Activity, BarChart2, Hash, Type, ToggleLeft, Sparkles,
  AlertCircle, Info, FlaskConical
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspect');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('sample.csv');
  const [loading, setLoading] = useState(false);
  const [engineHealth, setEngineHealth] = useState(null);
  // Step 3: live engine metadata
  const [engineMetrics, setEngineMetrics] = useState(null);

  // Inspector State
  const [inspectData, setInspectData] = useState(null);
  const [delimiter, setDelimiter] = useState(',');
  const [previewCount, setPreviewCount] = useState(10);
  const [hasHeader, setHasHeader] = useState(true);
  // Step 4: raw output panel toggle
  const [rawOutputOpen, setRawOutputOpen] = useState(false);

  // Schema Validator State
  const [schemaColumns, setSchemaColumns] = useState([]);
  const [validateData, setValidateData] = useState(null);

  // Writer State — Step 6: start empty (1 header + 1 blank data row)
  const [writerDelim, setWriterDelim] = useState(',');
  const [writerQuote, setWriterQuote] = useState('"');
  const rowIdCounter = useRef(2);
  const makeRow = (cells) => ({ id: rowIdCounter.current++, cells });
  const [writerRecords, setWriterRecords] = useState([
    { id: 0, cells: ['Column 1', 'Column 2'] },
    { id: 1, cells: ['', ''] },
  ]);

  // Step 7: Benchmark State
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkRowCount, setBenchmarkRowCount] = useState(10000);

  // Data Quality Profiler State
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [expandedAnomalyRow, setExpandedAnomalyRow] = useState(null);

  // ── On mount: health, metrics, sample data ──
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setEngineHealth(data))
      .catch(() => setEngineHealth({ status: 'offline' }));

    // Step 3: fetch live engine metadata
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => setEngineMetrics(data))
      .catch(() => {});

    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    try {
      const res = await fetch('/api/sample');
      const data = await res.json();
      setCsvText(data.csv_text);
      setFileName('sample.csv');
      runInspect(data.csv_text);
    } catch (e) {
      console.error('Failed to load sample', e);
    }
  };

  const runInspect = async (textToInspect = csvText) => {
    if (!textToInspect.trim()) return;
    setLoading(true);
    setValidateData(null);
    setRawOutputOpen(false);
    try {
      const res = await fetch('/api/inspect/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_text: textToInspect,
          preview_count: previewCount,
          delimiter,
          has_header: hasHeader,
        }),
      });
      const data = await res.json();
      setInspectData(data);

      if (data.headers && data.headers.length > 0) {
        setSchemaColumns(
          data.headers.map(h => ({ name: h, type: inferTypeFromName(h), required: true }))
        );
      } else if (data.columns_min > 0) {
        setSchemaColumns(
          Array.from({ length: data.columns_min }, (_, i) => ({
            name: `col_${i + 1}`,
            type: 'string',
            required: true,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const inferTypeFromName = name => {
    const l = name.toLowerCase();
    if (l.includes('id') || l.includes('age') || l.includes('count') || l.includes('year')) return 'int';
    if (l.includes('score') || l.includes('price') || l.includes('rate') || l.includes('salary') || l.includes('amount')) return 'float';
    if (l.includes('active') || l.includes('is_') || l.includes('enabled')) return 'bool';
    return 'string';
  };

  const runValidate = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/validate/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_text: csvText,
          column_types: schemaColumns.map(c => c.type),
        }),
      });
      const data = await res.json();
      setValidateData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runProfile = async (textToProfile = csvText) => {
    if (!textToProfile.trim()) return;
    setProfileLoading(true);
    setProfileData(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_text: textToProfile,
          delimiter,
          has_header: hasHeader,
        }),
      });
      const data = await res.json();
      setProfileData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  // Step 7: live benchmark runner
  const runBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_count: benchmarkRowCount }),
      });
      const data = await res.json();
      setBenchmarkData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const handleFileUpload = e => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = event => {
        const text = event.target?.result;
        setCsvText(text);
        runInspect(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadGenerated = async () => {
    try {
      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: writerRecords.map(r => r.cells), delimiter: writerDelim, quote: writerQuote }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'streamcsv_output.csv';
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Step 6: Writer table operations ──
  const addWriterRow = () => {
    const colCount = writerRecords[0]?.cells.length || 1;
    setWriterRecords(prev => [...prev, makeRow(Array(colCount).fill(''))]);
  };

  const deleteWriterRow = id => {
    setWriterRecords(prev => {
      if (prev.length <= 2) return prev; // keep at least header + 1 row
      return prev.filter(r => r.id !== id);
    });
  };

  const addWriterColumn = () => {
    setWriterRecords(prev =>
      prev.map((row, i) => ({
        ...row,
        cells: [...row.cells, i === 0 ? `Column ${row.cells.length + 1}` : ''],
      }))
    );
  };

  const deleteWriterColumn = colIdx => {
    if ((writerRecords[0]?.cells.length || 0) <= 1) return;
    setWriterRecords(prev =>
      prev.map(row => ({ ...row, cells: row.cells.filter((_, i) => i !== colIdx) }))
    );
  };

  const updateWriterCell = (id, cIdx, value) => {
    setWriterRecords(prev =>
      prev.map(row =>
        row.id === id
          ? { ...row, cells: row.cells.map((c, i) => (i === cIdx ? value : c)) }
          : row
      )
    );
  };

  const importFromInspector = () => {
    if (!inspectData?.success) return;
    const rawRows = [];
    if (inspectData.headers?.length > 0) rawRows.push([...inspectData.headers]);
    inspectData.preview_rows?.forEach(r => rawRows.push([...r]));
    if (rawRows.length > 0) {
      rowIdCounter.current = 0;
      setWriterRecords(rawRows.map(cells => makeRow(cells)));
    }
  };

  // ── Step 5: per-column issue map ──
  const columnIssueMap = {};
  if (validateData?.issues) {
    validateData.issues.forEach(issue => {
      if (!columnIssueMap[issue.field_index]) columnIssueMap[issue.field_index] = [];
      columnIssueMap[issue.field_index].push(issue);
    });
  }

  // Helpers
  const fmtNum = n => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  const benchMaxMbS = benchmarkData
    ? Math.max(benchmarkData.reader_mb_s || 0, benchmarkData.writer_mb_s || 0, 1)
    : 100;

  const benchMaxRecS = benchmarkData
    ? Math.max(benchmarkData.reader_records_s || 0, benchmarkData.validator_rows_s || 0, benchmarkData.writer_records_s || 0, 1)
    : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* ══════════ TOP NAVBAR ══════════ */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">StreamCSV</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v0.2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">C++17 Bounded-Memory Streaming Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={loadSampleData}
            className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Load Sample Data</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <span className={`h-2 w-2 rounded-full ${engineHealth?.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-slate-300">
              {engineHealth?.status === 'healthy' ? 'C++ Engine Connected' : 'Engine Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
        {[
            { id: 'inspect',   Icon: FileSpreadsheet, label: 'Inspector & Visualizer' },
            { id: 'validate',  Icon: ShieldCheck,     label: 'Schema Validator' },
            { id: 'profile',   Icon: FlaskConical,    label: 'Data Quality Studio' },
            { id: 'writer',    Icon: Table2,          label: 'RFC 4180 Writer' },
            { id: 'benchmark', Icon: Zap,             label: 'Engine Telemetry' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${
                activeTab === id
                  ? id === 'profile'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {id === 'profile' && profileData && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  profileData.quality_score >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                  profileData.quality_score >= 75 ? 'bg-sky-500/20 text-sky-400' :
                  profileData.quality_score >= 50 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{profileData.quality_score}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════
            TAB 1 · INSPECTOR & VISUALIZER
            ═══════════════════════════════════════ */}
        {activeTab === 'inspect' && (
          <div className="space-y-6">

            {/* Input & Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CSV source textarea */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-sky-400" />
                    <span className="font-semibold text-sm text-slate-200">CSV Source Ingestion</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{fileName}</span>
                </div>

                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  rows={6}
                  placeholder="Paste CSV text here or upload a file below..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500/50 resize-none"
                />

                <div className="flex items-center justify-between pt-2">
                  <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center space-x-2">
                    <UploadCloud className="h-4 w-4 text-sky-400" />
                    <span>Upload CSV File</span>
                    <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    onClick={() => runInspect(csvText)}
                    disabled={loading}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sliders className="h-3.5 w-3.5" />}
                    <span>Inspect with C++ Engine</span>
                  </button>
                </div>
              </div>

              {/* Parser Config */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <Settings2 className="h-4 w-4 text-sky-400" />
                  <span>Parser Config</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Field Delimiter</label>
                    <select
                      value={delimiter}
                      onChange={e => setDelimiter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-200"
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="&#9;">Tab (\t — TSV)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Preview Row Limit</label>
                    <input
                      type="number"
                      value={previewCount}
                      min={1}
                      max={100}
                      onChange={e => setPreviewCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasHeader}
                        onChange={e => setHasHeader(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0"
                      />
                      <span className="text-slate-300">Extract first row as header</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            {inspectData && inspectData.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Total Records</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {inspectData.total_records.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Column Count</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {inspectData.columns_min}
                    {inspectData.columns_min !== inspectData.columns_max && (
                      <span className="text-sm text-amber-400 font-normal"> to {inspectData.columns_max}</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Uniformity Status</div>
                  <div className="mt-2">
                    {inspectData.is_ragged ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Ragged Rows</span>
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Strictly Rectangular</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 3: Live Memory Budget card */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Memory Budget</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {engineMetrics ? `${engineMetrics.chunk_buffer_kb} KB` : '8 KB'}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      {engineMetrics?.memory_model ?? 'O(1)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {engineMetrics ? 'live · /api/metrics' : 'fallback default'}
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {inspectData && !inspectData.success && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start space-x-3 text-xs">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold block mb-0.5">Parse or I/O Error Encountered (Exit Code 2)</span>
                  <p className="font-mono">{inspectData.error}</p>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {inspectData?.preview_rows?.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <span className="text-xs font-semibold text-slate-300">
                    Live Stream Preview (First {inspectData.preview_rows.length} rows)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Bounded Stream</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-slate-500">#</th>
                        {(inspectData.headers.length > 0
                          ? inspectData.headers
                          : inspectData.preview_rows[0]
                        ).map((h, i) => (
                          <th key={i} className="py-2.5 px-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {inspectData.preview_rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-4 text-slate-500">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-4 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Collapsible C++ Raw Output Panel */}
            {inspectData?.raw_output && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setRawOutputOpen(o => !o)}
                  className="w-full px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-800/30 transition"
                >
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">C++ Engine Raw Output</span>
                    <span className="text-slate-500 font-normal">
                      — {rawOutputOpen ? 'click to hide' : 'click to expand'}
                    </span>
                  </div>
                  {rawOutputOpen
                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 text-slate-400" />
                  }
                </button>

                {rawOutputOpen && (
                  <div className="border-t border-slate-800 bg-slate-950 px-5 py-4 overflow-x-auto">
                    <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {inspectData.raw_output.split('\n').map((line, i) => {
                        const isKey = /total records|header|columns|warning/i.test(line);
                        return (
                          <span key={i} className={isKey ? 'text-sky-400' : 'text-emerald-400'}>
                            {line}{'\n'}
                          </span>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 2 · SCHEMA VALIDATOR
            ═══════════════════════════════════════ */}
        {activeTab === 'validate' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Interactive Schema Builder</h3>
                  <p className="text-xs text-slate-400">
                    Define scalar data types per column. Results are validated by StreamCSV's decoupled Layer 3 Validator.
                  </p>
                </div>

                <button
                  onClick={runValidate}
                  disabled={loading || schemaColumns.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <ShieldCheck className="h-3.5 w-3.5" />
                  }
                  <span>Run Schema Validation</span>
                </button>
              </div>

              {/* Step 5: Column chips with per-column pass/fail badges + error-rate bars */}
              {schemaColumns.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  Run the Inspector first — schema columns are auto-populated from detected headers.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {schemaColumns.map((col, idx) => {
                    const issues = columnIssueMap[idx] || [];
                    const validated = validateData !== null;
                    const hasIssues = issues.length > 0;

                    return (
                      <div
                        key={idx}
                        className={`bg-slate-950 border p-3 rounded-lg flex flex-col space-y-2 transition-all duration-300 ${
                          validated
                            ? hasIssues
                              ? 'border-red-500/40 shadow-sm shadow-red-500/10'
                              : 'border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-xs font-mono font-medium text-slate-200 block truncate max-w-[120px]">
                              {col.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Col #{idx + 1}</span>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {/* Pass/Fail badge */}
                            {validated && (
                              hasIssues ? (
                                <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                                  <XCircle className="h-2.5 w-2.5" />
                                  <span>{issues.length} err</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  <span>OK</span>
                                </span>
                              )
                            )}

                            <select
                              value={col.type}
                              onChange={e => {
                                const next = [...schemaColumns];
                                next[idx] = { ...next[idx], type: e.target.value };
                                setSchemaColumns(next);
                              }}
                              className="bg-slate-900 border border-slate-700 text-xs text-sky-400 rounded p-1.5 focus:outline-none"
                            >
                              <option value="string">String</option>
                              <option value="int">Integer</option>
                              <option value="float">Float</option>
                              <option value="bool">Boolean</option>
                            </select>
                          </div>
                        </div>

                        {/* Error-rate mini-bar */}
                        {validated && hasIssues && (inspectData?.total_records || 0) > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span>Error rate</span>
                              <span className="text-red-400 font-mono">
                                {((issues.length / inspectData.total_records) * 100).toFixed(1)}%
                                <span className="text-slate-600 ml-1">({issues.length}/{inspectData.total_records})</span>
                              </span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-1 bg-red-500 rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.min((issues.length / inspectData.total_records) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Outcome Banner */}
            {validateData && (
              <div className="space-y-4">
                {validateData.success ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center space-x-3 text-xs">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-sm block">Validation Successful! (Exit Code 0)</span>
                      <span>Processed {validateData.records_processed} record(s) — 0 violations across all {schemaColumns.length} columns.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-center space-x-3 text-xs">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-sm block">
                        {validateData.issues_count} Violation(s) Detected — Exit Code 1
                      </span>
                      <span>StreamCSV flagged schema type violations. See the issue log below and the column badges above.</span>
                    </div>
                  </div>
                )}

                {/* Issues Table */}
                {validateData.issues?.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Severity</th>
                          <th className="py-2.5 px-4">Line</th>
                          <th className="py-2.5 px-4">Field</th>
                          <th className="py-2.5 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {validateData.issues.map((issue, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                {issue.severity}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-sky-400">Line {issue.line}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-200">
                              {issue.field_name}
                              <span className="text-slate-500 font-normal ml-1">(idx {issue.field_index})</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">{issue.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 3 · DATA QUALITY STUDIO
            ═══════════════════════════════════════ */}
        {activeTab === 'profile' && (() => {
          const scoreColor = !profileData ? 'text-slate-400' :
            profileData.quality_score >= 90 ? 'text-emerald-400' :
            profileData.quality_score >= 75 ? 'text-sky-400' :
            profileData.quality_score >= 50 ? 'text-amber-400' : 'text-red-400';

          const scoreBg = !profileData ? 'border-slate-700' :
            profileData.quality_score >= 90 ? 'border-emerald-500/30 bg-emerald-500/5' :
            profileData.quality_score >= 75 ? 'border-sky-500/30 bg-sky-500/5' :
            profileData.quality_score >= 50 ? 'border-amber-500/30 bg-amber-500/5' :
            'border-red-500/30 bg-red-500/5';

          const typeIcon = (t) => {
            if (t === 'int') return <Hash className="h-3 w-3 text-sky-400" />;
            if (t === 'float') return <TrendingUp className="h-3 w-3 text-violet-400" />;
            if (t === 'bool') return <ToggleLeft className="h-3 w-3 text-emerald-400" />;
            return <Type className="h-3 w-3 text-amber-400" />;
          };

          const typeLabel = (t) => ({int:'Integer',float:'Float',bool:'Boolean',string:'String',empty:'Empty'}[t] || t);

          return (
            <div className="space-y-6">

              {/* ── Header + Run button ── */}
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    Data Quality Studio
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Industry-grade profiling — IQR + Z-score outliers, pattern fingerprinting, null analysis, quality scoring.
                    <span className="text-slate-500 ml-1">No row limit — analyzes your entire dataset.</span>
                  </p>
                </div>
                <button
                  onClick={() => runProfile(csvText)}
                  disabled={profileLoading || !csvText.trim()}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-violet-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {profileLoading
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <FlaskConical className="h-3.5 w-3.5" />}
                  <span>{profileLoading ? 'Profiling...' : 'Run Deep Profile'}</span>
                </button>
              </div>

              {!profileData && !profileLoading && (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                  <FlaskConical className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No profile yet</p>
                  <p className="text-xs text-slate-600 mt-1">Load or paste CSV data, then click "Run Deep Profile"</p>
                </div>
              )}

              {profileData?.success && (() => {
                const p = profileData;
                return (
                  <>
                    {/* ── Quality Score + Summary ── */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                      {/* Big score */}
                      <div className={`md:col-span-1 border rounded-xl p-5 flex flex-col items-center justify-center ${scoreBg}`}>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Quality Score</div>
                        <div className={`text-5xl font-black font-mono ${scoreColor}`}>{p.quality_score}</div>
                        <div className={`text-xs font-semibold mt-1 ${scoreColor}`}>{p.quality_band}</div>
                        {/* Mini bar */}
                        <div className="w-full mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              p.quality_score >= 90 ? 'bg-emerald-500' :
                              p.quality_score >= 75 ? 'bg-sky-500' :
                              p.quality_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${p.quality_score}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats cards */}
                      {[
                        { label: 'Total Rows', value: p.num_rows.toLocaleString(), icon: <BarChart2 className="h-4 w-4 text-sky-400" />, sub: `${p.num_cols} columns` },
                        { label: 'Null Cells', value: p.total_null_count, icon: <AlertCircle className="h-4 w-4 text-amber-400" />, sub: p.total_null_count === 0 ? '✓ No nulls' : 'missing values', color: p.total_null_count > 0 ? 'text-amber-400' : 'text-emerald-400' },
                        { label: 'Type Errors', value: p.total_type_errors, icon: <XCircle className="h-4 w-4 text-red-400" />, sub: p.total_type_errors === 0 ? '✓ No violations' : 'type violations', color: p.total_type_errors > 0 ? 'text-red-400' : 'text-emerald-400' },
                        { label: 'Outliers', value: p.total_outliers, icon: <Activity className="h-4 w-4 text-violet-400" />, sub: p.total_outliers === 0 ? '✓ None detected' : 'statistical outliers', color: p.total_outliers > 0 ? 'text-violet-400' : 'text-emerald-400' },
                      ].map((s, i) => (
                        <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</span>
                            {s.icon}
                          </div>
                          <div className={`text-2xl font-bold font-mono ${s.color || 'text-white'}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Column Profiles ── */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BarChart2 className="h-3.5 w-3.5 text-sky-400" /> Column Profiles
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {p.column_profiles.map((col, ci) => {
                          const hasIssue = col.null_count > 0 || col.type_error_count > 0 || col.outlier_count > 0 || col.pattern_anomaly_count > 0;
                          const borderClass = hasIssue
                            ? (col.type_error_count > 0 ? 'border-red-500/30' : 'border-amber-500/30')
                            : 'border-slate-800';
                          return (
                            <div key={ci} className={`bg-slate-900/60 border rounded-xl p-4 space-y-3 ${borderClass}`}>
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-slate-100 block truncate">{col.name}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {typeIcon(col.inferred_type)}
                                    <span className="text-[10px] text-slate-400">{typeLabel(col.inferred_type)}</span>
                                  </div>
                                </div>
                                {hasIssue
                                  ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                  : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                }
                              </div>

                              {/* Stats grid */}
                              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                                <div className="bg-slate-950/60 rounded p-1.5">
                                  <div className="text-slate-500">Null %</div>
                                  <div className={col.null_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                    {col.null_pct}% ({col.null_count})
                                  </div>
                                </div>
                                <div className="bg-slate-950/60 rounded p-1.5">
                                  <div className="text-slate-500">Unique</div>
                                  <div className="text-slate-200">{col.unique_count} <span className="text-slate-500">({col.cardinality_pct}%)</span></div>
                                </div>

                                {col.inferred_type === 'int' || col.inferred_type === 'float' ? (<>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Min / Max</div>
                                    <div className="text-slate-200">{col.min} / {col.max}</div>
                                  </div>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Mean ± Std</div>
                                    <div className="text-slate-200">{col.mean} <span className="text-slate-500">±{col.std}</span></div>
                                  </div>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Median / IQR</div>
                                    <div className="text-slate-200">{col.median} <span className="text-slate-500">({col.iqr})</span></div>
                                  </div>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Outliers</div>
                                    <div className={col.outlier_count > 0 ? 'text-violet-400' : 'text-emerald-400'}>
                                      {col.outlier_count} {col.outlier_count > 0 ? '⚠' : '✓'}
                                    </div>
                                  </div>
                                </>) : (<>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Pattern</div>
                                    <div className="text-slate-200 truncate" title={col.dominant_pattern}>{col.dominant_pattern || '—'}</div>
                                  </div>
                                  <div className="bg-slate-950/60 rounded p-1.5">
                                    <div className="text-slate-500">Anomalies</div>
                                    <div className={col.pattern_anomaly_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                      {col.pattern_anomaly_count} {col.pattern_anomaly_count > 0 ? '⚠' : '✓'}
                                    </div>
                                  </div>
                                </>)}

                                {col.type_error_count > 0 && (
                                  <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded p-1.5">
                                    <div className="text-red-400">⛔ {col.type_error_count} type error(s) — rows: {col.type_error_rows?.slice(0,5).join(', ')}{col.type_error_rows?.length > 5 ? '...' : ''}</div>
                                  </div>
                                )}
                              </div>

                              {/* Top values for strings */}
                              {col.top_values?.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Top Values</div>
                                  {col.top_values.slice(0, 3).map((tv, ti) => (
                                    <div key={ti} className="flex items-center gap-2">
                                      <div
                                        className="h-1 bg-sky-500/40 rounded-full flex-shrink-0"
                                        style={{ width: `${Math.round(tv.count / p.num_rows * 100)}%`, minWidth: '4px', maxWidth: '60%' }}
                                      />
                                      <span className="text-[10px] font-mono text-slate-300 truncate">{tv.value}</span>
                                      <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">{tv.count}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Anomalous Rows Explorer ── */}
                    {p.anomalous_rows.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          Anomalous Rows
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            {p.anomalous_rows.length} row{p.anomalous_rows.length !== 1 ? 's' : ''} flagged
                          </span>
                          <span className="text-slate-600 font-normal normal-case">— sorted by severity</span>
                        </h4>
                        <div className="space-y-2">
                          {p.anomalous_rows.map((ar) => {
                            const isExpanded = expandedAnomalyRow === ar.row;
                            const errorCount = ar.issues.flatMap(i => i.issues).filter(i => i.severity === 'ERROR').length;
                            const warnCount = ar.issues.flatMap(i => i.issues).filter(i => i.severity === 'WARNING').length;
                            return (
                              <div key={ar.row} className="border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition">
                                <button
                                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800/20 transition"
                                  onClick={() => setExpandedAnomalyRow(isExpanded ? null : ar.row)}
                                >
                                  {/* Row number */}
                                  <span className="text-[10px] font-mono text-slate-500 w-14 flex-shrink-0">Row {ar.row}</span>

                                  {/* Cell preview */}
                                  <div className="flex gap-2 flex-1 min-w-0 overflow-hidden">
                                    {ar.cells.map((cell, ci) => {
                                      const cellHasIssue = ar.issues.some(iss => iss.col_index === ci);
                                      return (
                                        <span key={ci} className={`text-[10px] font-mono px-2 py-0.5 rounded truncate max-w-[100px] ${
                                          cellHasIssue
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : 'bg-slate-800 text-slate-400'
                                        }`} title={`${p.headers[ci]}: ${cell}`}>
                                          {cell || <span className="italic text-slate-600">empty</span>}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {/* Issue badges */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {errorCount > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                                        {errorCount} ERR
                                      </span>
                                    )}
                                    {warnCount > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        {warnCount} WARN
                                      </span>
                                    )}
                                    {isExpanded
                                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                    }
                                  </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-3 space-y-2">
                                    {ar.issues.map((colIssue, ix) => (
                                      <div key={ix} className="flex items-start gap-3">
                                        <span className="text-[10px] font-mono text-sky-400 w-28 flex-shrink-0 pt-0.5">
                                          {colIssue.col_name}
                                        </span>
                                        <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 flex-shrink-0">
                                          "{colIssue.cell_value || '<empty>'}"
                                        </span>
                                        <div className="space-y-1">
                                          {colIssue.issues.map((iss, ji) => (
                                            <div key={ji} className={`text-[10px] flex items-center gap-1.5 ${
                                              iss.severity === 'ERROR' ? 'text-red-400' : 'text-amber-400'
                                            }`}>
                                              {iss.severity === 'ERROR'
                                                ? <XCircle className="h-3 w-3 flex-shrink-0" />
                                                : <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                              }
                                              <span className="font-mono font-semibold">[{iss.type}]</span>
                                              <span>{iss.detail}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {p.anomalous_rows.length === 0 && (
                      <div className="text-center py-8 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-emerald-400">No anomalies detected</p>
                        <p className="text-xs text-slate-500 mt-1">All rows passed type checks, pattern consistency, and outlier detection.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════
            TAB 4 · RFC 4180 WRITER
            ═══════════════════════════════════════ */}
        {activeTab === 'writer' && (

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">RFC 4180 Streaming Writer Studio</h3>
                <p className="text-xs text-slate-400">
                  Compose records and generate valid, quoted RFC 4180 CSV with configurable delimiters.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {/* Import from Inspector */}
                {inspectData?.success && (
                  <button
                    onClick={importFromInspector}
                    title="Copy inspected headers + preview rows into writer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 text-sky-400" />
                    <span>Import from Inspector</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadGenerated}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition flex items-center space-x-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export &amp; Download CSV</span>
                </button>
              </div>
            </div>

            {/* Config: delimiter + quote char */}
            <div className="grid grid-cols-2 gap-4 max-w-xs text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Delimiter</label>
                <input
                  type="text"
                  maxLength={1}
                  value={writerDelim}
                  onChange={e => setWriterDelim(e.target.value || ',')}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-center font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Quote Character</label>
                <input
                  type="text"
                  maxLength={1}
                  value={writerQuote}
                  onChange={e => setWriterQuote(e.target.value || '"')}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-center font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Table action toolbar */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={addWriterRow}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 rounded-lg transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
              <button
                onClick={addWriterColumn}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 rounded-lg transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Column</span>
              </button>
              <span className="text-slate-600 font-mono text-[10px] ml-2">
                {writerRecords.length - 1} data row(s) · {writerRecords[0]?.cells.length ?? 0} col(s)
              </span>
            </div>

            {/* Editable table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3 w-12 text-slate-600 text-[10px]">#</th>
                    {writerRecords[0]?.cells.map((_, cIdx) => (
                      <th key={cIdx} className="py-2 px-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-500 text-[10px]">Col {cIdx + 1}</span>
                          {(writerRecords[0]?.cells.length ?? 0) > 1 && (
                            <button
                              onClick={() => deleteWriterColumn(cIdx)}
                              className="text-slate-700 hover:text-red-400 transition"
                              title="Delete column"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {writerRecords.map((row, rIdx) => (
                    <tr key={row.id} className={rIdx === 0 ? 'bg-slate-900/50' : 'hover:bg-slate-800/20'}>
                      <td className="py-1.5 px-3 text-slate-600 font-mono text-[10px]">
                        {rIdx === 0 ? 'HDR' : rIdx}
                      </td>
                      {row.cells.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1 px-2">
                          <input
                            type="text"
                            value={cell}
                            onChange={e => updateWriterCell(row.id, cIdx, e.target.value)}
                            className={`w-full min-w-[80px] bg-transparent border border-transparent hover:border-slate-700 focus:border-sky-500/50 focus:bg-slate-950 rounded px-2 py-1 text-xs outline-none transition ${
                              rIdx === 0 ? 'font-semibold text-sky-300' : 'text-slate-200'
                            }`}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        {rIdx > 0 && (
                          <button
                            onClick={() => deleteWriterRow(row.id)}
                            className="text-slate-700 hover:text-red-400 transition p-1"
                            title="Delete row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB 4 · ENGINE TELEMETRY
            ═══════════════════════════════════════ */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">

            {/* Controls card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Engine Performance &amp; Micro-Benchmarks</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real wall-clock measurements — generates synthetic CSV and times the C++ engine live.
                  </p>
                </div>

                <div className="flex items-center space-x-4 flex-wrap gap-3">
                  {/* Row count selector */}
                  <div className="text-xs">
                    <div className="text-slate-400 mb-1.5">Synthetic Row Count</div>
                    <div className="flex items-center space-x-1">
                      {[1000, 10000, 50000, 100000].map(n => (
                        <button
                          key={n}
                          onClick={() => setBenchmarkRowCount(n)}
                          className={`px-3 py-1.5 rounded-md font-mono text-[11px] border transition ${
                            benchmarkRowCount === n
                              ? 'bg-sky-600 border-sky-500 text-white shadow shadow-sky-600/20'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500/40 hover:text-slate-100'
                          }`}
                        >
                          {n >= 1000 ? `${n / 1000}K` : n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={runBenchmark}
                    disabled={benchmarkLoading}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {benchmarkLoading
                      ? <RefreshCw className="h-4 w-4 animate-spin" />
                      : <Play className="h-4 w-4" />
                    }
                    <span>{benchmarkLoading ? 'Benchmarking...' : 'Run Live Benchmark'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {!benchmarkData && !benchmarkLoading && (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 text-center">
                <Zap className="h-9 w-9 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No benchmark data yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Select a row count above and click <strong className="text-slate-400">Run Live Benchmark</strong>.
                </p>
              </div>
            )}

            {/* Loading state */}
            {benchmarkLoading && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
                <RefreshCw className="h-9 w-9 text-sky-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-slate-400 font-medium">
                  Benchmarking {benchmarkRowCount.toLocaleString()} rows…
                </p>
                <p className="text-xs text-slate-500 mt-1">Invoking C++ engine via subprocess. Please wait.</p>
              </div>
            )}

            {/* Results */}
            {benchmarkData && !benchmarkLoading && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Reader */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Streaming Reader</span>
                      <span className="text-sky-400 font-mono">DFA State Machine</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {benchmarkData.reader_mb_s} <span className="text-sm font-normal text-slate-400">MB/s</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {fmtNum(benchmarkData.reader_records_s)} records/sec
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {benchmarkData.reader_duration_ms} ms · {benchmarkData.row_count.toLocaleString()} rows · {benchmarkData.data_mb} MB
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-sky-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((benchmarkData.reader_mb_s / benchMaxMbS) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Validator */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Schema Validator</span>
                      <span className="text-emerald-400 font-mono">Layer 3 Decoupled</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {fmtNum(benchmarkData.validator_rows_s)}<span className="text-sm font-normal text-slate-400">/s</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">rows validated per second</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {benchmarkData.validator_duration_ms} ms · {benchmarkData.row_count.toLocaleString()} rows
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((benchmarkData.validator_rows_s / benchMaxRecS) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Writer */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Streaming Writer</span>
                      <span className="text-purple-400 font-mono">RFC 4180 Escaping</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {benchmarkData.writer_mb_s} <span className="text-sm font-normal text-slate-400">MB/s</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {fmtNum(benchmarkData.writer_records_s)} records/sec
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {benchmarkData.writer_duration_ms} ms · {benchmarkData.row_count.toLocaleString()} rows
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((benchmarkData.writer_mb_s / benchMaxMbS) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* CSS Throughput Bar Chart */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="text-xs font-semibold text-slate-300 mb-4">
                    Throughput Comparison — MB/s
                    <span className="text-slate-500 font-normal ml-2">(Reader vs Writer)</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Reader',  value: benchmarkData.reader_mb_s,  bar: 'bg-sky-500',    text: 'text-sky-400' },
                      { label: 'Writer',  value: benchmarkData.writer_mb_s,  bar: 'bg-purple-500', text: 'text-purple-400' },
                    ].map(({ label, value, bar, text }) => (
                      <div key={label} className="flex items-center space-x-3 text-xs">
                        <span className={`w-14 text-right font-mono font-medium ${text}`}>{label}</span>
                        <div className="flex-1 h-7 bg-slate-800/80 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-7 ${bar} rounded-lg transition-all duration-700 opacity-80`}
                            style={{ width: `${Math.min((value / benchMaxMbS) * 100, 100)}%` }}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white text-[11px] drop-shadow">
                            {value} MB/s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Records/sec comparison */}
                  <div className="text-xs font-semibold text-slate-300 mt-5 mb-4">
                    Records Per Second
                    <span className="text-slate-500 font-normal ml-2">(Reader vs Validator vs Writer)</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Reader',    value: benchmarkData.reader_records_s,    bar: 'bg-sky-500',     text: 'text-sky-400' },
                      { label: 'Validator', value: benchmarkData.validator_rows_s,    bar: 'bg-emerald-500', text: 'text-emerald-400' },
                      { label: 'Writer',    value: benchmarkData.writer_records_s,    bar: 'bg-purple-500',  text: 'text-purple-400' },
                    ].map(({ label, value, bar, text }) => (
                      <div key={label} className="flex items-center space-x-3 text-xs">
                        <span className={`w-14 text-right font-mono font-medium ${text}`}>{label}</span>
                        <div className="flex-1 h-7 bg-slate-800/80 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-7 ${bar} rounded-lg transition-all duration-700 opacity-80`}
                            style={{ width: `${Math.min((value / benchMaxRecS) * 100, 100)}%` }}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white text-[11px] drop-shadow">
                            {fmtNum(value)}/s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Memory Guarantee Card */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-200 block">Peak Memory Consumption Guarantee</span>
                    <p className="text-slate-400">
                      RAM usage is strictly flat (O(1) scaling, &lt; 5 MB RSS) regardless of input size —
                      preventing DoS and OOM crashes on multi-gigabyte datasets.
                    </p>
                    {benchmarkData.data_mb && (
                      <p className="text-slate-500 font-mono">
                        Benchmark payload: {benchmarkData.data_mb} MB · {benchmarkData.row_count.toLocaleString()} rows
                      </p>
                    )}
                  </div>
                  <div className="text-right font-mono text-emerald-400 font-bold text-xl whitespace-nowrap pl-6">
                    &lt; 5 MB RSS
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
