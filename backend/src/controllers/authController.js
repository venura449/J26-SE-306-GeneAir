const authService = require('../services/authService');

function validCredentials(body) { return body.name?.trim() && body.email?.includes('@') && body.password?.length >= 8; }
async function register(request, response) { try { if (!validCredentials(request.body)) return response.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' }); return response.status(201).json(await authService.register(request.body)); } catch (error) { console.error('Registration failed:', error); return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to create your account right now.' }); } }
async function login(request, response) { try { const { email, password } = request.body; if (!email?.includes('@') || !password) return response.status(400).json({ message: 'Enter your email and password.' }); return response.json(await authService.login(email, password)); } catch (error) { console.error('Login failed:', error); return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to sign in right now.' }); } }
async function logout(request, response) { await authService.revokeSession(request.tokenId); return response.status(204).send(); }
async function forgotPassword(request, response) { if (!request.body.email?.includes('@')) return response.status(400).json({ message: 'Enter a valid email address.' }); return response.json({ message: 'If an account exists for this email, reset instructions will be sent.' }); }
async function getProfile(request, response) { try { return response.json(await authService.getProfile(request.user.sub)); } catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load your profile.' }); } }
async function updateProfile(request, response) {
    try {
        const profile = {
            name: request.body.name?.trim(),
            countryCode: request.body.countryCode?.trim() || '+1',
            phone: request.body.phone?.trim() || '',
            specialty: request.body.specialty?.trim() || '',
            organization: request.body.organization?.trim() || '',
            bio: request.body.bio?.trim() || '',
        };
        if (!profile.name) return response.status(400).json({ message: 'Your name is required.' });
        if (request.file) profile.profileImage = `/uploads/${request.file.filename}`;
        return response.json(await authService.updateProfile(request.user.sub, profile));
    } catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save your profile.' }); }
}


const User = require('../models/User');
const WatchData = require('../models/WatchData');
const mongoose = require('mongoose');

async function searchPatients(req, res) {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json([]);
    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.sub }
    }).select('name email profileImage phone');
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to search patients' });
  }
}

async function addPatient(req, res) {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient ID required' });
    
    // Add to doctor's list
    await User.findByIdAndUpdate(req.user.sub, {
      $addToSet: { patients: patientId }
    });
    
    // Optional: Add to patient's doctor field
    await User.findByIdAndUpdate(patientId, {
      doctor: req.user.sub
    });

    return res.json({ message: 'Patient added successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add patient' });
  }
}

async function removePatient(req, res) {
  try {
    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) return res.status(400).json({ message: 'Invalid patient' });
    const result = await User.findOneAndUpdate(
      { _id: req.user.sub, patients: patientId },
      { $pull: { patients: patientId } },
    );
    if (!result) return res.status(404).json({ message: 'Patient is not on your list' });
    await User.findByIdAndUpdate(patientId, { $unset: { doctor: 1 } });
    return res.json({ message: 'Patient removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to remove patient' });
  }
}

async function getPatients(req, res) {
  try {
    const doctor = await User.findById(req.user.sub).populate(
      'patients',
      'name email profileImage phone dateOfBirth bmi static_severity static_bmi_range static_age_diagnosed_range static_pef_best static_max_pef_expected static_pack_years createdAt',
    );
    return res.json(doctor.patients || []);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch patients' });
  }
}

async function getPatientRecord(req, res) {
  try {
    const patientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: 'Invalid patient' });
    }
    const doctor = await User.findById(req.user.sub).select('patients');
    if (!doctor) return res.status(404).json({ message: 'Account not found' });
    const assigned = doctor.patients.some((id) => String(id) === String(patientId));
    if (!assigned) return res.status(403).json({ message: 'This patient is not on your list.' });

    const patient = await User.findById(patientId).select('-passwordHash -patients');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const history = await WatchData.find({ userId: patientId }).sort({ createdAt: 1 }).limit(400).lean();
    const latest = history.length ? history[history.length - 1] : null;
    const locations = history.filter(
      (row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
    );

    return res.json({ patient, latest, history, locations });
  } catch (error) {
    console.error('Unable to load patient record:', error);
    return res.status(500).json({ message: 'Unable to load patient record' });
  }
}

module.exports = {
  searchPatients,
  addPatient,
  removePatient,
  getPatients,
  getPatientRecord,
  register, login, logout, forgotPassword, getProfile, updateProfile };
