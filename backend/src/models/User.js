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
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
