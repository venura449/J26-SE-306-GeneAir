import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, TriangleAlert, Wind, ShieldCheck, Check, CheckCheck, Clock3 } from "lucide-react";
import { seededRandom, getRiskForPatient } from "./RiskMonitoringView";
import "./Dashboard.css";

const SEVERITY_LABEL = { high: "High", moderate: "Moderate", low: "Low" };
const SEVERITY_ORDER = { high: 0, moderate: 1, low: 2 };
const SEVERITY_ICON = { high: TriangleAlert, moderate: Wind, low: ShieldCheck };
const HOUR_MS = 3600 * 1000;

const ALERT_TYPES = [
  { title: "Risk score crossed the high threshold", stream: "Risk model" },
  { title: "Morning peak flow below personal best", stream: "Clinical" },
  { title: "Frequent reliever inhaler use", stream: "Medication" },
  { title: "Preventer inhaler doses missed", stream: "Medication" },
  { title: "Poor air quality exposure (PM2.5)", stream: "IoT" },
  { title: "High pollen level in area", stream: "IoT" },
  { title: "Night-time symptoms reported", stream: "Clinical" },
  { title: "Elevated resting heart rate", stream: "IoT" },
];

function patientKey(patient) {
  return String(patient._id || patient.email || patient.name);
}

// Uses patient.alerts from the backend if present, otherwise simulates alerts.
function getAlertsForPatient(patient, now) {
  if (Array.isArray(patient.alerts)) {
    return patient.alerts.map((a, i) => ({
      id: a._id || a.id || `${patientKey(patient)}-${i}`,
      title: a.title,
      stream: a.stream || "Clinical",
      severity: a.severity || "low",
      status: a.status || "new",
      at: new Date(a.createdAt).getTime(),
    }));
  }

  const rand = seededRandom(patientKey(patient) + ":alerts");
  const { score } = getRiskForPatient(patient);
  const count = Math.floor(rand() * 5); // 0 to 4 alerts

  return Array.from({ length: count }, (_, i) => {
    const type = ALERT_TYPES[Math.floor(rand() * ALERT_TYPES.length)];
    const r = rand() * 100;
    const severity = r < score * 0.6 ? "high" : r < 60 + score * 0.2 ? "moderate" : "low";
    const hoursAgo = rand() * 72;
    const status = hoursAgo > 48 ? "resolved" : rand() < 0.5 ? "new" : "acknowledged";
    return {
      id: `${patientKey(patient)}-${i}`,
      title: severity === "high" && i === 0 ? ALERT_TYPES[0].title : type.title,
      stream: severity === "high" && i === 0 ? ALERT_TYPES[0].stream : type.stream,
      severity,
      status,
      at: now - hoursAgo * HOUR_MS,
    };
  });
}

function timeAgo(at, now) {
  const mins = Math.max(1, Math.round((now - at) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function AlertsView({ patients = [] }) {
  const now = useMemo(() => Date.now(), [patients]);
  const [overrides, setOverrides] = useState({}); // alertId -> status set by the doctor
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const allAlerts = useMemo(
    () =>
      patients.map((patient) => ({
        patient,
        alerts: getAlertsForPatient(patient, now),
      })),
    [patients, now],
  );

  const withStatus = (a) => ({ ...a, status: overrides[a.id] || a.status });

  const groups = useMemo(() => {
    return allAlerts
      .map(({ patient, alerts }) => {
        const all = alerts.map(withStatus);
        const visible = all
          .filter((a) => severityFilter === "all" || a.severity === severityFilter)
          .filter((a) => (statusFilter === "all" ? true : statusFilter === "active" ? a.status !== "resolved" : a.status === statusFilter))
          .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.at - a.at);
        const active = all.filter((a) => a.status !== "resolved");
        return {
          patient,
          visible,
          activeHigh: active.filter((a) => a.severity === "high").length,
          activeCount: active.length,
          latest: Math.max(0, ...visible.map((a) => a.at)),
        };
      })
      .filter((g) => g.visible.length > 0)
      .sort((a, b) => b.activeHigh - a.activeHigh || b.activeCount - a.activeCount || b.latest - a.latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlerts, overrides, severityFilter, statusFilter]);

  const counts = useMemo(() => {
    const active = allAlerts.flatMap((g) => g.alerts.map(withStatus)).filter((a) => a.status !== "resolved");
    return {
      high: active.filter((a) => a.severity === "high").length,
      moderate: active.filter((a) => a.severity === "moderate").length,
      low: active.filter((a) => a.severity === "low").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlerts, overrides]);

  const setStatus = (id, status) => setOverrides((current) => ({ ...current, [id]: status }));
  const toggleGroup = (id) =>
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="doctor-card alerts-card">
      <div className="doctor-card-header">
        <div>
          <h2>Patient Alerts</h2>
          <p>Active alerts grouped by patient, most urgent first</p>
        </div>
        <div className="risk-summary-chips">
          <span className="risk-chip risk-chip-high">{counts.high} high</span>
          <span className="risk-chip risk-chip-moderate">{counts.moderate} moderate</span>
          <span className="risk-chip risk-chip-low">{counts.low} low</span>
        </div>
      </div>

      <div className="alerts-filters">
        <div className="alerts-filter-group" role="group" aria-label="Filter by severity">
          {["all", "high", "moderate", "low"].map((s) => (
            <button key={s} type="button" className={`alerts-filter ${severityFilter === s ? "active" : ""}`} onClick={() => setSeverityFilter(s)}>
              {s === "all" ? "All severities" : SEVERITY_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="alerts-filter-group" role="group" aria-label="Filter by status">
          {[
            ["active", "Active"],
            ["resolved", "Resolved"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={`alerts-filter ${statusFilter === value ? "active" : ""}`} onClick={() => setStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="alerts-group-list">
        {patients.length === 0 && <p className="add-patient-empty">No patients have been added yet.</p>}
        {patients.length > 0 && groups.length === 0 && <p className="add-patient-empty">No alerts match these filters.</p>}

        {groups.map((group, index) => {
          const isCollapsed = collapsed.has(group.patient._id);
          const topSeverity = group.visible[0].severity;
          return (
            <motion.div
              key={group.patient._id}
              className={`alerts-group alerts-group-${topSeverity}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <button className="alerts-group-header" type="button" aria-expanded={!isCollapsed} onClick={() => toggleGroup(group.patient._id)}>
                <div className="patient-avatar">
                  {(group.patient.name || "Patient").split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("")}
                </div>
                <div className="alerts-group-patient">
                  <strong>{group.patient.name}</strong>
                  <span>{group.patient.email}</span>
                </div>
                <span className="alerts-group-count">
                  {group.activeCount} active {group.activeCount === 1 ? "alert" : "alerts"}
                </span>
                {group.activeHigh > 0 && <span className="risk-chip risk-chip-high">{group.activeHigh} high</span>}
                <ChevronDown size={16} className={`alerts-group-chevron ${isCollapsed ? "collapsed" : ""}`} />
              </button>

              {!isCollapsed && (
                <ul className="alerts-list">
                  {group.visible.map((alert) => {
                    const Icon = SEVERITY_ICON[alert.severity];
                    return (
                      <li key={alert.id} className={`alert-item alert-item-${alert.severity} ${alert.status === "resolved" ? "resolved" : ""}`}>
                        <span className={`alert-item-icon alert-icon-${alert.severity}`}>
                          <Icon size={16} />
                        </span>
                        <div className="alert-item-text">
                          <strong>{alert.title}</strong>
                          <small>
                            {alert.stream} data · <Clock3 size={11} /> {timeAgo(alert.at, now)}
                          </small>
                        </div>
                        <span className={`risk-badge risk-badge-${alert.severity}`}>{SEVERITY_LABEL[alert.severity]}</span>
                        <span className={`alert-status alert-status-${alert.status}`}>
                          {alert.status === "new" ? "New" : alert.status === "acknowledged" ? "Acknowledged" : "Resolved"}
                        </span>
                        <div className="alert-actions">
                          {alert.status === "new" && (
                            <button type="button" className="alert-action-button" onClick={() => setStatus(alert.id, "acknowledged")}>
                              <Check size={14} /> Acknowledge
                            </button>
                          )}
                          {alert.status !== "resolved" && (
                            <button type="button" className="alert-action-button" onClick={() => setStatus(alert.id, "resolved")}>
                              <CheckCheck size={14} /> Resolve
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertsView;