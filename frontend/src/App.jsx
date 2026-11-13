import React, { useState, useEffect, useRef, useCallback } from 'react';

// In production → https://streamcsv.onrender.com  (set via VITE_API_BASE in Vercel)
// In dev        → '' (empty = relative URL, Vite proxy handles it)
const API_BASE = import.meta.env.VITE_API_BASE ?? '';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, Terminal, Settings2, Download, RefreshCw, Sliders,
  ShieldCheck, Layers, Zap, FileText, Table2,
  Plus, Trash2, ChevronDown, ChevronRight, Play, ArrowDownToLine,
  TrendingUp, Activity, BarChart2, Hash, Type, ToggleLeft, Sparkles,
  AlertCircle, Info, FlaskConical, ArrowRight, Cpu, Database
} from 'lucide-react';

// ─────────────────────────────────────────────
//  BentoCard — reusable obsidian bento surface
// ─────────────────────────────────────────────
function BentoCard({ children, className = '', style = {} }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${className}`}
      style={{
        background: '#0a0a0a',
        border: hovered ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.04), transparent 60%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Pill badge
// ─────────────────────────────────────────────
function Pill({ children, color = 'zinc' }) {
  const colors = {
    zinc:    'bg-white/[0.06] text-zinc-400 border-white/[0.08]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red:     'bg-red-500/10 text-red-400 border-red-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    violet:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
    sky:     'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${colors[color] || colors.zinc}`}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
//  Primary CTA button (inverted pill)
// ─────────────────────────────────────────────
function PrimaryButton({ onClick, disabled, loading, icon: Icon, children, color = 'white' }) {
  const configs = {
    white:  { bg: 'bg-white hover:bg-zinc-100',   text: 'text-black', shadow: 'shadow-white/10' },
    sky:    { bg: 'bg-sky-500 hover:bg-sky-400',   text: 'text-white', shadow: 'shadow-sky-500/20' },
    emerald:{ bg: 'bg-emerald-500 hover:bg-emerald-400', text: 'text-white', shadow: 'shadow-emerald-500/20' },
    violet: { bg: 'bg-violet-500 hover:bg-violet-400',   text: 'text-white', shadow: 'shadow-violet-500/20' },
    red:    { bg: 'bg-red-500 hover:bg-red-400',   text: 'text-white', shadow: 'shadow-red-500/20' },
  };
  const c = configs[color] || configs.white;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${c.bg} ${c.text} ${c.shadow}`}
      style={{ letterSpacing: '-0.01em' }}
    >
      {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
//  Ghost button
// ─────────────────────────────────────────────
function GhostButton({ onClick, children, icon: Icon, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
//  Metric KPI card
// ─────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, iconColor = 'text-zinc-500', valueColor = 'text-white', delay = 0 }) {
  return (
    <BentoCard className="p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
        {Icon && <Icon className={`h-3.5 w-3.5 ${iconColor}`} />}
      </div>
      <div className={`text-2xl font-bold tabular tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>}
    </BentoCard>
  );
}

// ─────────────────────────────────────────────
//  Mini progress bar
// ─────────────────────────────────────────────
function MiniBar({ value, max, color = 'bg-white' }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className={`h-1 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Section header
// ─────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor = 'text-zinc-500', title, sub, badge }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      {Icon && (
        <div className="mt-0.5 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
          {badge}
        </div>
        {sub && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Styled select / input
// ─────────────────────────────────────────────
const inputCls = "w-full rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none transition-all duration-200 focus:ring-1 focus:ring-white/20";
const inputStyle = { background: '#171717', border: '1px solid rgba(255,255,255,0.08)' };

// ─────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Icon className="h-10 w-10 text-zinc-700" />
      </div>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1 max-w-xs leading-relaxed">{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState('inspect');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [engineHealth, setEngineHealth] = useState(null);
  const [engineMetrics, setEngineMetrics] = useState(null);

  // Inspector State
  const [inspectData, setInspectData] = useState(null);
  const [delimiter, setDelimiter] = useState(',');
  const [previewCount, setPreviewCount] = useState(10);
  const [hasHeader, setHasHeader] = useState(true);
  const [rawOutputOpen, setRawOutputOpen] = useState(false);

  // Schema Validator State
  const [schemaColumns, setSchemaColumns] = useState([]);
  const [validateData, setValidateData] = useState(null);

  // Writer State
  const [writerDelim, setWriterDelim] = useState(',');
  const [writerQuote, setWriterQuote] = useState('"');
  const rowIdCounter = useRef(2);
  const makeRow = (cells) => ({ id: rowIdCounter.current++, cells });
  const [writerRecords, setWriterRecords] = useState([
    { id: 0, cells: ['Column 1', 'Column 2'] },
    { id: 1, cells: ['', ''] },
  ]);

  // Benchmark State
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkRowCount, setBenchmarkRowCount] = useState(10000);

  // Data Quality Profiler State
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [expandedAnomalyRow, setExpandedAnomalyRow] = useState(null);

  // ── On mount: health + metrics ──
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(res => res.json())
      .then(data => setEngineHealth(data))
      .catch(() => setEngineHealth({ status: 'offline' }));

    fetch(`${API_BASE}/api/metrics`)
      .then(res => res.json())
      .then(data => setEngineMetrics(data))
      .catch(() => {});
  }, []);

  const loadSampleData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sample`);
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
      const res = await fetch(`${API_BASE}/api/inspect/json`, {
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
        setSchemaColumns(data.headers.map(h => ({ name: h, type: inferTypeFromName(h), required: true })));
      } else if (data.columns_min > 0) {
        setSchemaColumns(Array.from({ length: data.columns_min }, (_, i) => ({ name: `col_${i + 1}`, type: 'string', required: true })));
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
      const res = await fetch(`${API_BASE}/api/validate/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: csvText, column_types: schemaColumns.map(c => c.type) }),
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
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: textToProfile, delimiter, has_header: hasHeader }),
      });
      const data = await res.json();
      setProfileData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  const runBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/benchmark`, {
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
      const res = await fetch(`${API_BASE}/api/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: writerRecords.map(r => r.cells), delimiter: writerDelim, quote: writerQuote }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'streamcsv_output.csv'; a.click();
    } catch (e) { console.error(e); }
  };

  const addWriterRow = () => {
    const colCount = writerRecords[0]?.cells.length || 1;
    setWriterRecords(prev => [...prev, makeRow(Array(colCount).fill(''))]);
  };
  const deleteWriterRow = id => {
    setWriterRecords(prev => { if (prev.length <= 2) return prev; return prev.filter(r => r.id !== id); });
  };
  const addWriterColumn = () => {
    setWriterRecords(prev => prev.map((row, i) => ({ ...row, cells: [...row.cells, i === 0 ? `Column ${row.cells.length + 1}` : ''] })));
  };
  const deleteWriterColumn = colIdx => {
    if ((writerRecords[0]?.cells.length || 0) <= 1) return;
    setWriterRecords(prev => prev.map(row => ({ ...row, cells: row.cells.filter((_, i) => i !== colIdx) })));
  };
  const updateWriterCell = (id, cIdx, value) => {
    setWriterRecords(prev => prev.map(row => row.id === id ? { ...row, cells: row.cells.map((c, i) => i === cIdx ? value : c) } : row));
  };
  const importFromInspector = () => {
    if (!inspectData?.success) return;
    const rawRows = [];
    if (inspectData.headers?.length > 0) rawRows.push([...inspectData.headers]);
    inspectData.preview_rows?.forEach(r => rawRows.push([...r]));
    if (rawRows.length > 0) { rowIdCounter.current = 0; setWriterRecords(rawRows.map(cells => makeRow(cells))); }
  };

  // Per-column issue map
  const columnIssueMap = {};
  if (validateData?.issues) {
    validateData.issues.forEach(issue => {
      if (!columnIssueMap[issue.field_index]) columnIssueMap[issue.field_index] = [];
      columnIssueMap[issue.field_index].push(issue);
    });
  }

  const fmtNum = n => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  const benchMaxMbS = benchmarkData ? Math.max(benchmarkData.reader_mb_s || 0, benchmarkData.writer_mb_s || 0, 1) : 100;
  const benchMaxRecS = benchmarkData ? Math.max(benchmarkData.reader_records_s || 0, benchmarkData.validator_rows_s || 0, benchmarkData.writer_records_s || 0, 1) : 1;

  // Tab definitions
  const TABS = [
    { id: 'inspect',   Icon: FileSpreadsheet, label: 'Inspector' },
    { id: 'validate',  Icon: ShieldCheck,     label: 'Schema Validator' },
    { id: 'profile',   Icon: FlaskConical,    label: 'Data Quality' },
    { id: 'writer',    Icon: Table2,          label: 'RFC Writer' },
    { id: 'benchmark', Icon: Zap,             label: 'Telemetry' },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: '#000000', color: '#ffffff' }}>

      {/* ══════════ GLASS NAVBAR ══════════ */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>StreamCSV</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>v0.2.0</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono">C++17 Bounded-Memory Engine</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <GhostButton onClick={loadSampleData} icon={RefreshCw}>Load Sample</GhostButton>
          <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${engineHealth?.status === 'healthy' ? 'bg-emerald-400 animate-pulse-dot' : 'bg-amber-400'}`} />
            <span className="text-zinc-400">{engineHealth?.status === 'healthy' ? 'Engine Online' : 'Connecting…'}</span>
          </div>
        </div>
      </header>

      {/* ══════════ MAIN LAYOUT ══════════ */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map(({ id, Icon, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#71717a',
                  border: isActive ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                  letterSpacing: '-0.01em',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {id === 'profile' && profileData && (
                  <Pill color={profileData.quality_score >= 90 ? 'emerald' : profileData.quality_score >= 75 ? 'sky' : profileData.quality_score >= 50 ? 'amber' : 'red'}>
                    {profileData.quality_score}
                  </Pill>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════ TAB 1 · INSPECTOR ═══════════ */}
        {activeTab === 'inspect' && (
          <div className="space-y-5 animate-fade-up">

            {/* Top grid: input + config */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* CSV Source */}
              <BentoCard className="lg:col-span-2 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-white tracking-tight">CSV Source Ingestion</span>
                  </div>
                  {fileName && (
                    <span className="text-[10px] font-mono text-zinc-600 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>{fileName}</span>
                  )}
                </div>

                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  rows={7}
                  placeholder="Paste CSV text here or upload a file below…"
                  className="w-full rounded-xl px-4 py-3 text-xs font-mono leading-relaxed resize-none outline-none transition-all duration-200 focus:ring-1 focus:ring-white/15"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', color: '#d4d4d8', caretColor: '#fff' }}
                />

                <div className="flex items-center justify-between">
                  <label className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200">
                      <UploadCloud className="h-3.5 w-3.5" />
                      Upload CSV File
                    </div>
                    <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <PrimaryButton
                    onClick={() => runInspect(csvText)}
                    disabled={loading || !csvText.trim()}
                    loading={loading}
                    icon={Sliders}
                    color="white"
                  >
                    Inspect with C++ Engine
                  </PrimaryButton>
                </div>
              </BentoCard>

              {/* Parser Config */}
              <BentoCard className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-semibold text-white tracking-tight">Parser Config</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1.5 font-medium">Field Delimiter</label>
                    <select
                      value={delimiter}
                      onChange={e => setDelimiter(e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="&#9;">Tab (\t — TSV)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1.5 font-medium">Preview Row Limit</label>
                    <input
                      type="number"
                      value={previewCount}
                      min={1} max={100}
                      onChange={e => setPreviewCount(Number(e.target.value))}
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-1 group">
                    <div
                      className="relative h-5 w-9 rounded-full transition-all duration-200 flex-shrink-0"
                      style={{ background: hasHeader ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      <div
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-black transition-all duration-200"
                        style={{ left: hasHeader ? '18px' : '2px' }}
                      />
                      <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} className="sr-only" />
                    </div>
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">Extract first row as header</span>
                  </label>
                </div>
              </BentoCard>
            </div>

            {/* KPI row */}
            {inspectData?.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up">
                <KpiCard label="Total Records" value={inspectData.total_records.toLocaleString()} icon={Database} iconColor="text-zinc-600" delay={0} />
                <KpiCard
                  label="Column Count"
                  value={
                    <span>
                      {inspectData.columns_min}
                      {inspectData.columns_min !== inspectData.columns_max && (
                        <span className="text-sm font-normal text-amber-400"> – {inspectData.columns_max}</span>
                      )}
                    </span>
                  }
                  icon={Layers}
                  iconColor="text-zinc-600"
                  delay={50}
                />
                <KpiCard
                  label="Uniformity"
                  value={inspectData.is_ragged ? <Pill color="amber"><AlertTriangle className="h-2.5 w-2.5" /> Ragged</Pill> : <Pill color="emerald"><CheckCircle2 className="h-2.5 w-2.5" /> Rectangular</Pill>}
                  icon={Activity}
                  iconColor="text-zinc-600"
                  delay={100}
                />
                <KpiCard
                  label="Memory Budget"
                  value={engineMetrics ? `${engineMetrics.chunk_buffer_kb} KB` : '8 KB'}
                  sub={engineMetrics?.memory_model ?? 'O(1) · bounded'}
                  icon={Cpu}
                  iconColor="text-zinc-600"
                  valueColor="text-emerald-400"
                  delay={150}
                />
              </div>
            )}

            {/* Error banner */}
            {inspectData && !inspectData.success && (
              <div className="flex items-start gap-3 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-red-400 block mb-0.5">Parse or I/O Error Encountered (Exit Code 2)</span>
                  <p className="text-xs font-mono text-red-300/70">{inspectData.error}</p>
                </div>
              </div>
            )}

            {/* Preview table */}
            {inspectData?.preview_rows?.length > 0 && (
              <BentoCard className="overflow-hidden animate-fade-up">
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-semibold text-zinc-300">Live Stream Preview</span>
                  <Pill>Bounded Stream · {inspectData.preview_rows.length} rows</Pill>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <th className="py-2.5 px-4 text-[10px] text-zinc-600 font-medium uppercase tracking-widest w-10">#</th>
                        {(inspectData.headers.length > 0 ? inspectData.headers : inspectData.preview_rows[0]).map((h, i) => (
                          <th key={i} className="py-2.5 px-4 text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inspectData.preview_rows.map((row, rIdx) => (
                        <tr key={rIdx} className="transition-colors duration-100 hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2.5 px-4 text-zinc-700">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-4 text-zinc-300 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </BentoCard>
            )}

            {/* Raw output panel */}
            {inspectData?.raw_output && (
              <BentoCard className="overflow-hidden animate-fade-up">
                <button
                  onClick={() => setRawOutputOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-xs transition-colors duration-200 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">C++ Engine Raw Output</span>
                    <span className="text-zinc-600">— {rawOutputOpen ? 'click to collapse' : 'click to expand'}</span>
                  </div>
                  {rawOutputOpen ? <ChevronDown className="h-4 w-4 text-zinc-600" /> : <ChevronRight className="h-4 w-4 text-zinc-600" />}
                </button>
                {rawOutputOpen && (
                  <div className="overflow-x-auto px-5 py-4" style={{ background: '#060606', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {inspectData.raw_output.split('\n').map((line, i) => {
                        const isKey = /total records|header|columns|warning/i.test(line);
                        return (
                          <span key={i} className={isKey ? 'text-sky-400' : 'text-emerald-400/80'}>{line}{'\n'}</span>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </BentoCard>
            )}
          </div>
        )}

        {/* ═══════════ TAB 2 · SCHEMA VALIDATOR ═══════════ */}
        {activeTab === 'validate' && (
          <div className="space-y-5 animate-fade-up">
            <BentoCard className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader
                  icon={ShieldCheck}
                  iconColor="text-emerald-400"
                  title="Interactive Schema Builder"
                  sub="Define scalar data types per column. Results are validated by StreamCSV's decoupled Layer 3 Validator."
                />
                <PrimaryButton
                  onClick={runValidate}
                  disabled={loading || schemaColumns.length === 0}
                  loading={loading}
                  icon={ShieldCheck}
                  color="emerald"
                >
                  Run Schema Validation
                </PrimaryButton>
              </div>

              {schemaColumns.length === 0 ? (
                <EmptyState
                  icon={FileSpreadsheet}
                  title="No schema columns yet"
                  sub="Run the Inspector first — schema columns are auto-populated from detected headers."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schemaColumns.map((col, idx) => {
                    const issues = columnIssueMap[idx] || [];
                    const validated = validateData !== null;
                    const hasIssues = issues.length > 0;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl space-y-2.5 transition-all duration-300"
                        style={{
                          background: '#111111',
                          border: validated
                            ? hasIssues ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(52,211,153,0.25)'
                            : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-xs font-mono font-semibold text-zinc-200 block truncate max-w-[130px]">{col.name}</span>
                            <span className="text-[10px] text-zinc-600 font-mono">Col #{idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {validated && (
                              hasIssues
                                ? <Pill color="red"><XCircle className="h-2.5 w-2.5" />{issues.length} err</Pill>
                                : <Pill color="emerald"><CheckCircle2 className="h-2.5 w-2.5" />OK</Pill>
                            )}
                            <select
                              value={col.type}
                              onChange={e => { const next = [...schemaColumns]; next[idx] = { ...next[idx], type: e.target.value }; setSchemaColumns(next); }}
                              className="text-[11px] font-mono text-sky-400 rounded-lg px-2 py-1 outline-none"
                              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}
                            >
                              <option value="string">String</option>
                              <option value="int">Integer</option>
                              <option value="float">Float</option>
                              <option value="bool">Boolean</option>
                            </select>
                          </div>
                        </div>

                        {validated && hasIssues && (inspectData?.total_records || 0) > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
                              <span>Error rate</span>
                              <span className="text-red-400 font-mono">
                                {((issues.length / inspectData.total_records) * 100).toFixed(1)}%
                                <span className="text-zinc-700 ml-1">({issues.length}/{inspectData.total_records})</span>
                              </span>
                            </div>
                            <MiniBar value={issues.length} max={inspectData.total_records} color="bg-red-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </BentoCard>

            {/* Validation result */}
            {validateData && (
              <div className="space-y-4 animate-fade-up">
                {validateData.success ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-emerald-400 block">Validation Successful — Exit Code 0</span>
                      <span className="text-xs text-emerald-400/60">Processed {validateData.records_processed} record(s) — 0 violations across all {schemaColumns.length} columns.</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-amber-400 block">{validateData.issues_count} Violation(s) Detected — Exit Code 1</span>
                      <span className="text-xs text-amber-400/60">StreamCSV flagged schema type violations. See issue log below.</span>
                    </div>
                  </div>
                )}

                {validateData.issues?.length > 0 && (
                  <BentoCard className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            {['Severity', 'Line', 'Field', 'Description'].map(h => (
                              <th key={h} className="py-2.5 px-4 text-[10px] text-zinc-600 font-medium uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validateData.issues.map((issue, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td className="py-2.5 px-4"><Pill color="red">{issue.severity}</Pill></td>
                              <td className="py-2.5 px-4 text-sky-400">Line {issue.line}</td>
                              <td className="py-2.5 px-4 font-semibold text-zinc-200">
                                {issue.field_name}<span className="text-zinc-600 font-normal ml-1">(idx {issue.field_index})</span>
                              </td>
                              <td className="py-2.5 px-4 text-zinc-400">{issue.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </BentoCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB 3 · DATA QUALITY STUDIO ═══════════ */}
        {activeTab === 'profile' && (() => {
          const scoreColor = !profileData ? 'text-zinc-500' :
            profileData.quality_score >= 90 ? 'text-emerald-400' :
            profileData.quality_score >= 75 ? 'text-sky-400' :
            profileData.quality_score >= 50 ? 'text-amber-400' : 'text-red-400';

          const scoreBarColor = !profileData ? 'bg-zinc-700' :
            profileData.quality_score >= 90 ? 'bg-emerald-500' :
            profileData.quality_score >= 75 ? 'bg-sky-500' :
            profileData.quality_score >= 50 ? 'bg-amber-500' : 'bg-red-500';

          const typeIcon = t => {
            if (t === 'int') return <Hash className="h-3 w-3 text-sky-400" />;
            if (t === 'float') return <TrendingUp className="h-3 w-3 text-violet-400" />;
            if (t === 'bool') return <ToggleLeft className="h-3 w-3 text-emerald-400" />;
            return <Type className="h-3 w-3 text-amber-400" />;
          };
          const typeLabel = t => ({ int: 'Integer', float: 'Float', bool: 'Boolean', string: 'String', empty: 'Empty' }[t] || t);

          return (
            <div className="space-y-6 animate-fade-up">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    Data Quality Studio
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">IQR + Z-score outliers · pattern fingerprinting · null analysis · quality scoring</p>
                </div>
                <PrimaryButton
                  onClick={() => runProfile(csvText)}
                  disabled={profileLoading || !csvText.trim()}
                  loading={profileLoading}
                  icon={FlaskConical}
                  color="violet"
                >
                  {profileLoading ? 'Profiling…' : 'Run Deep Profile'}
                </PrimaryButton>
              </div>

              {!profileData && !profileLoading && (
                <EmptyState icon={FlaskConical} title="No profile yet" sub='Load or paste CSV data, then click "Run Deep Profile" to begin analysis.' />
              )}

              {profileLoading && (
                <div className="flex flex-col items-center py-20 animate-fade-in">
                  <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <RefreshCw className="h-10 w-10 text-violet-400 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Running deep profile…</p>
                  <p className="text-xs text-zinc-600 mt-1">Analyzing types, outliers, patterns, and nulls across all rows.</p>
                </div>
              )}

              {profileData?.success && (() => {
                const p = profileData;
                return (
                  <>
                    {/* Score + KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Quality Score */}
                      <BentoCard className="md:col-span-1 p-5 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Quality Score</div>
                        <div className={`text-5xl font-black tabular tracking-tight ${scoreColor}`} style={{ letterSpacing: '-0.03em' }}>{p.quality_score}</div>
                        <div className={`text-xs font-semibold mt-1 ${scoreColor}`}>{p.quality_band}</div>
                        <div className="w-full mt-4">
                          <MiniBar value={p.quality_score} max={100} color={scoreBarColor} />
                        </div>
                      </BentoCard>

                      {[
                        { label: 'Total Rows', value: p.num_rows.toLocaleString(), sub: `${p.num_cols} columns`, icon: BarChart2, iconColor: 'text-zinc-600' },
                        { label: 'Null Cells', value: p.total_null_count, sub: p.total_null_count === 0 ? '✓ No nulls detected' : 'missing values', icon: AlertCircle, iconColor: 'text-amber-400', valueColor: p.total_null_count > 0 ? 'text-amber-400' : 'text-emerald-400' },
                        { label: 'Type Errors', value: p.total_type_errors, sub: p.total_type_errors === 0 ? '✓ No violations' : 'type violations', icon: XCircle, iconColor: 'text-red-400', valueColor: p.total_type_errors > 0 ? 'text-red-400' : 'text-emerald-400' },
                        { label: 'Outliers', value: p.total_outliers, sub: p.total_outliers === 0 ? '✓ None detected' : 'statistical outliers', icon: Activity, iconColor: 'text-violet-400', valueColor: p.total_outliers > 0 ? 'text-violet-400' : 'text-emerald-400' },
                      ].map((s, i) => (
                        <KpiCard key={i} {...s} delay={i * 50} />
                      ))}
                    </div>

                    {/* Column Profiles */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="h-3.5 w-3.5 text-zinc-600" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Column Profiles</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {p.column_profiles.map((col, ci) => {
                          const hasIssue = col.null_count > 0 || col.type_error_count > 0 || col.outlier_count > 0 || col.pattern_anomaly_count > 0;
                          return (
                            <BentoCard
                              key={ci}
                              className="p-4 space-y-3"
                              style={{
                                border: hasIssue
                                  ? col.type_error_count > 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)'
                                  : '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-zinc-100 block truncate">{col.name}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {typeIcon(col.inferred_type)}
                                    <span className="text-[10px] text-zinc-500">{typeLabel(col.inferred_type)}</span>
                                  </div>
                                </div>
                                {hasIssue
                                  ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                  : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                }
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div className="text-zinc-600 mb-0.5">Null %</div>
                                  <div className={col.null_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>{col.null_pct}% ({col.null_count})</div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div className="text-zinc-600 mb-0.5">Unique</div>
                                  <div className="text-zinc-300">{col.unique_count} <span className="text-zinc-600">({col.cardinality_pct}%)</span></div>
                                </div>

                                {col.inferred_type === 'int' || col.inferred_type === 'float' ? (<>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Min / Max</div>
                                    <div className="text-zinc-300">{col.min} / {col.max}</div>
                                  </div>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Mean ± Std</div>
                                    <div className="text-zinc-300">{col.mean} <span className="text-zinc-600">±{col.std}</span></div>
                                  </div>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Median / IQR</div>
                                    <div className="text-zinc-300">{col.median} <span className="text-zinc-600">({col.iqr})</span></div>
                                  </div>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Outliers</div>
                                    <div className={col.outlier_count > 0 ? 'text-violet-400' : 'text-emerald-400'}>{col.outlier_count} {col.outlier_count > 0 ? '⚠' : '✓'}</div>
                                  </div>
                                </>) : (<>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Pattern</div>
                                    <div className="text-zinc-300 truncate" title={col.dominant_pattern}>{col.dominant_pattern || '—'}</div>
                                  </div>
                                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-zinc-600 mb-0.5">Anomalies</div>
                                    <div className={col.pattern_anomaly_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>{col.pattern_anomaly_count} {col.pattern_anomaly_count > 0 ? '⚠' : '✓'}</div>
                                  </div>
                                </>)}

                                {col.type_error_count > 0 && (
                                  <div className="col-span-2 rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    <div className="text-red-400">⛔ {col.type_error_count} type error(s) — rows: {col.type_error_rows?.slice(0, 5).join(', ')}{col.type_error_rows?.length > 5 ? '…' : ''}</div>
                                  </div>
                                )}
                              </div>

                              {col.top_values?.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Top Values</div>
                                  {col.top_values.slice(0, 3).map((tv, ti) => (
                                    <div key={ti} className="flex items-center gap-2">
                                      <div className="h-1 rounded-full flex-shrink-0" style={{ width: `${Math.round(tv.count / p.num_rows * 100)}%`, minWidth: '4px', maxWidth: '50%', background: 'rgba(255,255,255,0.15)' }} />
                                      <span className="text-[10px] font-mono text-zinc-400 truncate flex-1">{tv.value}</span>
                                      <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{tv.count}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </BentoCard>
                          );
                        })}
                      </div>
                    </div>

                    {/* Anomalous rows */}
                    {p.anomalous_rows.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Anomalous Rows</span>
                          <Pill color="red">{p.anomalous_rows.length} flagged</Pill>
                          <span className="text-zinc-700 text-[10px] font-normal">sorted by severity</span>
                        </div>
                        <div className="space-y-2">
                          {p.anomalous_rows.map((ar) => {
                            const isExpanded = expandedAnomalyRow === ar.row;
                            const errorCount = ar.issues.flatMap(i => i.issues).filter(i => i.severity === 'ERROR').length;
                            const warnCount = ar.issues.flatMap(i => i.issues).filter(i => i.severity === 'WARNING').length;
                            return (
                              <BentoCard key={ar.row} className="overflow-hidden">
                                <button
                                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                                  onClick={() => setExpandedAnomalyRow(isExpanded ? null : ar.row)}
                                >
                                  <span className="text-[10px] font-mono text-zinc-600 w-14 flex-shrink-0">Row {ar.row}</span>
                                  <div className="flex gap-2 flex-1 min-w-0 overflow-hidden">
                                    {ar.cells.map((cell, ci) => {
                                      const cellHasIssue = ar.issues.some(iss => iss.col_index === ci);
                                      return (
                                        <span
                                          key={ci}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded-lg truncate max-w-[100px]"
                                          style={cellHasIssue
                                            ? { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }
                                            : { background: 'rgba(255,255,255,0.05)', color: '#71717a', border: '1px solid rgba(255,255,255,0.07)' }
                                          }
                                          title={`${p.headers[ci]}: ${cell}`}
                                        >
                                          {cell || <span className="italic text-zinc-700">empty</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {errorCount > 0 && <Pill color="red">{errorCount} ERR</Pill>}
                                    {warnCount > 0 && <Pill color="amber">{warnCount} WARN</Pill>}
                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="px-4 py-3 space-y-2 animate-fade-in" style={{ background: '#060606', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    {ar.issues.map((colIssue, ix) => (
                                      <div key={ix} className="flex items-start gap-3">
                                        <span className="text-[10px] font-mono text-sky-400 w-28 flex-shrink-0 pt-0.5">{colIssue.col_name}</span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
                                          "{colIssue.cell_value || '<empty>'}"
                                        </span>
                                        <div className="space-y-1">
                                          {colIssue.issues.map((iss, ji) => (
                                            <div key={ji} className={`text-[10px] flex items-center gap-1.5 ${iss.severity === 'ERROR' ? 'text-red-400' : 'text-amber-400'}`}>
                                              {iss.severity === 'ERROR' ? <XCircle className="h-3 w-3 flex-shrink-0" /> : <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
                                              <span className="font-mono font-semibold">[{iss.type}]</span>
                                              <span>{iss.detail}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </BentoCard>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {p.anomalous_rows.length === 0 && (
                      <div className="flex flex-col items-center py-12 rounded-2xl animate-fade-in" style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                        <p className="text-sm font-semibold text-emerald-400">No anomalies detected</p>
                        <p className="text-xs text-zinc-600 mt-1">All rows passed type checks, pattern consistency, and outlier detection.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* ═══════════ TAB 4 · RFC 4180 WRITER ═══════════ */}
        {activeTab === 'writer' && (
          <div className="space-y-5 animate-fade-up">
            <BentoCard className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <SectionHeader
                  icon={Table2}
                  iconColor="text-sky-400"
                  title="RFC 4180 Streaming Writer Studio"
                  sub="Compose records and generate valid, quoted RFC 4180 CSV with configurable delimiters."
                />
                <div className="flex items-center gap-2">
                  {inspectData?.success && (
                    <GhostButton onClick={importFromInspector} icon={ArrowDownToLine} title="Copy inspected headers + preview rows into writer">
                      Import from Inspector
                    </GhostButton>
                  )}
                  <PrimaryButton onClick={handleDownloadGenerated} icon={Download} color="white">
                    Export & Download CSV
                  </PrimaryButton>
                </div>
              </div>

              {/* Config row */}
              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1.5 font-medium">Delimiter</label>
                  <input type="text" maxLength={1} value={writerDelim} onChange={e => setWriterDelim(e.target.value || ',')}
                    className={inputCls + ' text-center'} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1.5 font-medium">Quote Character</label>
                  <input type="text" maxLength={1} value={writerQuote} onChange={e => setWriterQuote(e.target.value || '"')}
                    className={inputCls + ' text-center'} style={inputStyle} />
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={addWriterRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-emerald-400 hover:text-emerald-300"
                  style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </button>
                <button
                  onClick={addWriterColumn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sky-400 hover:text-sky-300"
                  style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Column
                </button>
                <span className="text-zinc-700 font-mono text-[10px] ml-2">
                  {writerRecords.length - 1} data row(s) · {writerRecords[0]?.cells.length ?? 0} col(s)
                </span>
              </div>

              {/* Editable table */}
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th className="py-2 px-3 text-zinc-700 text-[10px] w-10">#</th>
                      {writerRecords[0]?.cells.map((_, cIdx) => (
                        <th key={cIdx} className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-600 text-[10px]">Col {cIdx + 1}</span>
                            {(writerRecords[0]?.cells.length ?? 0) > 1 && (
                              <button onClick={() => deleteWriterColumn(cIdx)} className="text-zinc-800 hover:text-red-400 transition-colors">
                                <XCircle className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {writerRecords.map((row, rIdx) => (
                      <tr key={row.id} className="transition-colors" style={{ background: rIdx === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-1.5 px-3 text-zinc-700 font-mono text-[10px]">{rIdx === 0 ? 'HDR' : rIdx}</td>
                        {row.cells.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1 px-2">
                            <input
                              type="text"
                              value={cell}
                              onChange={e => updateWriterCell(row.id, cIdx, e.target.value)}
                              className={`w-full min-w-[80px] rounded-lg px-2 py-1 text-xs outline-none transition-all duration-150 ${rIdx === 0 ? 'font-semibold text-sky-300' : 'text-zinc-200'}`}
                              style={{ background: 'transparent', border: '1px solid transparent' }}
                              onFocus={e => { e.target.style.background = '#171717'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                              onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          {rIdx > 0 && (
                            <button onClick={() => deleteWriterRow(row.id)} className="text-zinc-800 hover:text-red-400 transition-colors p-1">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          </div>
        )}

        {/* ═══════════ TAB 5 · ENGINE TELEMETRY ═══════════ */}
        {activeTab === 'benchmark' && (
          <div className="space-y-5 animate-fade-up">

            {/* Controls */}
            <BentoCard className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <SectionHeader
                  icon={Zap}
                  iconColor="text-yellow-400"
                  title="Engine Performance & Micro-Benchmarks"
                  sub="Real wall-clock measurements — generates synthetic CSV and times the C++ engine live."
                />
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-[11px] text-zinc-500 mb-2 font-medium">Synthetic Row Count</div>
                    <div className="flex items-center gap-1">
                      {[1000, 10000, 50000, 100000].map(n => (
                        <button
                          key={n}
                          onClick={() => setBenchmarkRowCount(n)}
                          className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all duration-200"
                          style={benchmarkRowCount === n
                            ? { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                            : { background: 'rgba(255,255,255,0.03)', color: '#71717a', border: '1px solid rgba(255,255,255,0.08)' }
                          }
                        >
                          {n >= 1000 ? `${n / 1000}K` : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PrimaryButton onClick={runBenchmark} disabled={benchmarkLoading} loading={benchmarkLoading} icon={Play} color="white">
                    {benchmarkLoading ? 'Benchmarking…' : 'Run Live Benchmark'}
                  </PrimaryButton>
                </div>
              </div>
            </BentoCard>

            {!benchmarkData && !benchmarkLoading && (
              <EmptyState icon={Zap} title="No benchmark data yet" sub='Select a row count and click "Run Live Benchmark" to measure C++ engine throughput.' />
            )}

            {benchmarkLoading && (
              <div className="flex flex-col items-center py-20 animate-fade-in">
                <div className="p-5 rounded-2xl mb-5" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}>
                  <RefreshCw className="h-10 w-10 text-yellow-400 animate-spin" />
                </div>
                <p className="text-sm font-medium text-zinc-400">Benchmarking {benchmarkRowCount.toLocaleString()} rows…</p>
                <p className="text-xs text-zinc-600 mt-1">Invoking C++ engine via subprocess. Please wait.</p>
              </div>
            )}

            {benchmarkData && !benchmarkLoading && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
                  {[
                    { label: 'Streaming Reader', tag: 'DFA State Machine', tagColor: 'text-sky-400', speed: `${benchmarkData.reader_mb_s} MB/s`, sub: `${fmtNum(benchmarkData.reader_records_s)} records/sec`, detail: `${benchmarkData.reader_duration_ms}ms · ${benchmarkData.row_count.toLocaleString()} rows`, barValue: benchmarkData.reader_mb_s, barColor: 'bg-sky-500' },
                    { label: 'Schema Validator', tag: 'Layer 3 Decoupled', tagColor: 'text-emerald-400', speed: `${fmtNum(benchmarkData.validator_rows_s)}/s`, sub: 'rows validated per second', detail: `${benchmarkData.validator_duration_ms}ms · ${benchmarkData.row_count.toLocaleString()} rows`, barValue: benchmarkData.validator_rows_s, barColor: 'bg-emerald-500', barMax: benchMaxRecS },
                    { label: 'Streaming Writer', tag: 'RFC 4180 Escaping', tagColor: 'text-violet-400', speed: `${benchmarkData.writer_mb_s} MB/s`, sub: `${fmtNum(benchmarkData.writer_records_s)} records/sec`, detail: `${benchmarkData.writer_duration_ms}ms · ${benchmarkData.row_count.toLocaleString()} rows`, barValue: benchmarkData.writer_mb_s, barColor: 'bg-violet-500' },
                  ].map((item, i) => (
                    <BentoCard key={i} className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-medium">{item.label}</span>
                        <span className={`text-[10px] font-mono ${item.tagColor}`}>{item.tag}</span>
                      </div>
                      <div className="text-2xl font-bold tabular text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>{item.speed}</div>
                      <div className="text-xs text-zinc-500">{item.sub}</div>
                      <div className="text-[10px] text-zinc-700 font-mono">{item.detail}</div>
                      <MiniBar value={item.barValue} max={item.barMax || benchMaxMbS} color={item.barColor} />
                    </BentoCard>
                  ))}
                </div>

                {/* Throughput bar charts */}
                <BentoCard className="p-6 space-y-6 animate-fade-up">
                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-widest">
                      Throughput — MB/s <span className="text-zinc-700 font-normal normal-case">(Reader vs Writer)</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Reader', value: benchmarkData.reader_mb_s, color: 'bg-sky-500', text: 'text-sky-400' },
                        { label: 'Writer', value: benchmarkData.writer_mb_s, color: 'bg-violet-500', text: 'text-violet-400' },
                      ].map(({ label, value, color, text }) => (
                        <div key={label} className="flex items-center gap-3 text-xs">
                          <span className={`w-14 text-right font-mono font-medium ${text}`}>{label}</span>
                          <div className="flex-1 h-8 rounded-xl overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className={`h-8 ${color} rounded-xl transition-all duration-700 opacity-80`} style={{ width: `${Math.min((value / benchMaxMbS) * 100, 100)}%` }} />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white text-[11px]">{value} MB/s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-widest">
                      Records Per Second <span className="text-zinc-700 font-normal normal-case">(Reader vs Validator vs Writer)</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Reader', value: benchmarkData.reader_records_s, color: 'bg-sky-500', text: 'text-sky-400' },
                        { label: 'Validator', value: benchmarkData.validator_rows_s, color: 'bg-emerald-500', text: 'text-emerald-400' },
                        { label: 'Writer', value: benchmarkData.writer_records_s, color: 'bg-violet-500', text: 'text-violet-400' },
                      ].map(({ label, value, color, text }) => (
                        <div key={label} className="flex items-center gap-3 text-xs">
                          <span className={`w-14 text-right font-mono font-medium ${text}`}>{label}</span>
                          <div className="flex-1 h-8 rounded-xl overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className={`h-8 ${color} rounded-xl transition-all duration-700 opacity-80`} style={{ width: `${Math.min((value / benchMaxRecS) * 100, 100)}%` }} />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-white text-[11px]">{fmtNum(value)}/s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </BentoCard>

                {/* Memory guarantee card */}
                <BentoCard className="p-5 flex items-center justify-between gap-4 animate-fade-up">
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-200 block text-sm tracking-tight">Peak Memory Consumption Guarantee</span>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-lg">
                      RAM usage is strictly flat (O(1) scaling, &lt; 5 MB RSS) regardless of input size —
                      preventing DoS and OOM crashes on multi-gigabyte datasets.
                    </p>
                    {benchmarkData.data_mb && (
                      <p className="text-[11px] text-zinc-700 font-mono">Payload: {benchmarkData.data_mb} MB · {benchmarkData.row_count.toLocaleString()} rows</p>
                    )}
                  </div>
                  <div className="font-bold text-emerald-400 text-2xl font-mono whitespace-nowrap tabular" style={{ letterSpacing: '-0.02em' }}>&lt; 5 MB RSS</div>
                </BentoCard>
              </>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-20 pb-10 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-6 pt-8">
          <p className="text-[11px] text-zinc-700 font-mono">
            StreamCSV Studio · C++17 Bounded-Memory Engine · v0.2.0
          </p>
        </div>
      </footer>
    </div>
  );
}
