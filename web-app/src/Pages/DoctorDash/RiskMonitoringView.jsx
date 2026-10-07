import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, X, TriangleAlert, Wind, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
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
  const rand = seededRandom(String(patient._id || patient.email || patient.name));
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

function RiskMonitoringView({ patients = [], riskData = {} }) {
  const [selected, setSelected] = useState(null);

  // Attach a risk record to each patient, then sort highest risk first.
  const rows = useMemo(() => {
    return patients
      .map((patient) => {
        const risk = riskData[patient._id] || getRiskForPatient(patient);
        return { patient, ...risk, level: getRiskLevel(risk.score) };
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

        <div className="risk-list">
          {rows.length === 0 && <p className="add-patient-empty">No patients have been added yet.</p>}

          {rows.map((row, index) => (
            <motion.div
              key={row.patient._id}
              className={`risk-row risk-row-${row.level}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(row.patient._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(row.patient._id);
                }
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ x: 3 }}
            >
              <div className="patient-avatar">
                {(row.patient.name || "Patient")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </div>

              <div className="risk-row-patient">
                <strong>{row.patient.name}</strong>
                <span>{row.patient.email}</span>
              </div>

              <span className="risk-row-level">{LEVEL_LABEL[row.level]}</span>
              <RiskBadge score={row.score} />
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
                <h2>{selectedRow.patient.name}</h2>
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
    </>
  );
}

function getAlertsLast24h(patients, riskData, now) {
  const cutoff = now - ALERT_WINDOW_HOURS * HOUR_MS;
  return patients.flatMap((patient) => {
    const risk = riskData[patient._id] || getRiskForPatient(patient);
    if (getRiskLevel(risk.score) !== "high") return [];

    // Real alert time if the backend provides it, otherwise a simulated one.
    const seed = String(patient._id || patient.email || patient.name) + ":alert";
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