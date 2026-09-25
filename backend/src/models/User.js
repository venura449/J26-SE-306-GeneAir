const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  countryCode: { type: String, trim: true, default: '+1' },
  phone: { type: String, trim: true, default: '' },
  specialty: { type: String, trim: true, default: '' },
  organization: { type: String, trim: true, default: '' },
  bio: { type: String, trim: true, default: '' },
  profileImage: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  static_bmi_range: { type: String, default: 'Normal' },
  static_age_diagnosed_range: { type: String, default: '0-6yo' },
  static_max_pef_expected: { type: Number, default: 490 },
  static_pack_years: { type: Number, default: 0 },
  static_severity: { type: String, default: 'Moderate' },
  static_pef_best: { type: Number, default: 450 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
