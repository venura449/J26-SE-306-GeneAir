const User = require("../models/User");
const WatchData = require("../models/WatchData");
const RiskEvaluation = require("../models/RiskEvaluation");
const logger = require("../utils/logger");

function ageDays(date) {
  return date
    ? Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000)
    : 1e9;
}
function rowToIot(row) {
  return row
    ? { hr: row.heartRate, steps: row.steps, temperature: row.bodyTemp }
    : {};
}
function normalizeClinical(value = {}) {
  return {
    pef_max_mean: value.clinical_pef_max ?? value.pef_max_mean,
    pef_max_min: value.clinical_pef_max ?? value.pef_max_min,
    pef_max_max: value.clinical_pef_max ?? value.pef_max_max,
    pefs_mean: value.clinical_pef_morning ?? value.pefs_mean,
    night_symptom: value.clinical_night_symp ?? value.night_symptom,
    day_symptom: value.clinical_day_symp ?? value.day_symptom,
    activity_limitation:
      value.clinical_limit_activity ?? value.activity_limitation,
    trigger_count: value.clinical_trigger_count ?? value.trigger_count,
  };
}
function normalizeMedication(value = {}) {
  return {
    previous_inhaler:
      value.medication_previous_inhaler ?? value.previous_inhaler,
    relief_inhaler: value.medication_relief_inhaler ?? value.relief_inhaler,
    inhaler_events: value.medication_inhaler_events ?? value.inhaler_events,
    inhaler_types: value.medication_inhaler_types ?? value.inhaler_types,
  };
}
async function evaluatePatient(req, res) {
  try {
    logger.info(`Risk evaluation attempt for patient: ${req.params.id}`);
    const doctor = await User.findById(req.user.sub).select("patients");
    if (
      !doctor ||
      !doctor.patients.some((id) => String(id) === String(req.params.id))
    ) {
      logger.warn(
        `Unauthorized risk evaluation attempt for patient: ${req.params.id} by doctor: ${req.user.sub}`,
      );
      return res
        .status(403)
        .json({ message: "This patient is not on your list." });
    }
    const patient = await User.findById(req.params.id).lean();
    if (!patient) {
      logger.warn(`Patient not found: ${req.params.id}`);
      return res.status(404).json({ message: "Patient not found." });
    }
    const history = await WatchData.find({ userId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    const latest = history[history.length - 1];
    const aiUrl = `${process.env.AI_SERVICE_URL || "http://127.0.0.1:8000"}/predict`;
    const iot = latest ? rowToIot(latest) : {};
    const payload = {
      iot_history: history.map(rowToIot),
      iot_current: iot,
      clinical_history: (Array.isArray(patient.clinical)
        ? patient.clinical
        : [patient.clinical || {}]
      ).map(normalizeClinical),
      medication_history: (Array.isArray(patient.medication)
        ? patient.medication
        : [patient.medication || {}]
      ).map(normalizeMedication),
      static: {
        bmi_range: patient.static_bmi_range,
        age_diagnosed_range: patient.static_age_diagnosed_range,
        max_pef_expected: patient.static_max_pef_expected,
        pack_years: patient.static_pack_years,
        severity: patient.static_severity,
        pef_best: patient.static_pef_best,
      },
      tvl_sources: {
        static: { age_days: 0, coverage: 1, completeness: 1 },
        watch: {
          age_days: ageDays(latest?.createdAt),
          coverage: latest ? 1 : 0,
          completeness: latest
            ? Object.values(iot).filter(Number.isFinite).length / 3
            : 0,
        },
        environment: { age_days: 1e9, coverage: 0, completeness: 0 },
        peakflow: {
          age_days: ageDays(patient.updatedAt),
          coverage: patient.clinical?.pef_best ? 1 : 0,
          completeness: patient.clinical?.pef_best ? 1 : 0,
        },
        symptoms: {
          age_days: ageDays(patient.updatedAt),
          coverage:
            patient.clinical && Object.keys(patient.clinical).length ? 1 : 0,
          completeness:
            patient.clinical && Object.keys(patient.clinical).length ? 1 : 0,
        },
        med_daily: {
          age_days: ageDays(patient.updatedAt),
          coverage:
            patient.medication && Object.keys(patient.medication).length
              ? 1
              : 0,
          completeness:
            patient.medication && Object.keys(patient.medication).length
              ? 1
              : 0,
        },
        smart_inhaler: { age_days: 1e9, coverage: 0, completeness: 0 },
      },
    };
    const response = await fetch(aiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      logger.error(
        `Risk evaluation failed for patient: ${req.params.id} by doctor: ${req.user.sub}`,
        data,
      );
      return res
        .status(502)
        .json({ message: data.detail || "AI risk evaluation failed." });
    }
    await RiskEvaluation.create({
      patientId: patient._id,
      doctorId: req.user.sub,
      score: data.final_risk_probability,
      riskState: data.risk_state_demo,
      streamRisks: data.stream_risks,
      tvl: data.tvl,
      modelVersion: data.model_version,
    });
    return res.json({
      patient: { id: patient.id, name: patient.name },
      evaluatedAt: new Date(),
      ...data,
    });
  } catch (error) {
    logger.error(
      `Risk evaluation failed for patient: ${req.params.id} by doctor: ${req.user.sub}`,
      error,
    );
    console.error("Risk evaluation failed:", error);
    return res.status(502).json({
      message:
        "Unable to evaluate patient risk. Check that the AI service is running.",
    });
  }
}
async function getPatientRiskHistory(req, res) {
  try {
    logger.info(`Risk history load attempt for patient: ${req.params.id}`);
    const doctor = await User.findById(req.user.sub).select("patients");
    if (
      !doctor ||
      !doctor.patients.some((id) => String(id) === String(req.params.id))
    ) {
      logger.warn(`Patient not found in doctor's list: ${req.params.id}`);
      return res
        .status(403)
        .json({ message: "This patient is not on your list." });
    }
    return res.json(
      await RiskEvaluation.find({
        patientId: req.params.id,
        doctorId: req.user.sub,
      })
        .sort({ createdAt: 1 })
        .lean(),
    );
  } catch (error) {
    logger.error(
      `Risk history load failed for patient: ${req.params.id} by doctor: ${req.user.sub}`,
      error,
    );
    return res.status(500).json({ message: "Unable to load risk history." });
  }
}
module.exports = { evaluatePatient, getPatientRiskHistory };
