const authService = require('../services/authService');

async function mobileRegister(req, res) { try {
  if (!req.body.name?.trim() || !req.body.email?.includes('@') || req.body.password?.length < 8) return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' });
  return res.status(201).json(await authService.register(req.body));
} catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to create your account right now.' }); } }

async function mobileLogin(req, res) { try {
  const { email, password } = req.body;
  if (!email?.includes('@') || !password) return res.status(400).json({ message: 'Enter your email and password.' });
  return res.json(await authService.login(email, password));
} catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to sign in right now.' }); } }

async function mobileLogout(req, res) { await authService.revokeSession(req.tokenId); return res.status(204).send(); }
async function mobileForgotPassword(req, res) { if (!req.body.email?.includes('@')) return res.status(400).json({ message: 'Enter a valid email address.' }); return res.json({ message: 'If an account exists for this email, reset instructions will be sent.' }); }
async function mobileProfile(req, res) { try { return res.json(await authService.getProfile(req.user.sub)); } catch (error) { return res.status(error.status || 500).json({ message: 'Unable to load your profile.' }); } }
async function mobileUpdateProfile(req, res) { try {
  const profile = {
    name: req.body.name?.trim(), dateOfBirth: req.body.dateOfBirth?.trim() || '', bmi: Number(req.body.bmi) || 0,
    static_bmi_range: req.body.static_bmi_range?.trim() || 'Normal', static_age_diagnosed_range: req.body.static_age_diagnosed_range?.trim() || '0-6yo',
    static_max_pef_expected: Number(req.body.static_max_pef_expected) || 0, static_pack_years: Number(req.body.static_pack_years) || 0,
    static_severity: req.body.static_severity?.trim() || 'Moderate', static_pef_best: Number(req.body.static_pef_best) || 0,
  };
  if (!profile.name) return res.status(400).json({ message: 'Your name is required.' });
  if (req.file) profile.profileImage = `/uploads/${req.file.filename}`;
  return res.json(await authService.updateProfile(req.user.sub, profile));
} catch (error) { console.error('Mobile profile update failed:', error); return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save your mobile profile.' }); } }

const WatchData = require('../models/WatchData');
function optionalNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
async function mobileSyncWatch(req, res) {
  try {
    const body = req.body || {};
    const data = await WatchData.create({
      userId: req.user.sub,
      heartRate: optionalNumber(body.heartRate),
      steps: optionalNumber(body.steps),
      lightLux: optionalNumber(body.lightLux),
      gyroX: optionalNumber(body.gyroX),
      gyroY: optionalNumber(body.gyroY),
      gyroZ: optionalNumber(body.gyroZ),
      spo2: optionalNumber(body.spo2),
      bodyTemp: optionalNumber(body.bodyTemp),
      latitude: optionalNumber(body.latitude),
      longitude: optionalNumber(body.longitude),
      locationName: typeof body.locationName === 'string' ? body.locationName.slice(0, 160) : '',
    });
    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to save watch data.' });
  }
}
module.exports = { mobileSyncWatch, mobileRegister, mobileLogin, mobileLogout, mobileForgotPassword, mobileProfile, mobileUpdateProfile };
