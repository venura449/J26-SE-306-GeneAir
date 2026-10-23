import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, X, TriangleAlert, Wind, ShieldCheck, TrendingUp, TrendingDown, RefreshCw, ChartLine, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "react-toastify";
import API_URL from "../../config/api";
import "./Dashboard.css";

export const RISK_BANDS = { high: 70, moderate: 40 };

export function getRiskLevel(score) {
  if (score >= RISK_BANDS.high) return "high";
  if (score >= RISK_BANDS.moderate) return "moderate";
  return "low";
}

const LEVEL_LABEL = { high: "High risk", moderate: "Moderate risk", low: "Low risk" };

const ALERT_WINDOW_HOURS = 24;
const HOUR_MS = 3600 * 1000;

export function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRIVER_POOL = [
  { label: "Night-time symptoms", stream: "Clinical" },
  { label: "Morning peak flow vs. personal best", stream: "Clinical" },
  { label: "Reliever inhaler use", stream: "Medication" },
  { label: "Preventer inhaler adherence", stream: "Medication" },
  { label: "Air quality (PM2.5)", stream: "IoT" },
  { label: "Pollen level", stream: "IoT" },
  { label: "Resting heart rate", stream: "IoT" },
  { label: "Asthma severity class", stream: "Static" },
];

export function getRiskForPatient(patient) {
  const rand = seededRandom(String(patient._id || patient.email || patient.username));
  const score = Math.round(rand() * 100);
  const streams = ["IoT", "Clinical", "Medication", "Static"].map((name) => ({
    name,
    value: Math.max(2, Math.min(98, Math.round(score + (rand() - 0.5) * 40))),
  }));
  const drivers = [...DRIVER_POOL]
    .sort(() => rand() - 0.5)
    .slice(0, 4)
    .map((d) => {
      // Higher overall risk -> drivers more likely to push risk up
      const up = rand() * 100 < score + 15;
      return { ...d, direction: up ? "up" : "down", impact: Math.round(4 + rand() * 18) };
    })
    .sort((a, b) => b.impact - a.impact);
  return { score, streams, drivers };
}

function buildSummary(name, level, drivers) {
  const ups = drivers.filter((d) => d.direction === "up").map((d) => d.label.toLowerCase());
  const downs = drivers.filter((d) => d.direction === "down").map((d) => d.label.toLowerCase());
  const first = name ? name.split(" ")[0] : "This patient";
  const upText = ups.length ? `Higher risk is associated with ${ups.slice(0, 2).join(" and ")}.` : "No factor is currently associated with higher risk.";
  const downText = downs.length ? ` Lower risk is associated with ${downs.slice(0, 2).join(" and ")}.` : "";
  const lead =
    level === "high"
      ? `${first}'s current readings place them in the high-risk group and they should be reviewed soon.`
      : level === "moderate"
        ? `${first}'s readings show a moderate level of risk and are worth monitoring.`
        : `${first}'s readings currently show a low level of risk.`;
  return `${lead} ${upText}${downText}`;
}

function RiskBadge({ score }) {
  const level = getRiskLevel(score);
  return (
    <span className={`risk-badge risk-badge-${level}`} title={LEVEL_LABEL[level]}>
      {score}%
    </span>
  );
}

function RiskMonitoringView({ patients = [], riskData = {}, onRiskUpdate }) {
  const [selected, setSelected] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(null);
  const [expandedTvl, setExpandedTvl] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyPatient, setHistoryPatient] = useState(null);
  const [loadingScores, setLoadingScores] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function loadLatestScores() {
      setLoadingScores(true);
      const token = localStorage.getItem("geneair_token");
      const results = await Promise.all(patients.map(async (patient) => {
        try {
          const response = await fetch(`${API_URL}/risk/patients/${patient._id}/history`, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) return null;
          const saved = await response.json();
          const latest = saved[saved.length - 1];
          if (!latest) return null;
          return { id: patient._id, risk: { score: Math.round(latest.score * 100), streams: Object.entries(latest.streamRisks || {}).map(([name, value]) => ({ name, value: Math.round(value * 100) })), drivers: [], evaluation: latest } };
        } catch { return null; }
      }));
      if (!cancelled) { results.filter(Boolean).forEach(({ id, risk }) => onRiskUpdate?.(id, risk)); setLoadingScores(false); }
    }
    if (patients.length) loadLatestScores(); else setLoadingScores(false);
    return () => { cancelled = true; };
  }, [patients, onRiskUpdate]);

  const openRiskHistory = async (patient, event) => {
    event.stopPropagation(); setHistoryPatient(patient); setHistory(null);
    try { const response = await fetch(`${API_URL}/risk/patients/${patient._id}/history`, { headers: { Authorization: `Bearer ${localStorage.getItem("geneair_token")}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to load risk history."); setHistory(data.map((item) => ({ ...item, score: Math.round(item.score * 100), time: new Date(item.createdAt).toLocaleString() }))); }
    catch (error) { setHistoryPatient(null); toast.error(error.message); }
  };

  const reevaluate = async (patient, event) => {
    event.stopPropagation();
    setEvaluating(patient._id);
    setEvaluation({ patient, loading: true });
    try {
      const response = await fetch(`${API_URL}/risk/patients/${patient._id}/evaluate`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("geneair_token")}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Risk evaluation failed.");
      const score = Math.round((data.final_risk_probability || 0) * 100);
      onRiskUpdate?.(patient._id, { score, streams: Object.entries(data.stream_risks || {}).map(([name, value]) => ({ name, value: Math.round(value * 100) })), drivers: [], evaluation: data });
      setEvaluation({ patient, data });
      toast.success("Risk evaluation completed.");
    } catch (error) { setEvaluation(null); toast.error(error.message); }
    finally { setEvaluating(null); }
  };

  // Attach a risk record to each patient, then sort highest risk first.
  const rows = useMemo(() => {
    return patients
      .map((patient) => {
        const risk = riskData[patient._id];
        return { patient, ...(risk || { score: null, streams: [], drivers: [], level: null }), level: risk ? getRiskLevel(risk.score) : null };
      })
      .sort((a, b) => b.score - a.score);
  }, [patients, riskData]);

  const counts = useMemo(
    () => ({
      high: rows.filter((r) => r.level === "high").length,
      moderate: rows.filter((r) => r.level === "moderate").length,
      low: rows.filter((r) => r.level === "low").length,
    }),
    [rows],
  );

  const visibleRows = useMemo(() => rows.filter((row) => {
    const matchesName = row.patient.username?.toLowerCase().includes(search.trim().toLowerCase());
    const matchesRisk = riskFilter === "all" || (riskFilter === "none" ? row.level == null : row.level === riskFilter);
    return matchesName && matchesRisk;
  }), [rows, search, riskFilter]);

  const selectedRow = selected ? rows.find((r) => r.patient._id === selected) : null;

  return (
    <>
      <div className="doctor-card risk-monitoring-card">
        <div className="doctor-card-header">
          <div>
            <h2>Risk Monitoring</h2>
            <p>Patients ranked by current asthma risk, highest first</p>
          </div>
          <div className="risk-summary-chips">
            <span className="risk-chip risk-chip-high">{counts.high} high</span>
            <span className="risk-chip risk-chip-moderate">{counts.moderate} moderate</span>
            <span className="risk-chip risk-chip-low">{counts.low} low</span>
          </div>
        </div>

        <div className="risk-filter-bar">
          <label className="risk-search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient name..." aria-label="Search patient name" /></label>
          <div className="risk-filter-pills" role="group" aria-label="Filter by risk level">
            {[['all', 'All'], ['high', 'High'], ['moderate', 'Moderate'], ['low', 'Low'], ['none', 'Not evaluated']].map(([value, label]) => <button key={value} type="button" className={`risk-filter-pill risk-filter-pill-${value}${riskFilter === value ? " active" : ""}`} onClick={() => setRiskFilter(value)}>{label}</button>)}
          </div>
        </div>

        <div className="risk-list">
          {!loadingScores && visibleRows.length === 0 && <p className="add-patient-empty">{rows.length === 0 ? "No patients have been added yet." : "No patients match your search or filter."}</p>}

          {loadingScores && patients.filter((patient) => patient.username?.toLowerCase().includes(search.trim().toLowerCase())).map((patient, index) => <motion.div key={patient._id} className="risk-row risk-row-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}><div className="patient-avatar risk-loading-pulse" /><div className="risk-row-patient"><strong>{patient.username}</strong><span>Loading saved risk score…</span></div><span className="risk-loading-spinner"><RefreshCw size={15} /></span></motion.div>)}
          {!loadingScores && visibleRows.map((row, index) => (
            <motion.div
              key={row.patient._id}
              className={`risk-row risk-row-${row.level}`}
              role="button"
              tabIndex={0}
              onClick={() => row.score != null && setSelected(row.patient._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (row.score != null) setSelected(row.patient._id);
                }
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ x: 3 }}
            >
              <div className="patient-avatar">
                {(row.patient.username || "Patient")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </div>

              <div className="risk-row-patient">
                <strong>{row.patient.username}</strong>
                <span>{row.patient.email}</span>
              </div>

              <span className="risk-row-level">{row.level ? LEVEL_LABEL[row.level] : "Not evaluated"}</span>
              {row.score == null ? <span className="risk-not-evaluated">—</span> : <RiskBadge score={row.score} />}
              <button className="risk-reevaluate-button" type="button" onClick={(event) => reevaluate(row.patient, event)} disabled={evaluating === row.patient._id}>
                <RefreshCw size={14} className={evaluating === row.patient._id ? "risk-spin" : ""} />
                {evaluating === row.patient._id ? "Evaluating" : "Re-evaluate"}
              </button>
              <button className="risk-history-button" type="button" onClick={(event) => openRiskHistory(row.patient, event)} aria-label={`View risk history for ${row.patient.name}`} title="View risk history"><ChartLine size={16} /></button>
              <ChevronRight size={16} className="risk-row-chevron" />
            </motion.div>
          ))}
        </div>
      </div>

      {selectedRow && (
        <div className="profile-overlay" onClick={() => setSelected(null)}>
          <section className="doctor-card risk-explain-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doctor-card-header">
              <div>
                <h2>{selectedRow.patient.username}</h2>
                <p>{selectedRow.patient.email}</p>
              </div>
              <button className="profile-close-button" type="button" aria-label="Close explanation" onClick={() => setSelected(null)}>
                <X size={19} />
              </button>
            </div>

            <div className="risk-explain-body">
              <div className={`risk-explain-score risk-explain-score-${selectedRow.level}`}>
                {selectedRow.level === "high" ? <TriangleAlert size={22} /> : selectedRow.level === "moderate" ? <Wind size={22} /> : <ShieldCheck size={22} />}
                <div>
                  <span>{LEVEL_LABEL[selectedRow.level]}</span>
                  <strong>{selectedRow.score}%</strong>
                </div>
              </div>

              <p className="risk-explain-summary">{buildSummary(selectedRow.patient.name, selectedRow.level, selectedRow.drivers)}</p>

              <h3>What is driving this score</h3>
              <ul className="risk-driver-list">
                {selectedRow.drivers.map((d) => (
                  <li key={d.label}>
                    <span className={`risk-driver-icon ${d.direction === "up" ? "up" : "down"}`}>
                      {d.direction === "up" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    </span>
                    <div>
                      <strong>{d.label}</strong>
                      <small>{d.stream} data</small>
                    </div>
                    <span className={`risk-driver-impact ${d.direction === "up" ? "up" : "down"}`}>
                      {d.direction === "up" ? "+" : "−"}
                      {d.impact}%
                    </span>
                  </li>
                ))}
              </ul>

              <h3>Risk by data source</h3>
              <div className="risk-stream-list">
                {selectedRow.streams.map((s) => (
                  <div className="risk-stream" key={s.name}>
                    <span>{s.name}</span>
                    <div className="risk-stream-track">
                      <div className={`risk-stream-fill risk-fill-${getRiskLevel(s.value)}`} style={{ width: `${s.value}%` }} />
                    </div>
                    <strong>{s.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
      {evaluation && (
        <div className="profile-overlay risk-evaluation-overlay" onClick={() => !evaluation.loading && setEvaluation(null)}>
          <section className="doctor-card risk-evaluation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="doctor-card-header">
                <div><p className="eyebrow">GENEAIR AI MODEL</p><h2>Risk evaluation</h2><p>{evaluation.patient.username}</p></div>
              {!evaluation.loading && <button className="profile-close-button" type="button" onClick={() => setEvaluation(null)} aria-label="Close evaluation"><X size={19} /></button>}
            </div>
            {evaluation.loading ? <div className="risk-evaluation-loading"><RefreshCw className="risk-spin" size={30} /><h3>Evaluating patient data…</h3><p>Combining static, clinical, medication, wearable, and TVL validity signals.</p></div> : (
              <div className="risk-evaluation-result">
                <div className={`risk-explain-score risk-explain-score-${getRiskLevel((evaluation.data.final_risk_probability || 0) * 100)}`}><ShieldCheck size={24} /><div><span>{evaluation.data.risk_state_demo === "elevated" ? "Needs closer review" : "Currently lower risk"}</span><strong>{Math.round((evaluation.data.final_risk_probability || 0) * 100)}%</strong></div></div>
                <p className="risk-evaluation-friendly">This score combines the patient’s profile, your clinical notes, medication information, and latest wearable readings.</p>
                <h3>Data validity (TVL)</h3><div className="risk-tvl-grid">{Object.entries(evaluation.data.tvl?.families || {}).map(([name, value]) => { const label = ({ watch: "Wearable readings", environment: "Air and environment", peakflow: "Peak flow", symptoms: "Symptoms", med_daily: "Medication", smart_inhaler: "Smart inhaler", static: "Patient profile" })[name] || name; const expanded = expandedTvl === name; return <button className={`risk-tvl-item${expanded ? " is-expanded" : ""}`} type="button" key={name} onClick={() => setExpandedTvl(expanded ? null : name)}><span className="risk-tvl-item-head"><strong>{label}</strong><span className={value.stale ? "tvl-stale" : "tvl-valid"}>{Math.round((value.gamma || 0) * 100)}% validity</span></span>{expanded && <span className="risk-tvl-details"><span>Data age: {value.age_days == null ? "Unknown" : `${Number(value.age_days).toFixed(1)} days`}</span><span>Coverage: {Math.round((value.coverage || 0) * 100)}%</span><span>Completeness: {Math.round((value.completeness || 0) * 100)}%</span><span>TVL status: {value.stale ? "Older than the recommended window" : "Within the recommended window"}</span></span>}</button>; })}</div>
                {evaluation.data.input_warnings?.length > 0 && <div className="risk-evaluation-warning"><TriangleAlert size={17} /><span>Some information is missing, so the result may be less reliable.</span></div>}
                <p className="risk-evaluation-note">Use this result to support your clinical review. It does not replace professional judgment.</p>
              </div>
            )}
          </section>
        </div>
      )}
      {historyPatient && <div className="profile-overlay risk-history-overlay" onClick={() => setHistoryPatient(null)}><section className="doctor-card risk-history-modal" onClick={(event) => event.stopPropagation()}><div className="doctor-card-header"><div><p className="eyebrow">RISK HISTORY</p><h2>{historyPatient.name}</h2><p>Saved AI evaluations</p></div><button className="profile-close-button" type="button" onClick={() => setHistoryPatient(null)}><X size={19} /></button></div>{history === null ? <div className="risk-evaluation-loading"><RefreshCw className="risk-spin" size={28} /><p>Loading saved scores…</p></div> : history.length === 0 ? <p className="add-patient-empty">No saved evaluations yet. Use Re-evaluate to create the first score.</p> : <div className="risk-history-chart"><ResponsiveContainer width="100%" height={280}><LineChart data={history}><XAxis dataKey="time" hide /><YAxis domain={[0, 100]} unit="%" /><Tooltip labelFormatter={(value) => value} formatter={(value) => [`${value}%`, "Risk score"]} /><Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} /></LineChart></ResponsiveContainer><div className="risk-history-list">{[...history].reverse().map((item) => <div key={item._id}><strong>{item.score}%</strong><span>{item.time}</span></div>)}</div></div>}</section></div>}
    </>
  );
}

function getAlertsLast24h(patients, riskData, now) {
  const cutoff = now - ALERT_WINDOW_HOURS * HOUR_MS;
  return patients.flatMap((patient) => {
    const risk = riskData[patient._id];
    if (!risk) return [];
    if (getRiskLevel(risk.score) !== "high") return [];

    // Real alert time if the backend provides it, otherwise a simulated one.
    const seed = String(patient._id || patient.email || patient.username) + ":alert";
    const at = patient.lastHighRiskAlertAt
      ? new Date(patient.lastHighRiskAlertAt).getTime()
      : now - seededRandom(seed)() * ALERT_WINDOW_HOURS * HOUR_MS;

    if (Number.isNaN(at) || at < cutoff || at > now) return [];
    return [{ patient, at, score: risk.score, drivers: risk.drivers }];
  });
}

export function HighRiskAlertsChart({ patients = [], riskData = {} }) {
  const { buckets, total } = useMemo(() => {
    const now = Date.now();
    const alerts = getAlertsLast24h(patients, riskData, now);
    const counts = Array(ALERT_WINDOW_HOURS).fill(0);
    alerts.forEach((a) => {
      const hoursAgo = Math.floor((now - a.at) / HOUR_MS);
      counts[ALERT_WINDOW_HOURS - 1 - Math.min(hoursAgo, ALERT_WINDOW_HOURS - 1)] += 1;
    });
    return { buckets: counts, total: alerts.length };
  }, [patients, riskData]);

  const max = Math.max(1, ...buckets);

  return (
    <div className="doctor-card consultations-card high-risk-chart-card">
      <div className="doctor-card-header">
        <div>
          <h2>High-Risk Alerts</h2>
          <p>Patients who received a high-risk alert in the past 24 hours</p>
        </div>
        <div className="high-risk-chart-total">
          <strong>{total}</strong>
          <span>of {patients.length} {patients.length === 1 ? "patient" : "patients"}</span>
        </div>
      </div>

      <div className="high-risk-chart" role="img" aria-label={`${total} patients received high-risk alerts in the past 24 hours`}>
        {buckets.map((count, i) => {
          const hoursAgo = ALERT_WINDOW_HOURS - 1 - i;
          return (
            <div className="high-risk-chart-col" key={i} title={`${count} ${count === 1 ? "patient" : "patients"}, ${hoursAgo === 0 ? "this hour" : `${hoursAgo}h ago`}`}>
              <div className="high-risk-chart-bar" style={{ height: `${(count / max) * 100}%` }} data-empty={count === 0} />
            </div>
          );
        })}
      </div>
      <div className="high-risk-chart-axis">
        <span>24h ago</span>
        <span>18h</span>
        <span>12h</span>
        <span>6h</span>
        <span>Now</span>
      </div>
    </div>
  );
}

export function HighRiskCausesCard({ patients = [], riskData = {} }) {
  const { causes, alertCount } = useMemo(() => {
    const alerts = getAlertsLast24h(patients, riskData, Date.now());
    const tally = new Map();
    alerts.forEach(({ drivers }) => {
      drivers
        .filter((d) => d.direction === "up")
        .forEach((d) => {
          const entry = tally.get(d.label) || { label: d.label, stream: d.stream, patients: 0, impact: 0 };
          entry.patients += 1;
          entry.impact += d.impact;
          tally.set(d.label, entry);
        });
    });
    const list = [...tally.values()]
      .map((c) => ({ ...c, share: alerts.length ? Math.round((c.patients / alerts.length) * 100) : 0, avgImpact: Math.round(c.impact / c.patients) }))
      .sort((a, b) => b.patients - a.patients || b.avgImpact - a.avgImpact);
    return { causes: list, alertCount: alerts.length };
  }, [patients, riskData]);

  const top = causes[0];

  return (
    <div className="doctor-card recent-activity-card high-risk-causes-card">
      <div className="doctor-card-header">
        <div>
          <h2>Causes of High-Risk Alerts</h2>
          <p>What drove alerts in the past 24 hours</p>
        </div>
      </div>

      {alertCount === 0 ? (
        <p className="add-patient-empty">No high-risk alerts in the past 24 hours.</p>
      ) : (
        <>
          <p className="high-risk-causes-insight">
            {top.label} contributed to {top.patients} of {alertCount} {alertCount === 1 ? "alert" : "alerts"} ({top.share}%).
          </p>
          <ul className="high-risk-causes-list">
            {causes.slice(0, 5).map((c) => (
              <li key={c.label}>
                <div className="high-risk-cause-head">
                  <strong>{c.label}</strong>
                  <small>{c.stream} data · avg +{c.avgImpact}%</small>
                </div>
                <div className="risk-stream-track">
                  <div className="risk-stream-fill risk-fill-high" style={{ width: `${c.share}%` }} />
                </div>
                <span className="high-risk-cause-share">{c.share}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default RiskMonitoringView;
