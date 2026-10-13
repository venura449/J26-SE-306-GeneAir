const mongoose = require('mongoose');
module.exports = mongoose.model('RiskEvaluation', new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  riskState: String,
  streamRisks: mongoose.Schema.Types.Mixed,
  tvl: mongoose.Schema.Types.Mixed,
  modelVersion: String,
}, { timestamps: true }));
