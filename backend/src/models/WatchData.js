const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  heartRate: Number,
  steps: Number,
  lightLux: Number,
  gyroX: Number,
  gyroY: Number,
  gyroZ: Number,
  spo2: Number,
  bodyTemp: Number,
  latitude: Number,
  longitude: Number,
  locationName: { type: String, default: '' },
}, { timestamps: true });
schema.index({ userId: 1, createdAt: 1 });
module.exports = mongoose.model('WatchData', schema);
