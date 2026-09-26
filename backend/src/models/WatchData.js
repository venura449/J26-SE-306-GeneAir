const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  heartRate: Number,
  steps: Number,
  lightLux: Number,
  gyroX: Number,
  gyroY: Number,
  gyroZ: Number,
  spo2: Number,
  bodyTemp: Number,
}, { timestamps: true });
module.exports = mongoose.model('WatchData', schema);
