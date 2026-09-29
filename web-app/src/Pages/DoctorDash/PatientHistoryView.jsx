import { Search } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";

const ranges = [
  ["all", "All time", null],
  ["1h", "Last hour", 60 * 60 * 1000],
  ["6h", "Last 6 hours", 6 * 60 * 60 * 1000],
  ["24h", "Last 24 hours", 24 * 60 * 60 * 1000],
  ["7d", "Last 7 days", 7 * 24 * 60 * 60 * 1000],
];

const charts = [
  { title: "Heart rate", key: "heartRate", color: "#e91e63", range: [60, 100], label: "Normal resting range: 60–100 BPM" },
  { title: "SpO₂", key: "spo2", color: "#2196f3", range: [95, 100], label: "Normal range: 95–100%" },
  { title: "Temperature", key: "bodyTemp", color: "#ff9800", range: [36.1, 37.2], label: "Typical adult range: 36.1–37.2°C" },
];

export default function PatientHistoryView({ history }) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const filteredHistory = useMemo(() => {
    const cutoff = ranges.find(([value]) => value === range)?.[2];
    const now = Date.now();
    const query = search.trim().toLowerCase();
    return (history || []).filter((row) => {
      const date = new Date(row.createdAt);
      if (cutoff && (Number.isNaN(date.getTime()) || now - date.getTime() > cutoff)) return false;
      if (!query) return true;
      return `${date.toLocaleString()} ${row.heartRate ?? ""} ${row.spo2 ?? ""} ${row.bodyTemp ?? ""} ${row.steps ?? ""}`.toLowerCase().includes(query);
    });
  }, [history, range, search]);

  return (
    <>
      <div className="history-filter-bar">
        <label className="history-filter-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search readings by time or value..." /></label>
        <label className="history-filter-select">Time range<select value={range} onChange={(event) => setRange(event.target.value)}>{ranges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {!filteredHistory.length ? <p className="add-patient-empty">No readings match the selected filters.</p> : <div className="history-chart-grid">{charts.map(({ title, key, color, label }) => { const gradientId = `${key}-gradient`; const chartData = filteredHistory.map((row) => ({ ...row, [key]: Number(row[key]) })).filter((row) => Number.isFinite(row[key])); return <div className="history-chart-card" key={key}><h3>{title} trend</h3><p className="chart-reference-label">{label}</p>{chartData.length ? <div className="history-chart-canvas"><AreaChart width={360} height={210} data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.34} /><stop offset="100%" stopColor={color} stopOpacity={0.03} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" /><XAxis dataKey="createdAt" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} /><Area type="monotone" dataKey={key} stroke={color} strokeWidth={3} fill={`url(#${gradientId})`} dot={false} connectNulls /></AreaChart></div> : <p className="add-patient-empty">No {title.toLowerCase()} readings available.</p>}</div>; })}</div>}
    </>
  );
}
