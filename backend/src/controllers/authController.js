const authService = require("../services/authService");
const logger = require("../utils/logger");

function validCredentials(body) {
  return (
    body.username?.trim() && body.email?.includes("@") && body.password?.length >= 8
  );
}
async function register(request, response) {
  try {
    logger.info(`Registration attempt for email: ${request.body.email}`);

    if (!validCredentials(request.body)) {
      logger.warn(
        `Invalid registration attempt for email: ${request.body.email}`,
      );

      return response.status(400).json({
        message:
          "Enter a username, valid email, and password with at least 8 characters.",
      });
    }

    const newuser = await authService.register(request.body);
    logger.info(`Successfully registered user: ${newuser._id}`);
    return response.status(201).json(newuser);
  } catch (error) {
    logger.error("Registration failed:", error);

    return response.status(error.status || 500).json({
      message: error.status ? error.message : error.message,
    });
  }
}
async function login(request, response) {
  try {
    const { email, password } = request.body;

    logger.info(`Login attempt for email: ${email}`);

    if (!email?.includes("@") || !password) {
      logger.warn(`Invalid login attempt for email: ${email}`);

      return response
        .status(400)
        .json({ message: "Enter your email and password." });
    }
    const user = await authService.login(email, password);
    logger.info(`Successfully logged in user: ${user.id}`);
    return response.json(user);
  } catch (error) {
    logger.error("Login failed: ", error);

    return response.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to sign in right now.",
    });
  }
}

async function logout(request, response) {
  logger.info(`Logout attempt for token: ${request.tokenId}`);
  logger.info(`Logout successful for token: ${request.tokenId}`);
  await authService.revokeSession(request.tokenId);
  return response.status(204).send();
}

async function forgotPassword(request, response) {
  logger.info(`Password reset attempt for email: ${request.body.email}`);

  if (!request.body.email?.includes("@")) {
    logger.warn(
      `Invalid password reset attempt for email: ${request.body.email}`,
    );

    return response
      .status(400)
      .json({ message: "Enter a valid email address." });
  }

  return response.json({
    message:
      "If an account exists for this email, reset instructions will be sent.",
  });
}

async function getProfile(request, response) {
  try {
    logger.info(`Profile load attempt for user: ${request.user.sub}`);
    return response.json(await authService.getProfile(request.user.sub));
  } catch (error) {
    logger.error("Profile load failed: ", error);

    return response.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to load your profile.",
    });
  }
}
async function updateProfile(request, response) {
  try {
    const profile = {
      username: request.body.username?.trim(),
      countryCode: request.body.countryCode?.trim() || "+1",
      phone: request.body.phone?.trim() || "",
      specialty: request.body.specialty?.trim() || "",
      organization: request.body.organization?.trim() || "",
      bio: request.body.bio?.trim() || "",
    };

    logger.info(`Profile update attempt for user: ${request.user.sub}`);

    if (!profile.username) {
      logger.warn(
        `Invalid profile update attempt for user: ${request.user.sub}`,
      );
      return response.status(400).json({ message: "Your username is required." });
    }
    if (request.file) {
      logger.info(`Profile image update attempt for user: ${request.user.sub}`);
      profile.profileImage = `/uploads/${request.file.filename}`;
    }
    return response.json(
      await authService.updateProfile(request.user.sub, profile),
    );
  } catch (error) {
    logger.error("Profile update failed: ", error);
    return response.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to save your profile.",
    });
  }
}

const User = require("../models/User");
const WatchData = require("../models/WatchData");
const mongoose = require("mongoose");

async function searchPatients(req, res) {
  try {
    const q = req.query.q || "";
    if (!q.trim()) return res.json([]);
    const users = await User.find({
      username: { $regex: q, $options: "i" },
      _id: { $ne: req.user.sub },
    }).select("username email profileImage phone");
    return res.json(users);
  } catch (error) {
    logger.error("Patient search failed: ", error);
    return res.status(500).json({ message: "Unable to search patients" });
  }
}

async function addPatient(req, res) {
  try {
    logger.info(`Add patient attempt by doctor: ${req.user.sub}`);
    const { patientId } = req.body;
    if (!patientId) {
      logger.warn(`Invalid add patient attempt by doctor: ${req.user.sub}`);
      return res.status(400).json({ message: "Patient ID required" });
    }

    // Add to doctor's list
    await User.findByIdAndUpdate(req.user.sub, {
      $addToSet: { patients: patientId },
    });

    // Optional: Add to patient's doctor field
    await User.findByIdAndUpdate(patientId, {
      doctor: req.user.sub,
    });
    logger.info(
      `Patient ${patientId} added successfully by doctor: ${req.user.sub}`,
    );
    return res.json({ message: "Patient added successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to add patient" });
  }
}

async function removePatient(req, res) {
  try {
    logger.info(`Remove patient attempt by doctor: ${req.user.sub}`);

    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      logger.warn(`Invalid remove patient attempt by doctor: ${req.user.sub}`);
      return res.status(400).json({ message: "Invalid patient" });
    }
    logger.info(`Removing patient ${patientId} from doctor: ${req.user.sub}`);
    const result = await User.findOneAndUpdate(
      { _id: req.user.sub, patients: patientId },
      { $pull: { patients: patientId } },
    );
    logger.info(
      `Patient ${patientId} removed successfully from doctor: ${req.user.sub}`,
    );
    if (!result) {
      logger.warn(
        `Patient ${patientId} not found in doctor: ${req.user.sub}'s list`,
      );
      return res.status(404).json({ message: "Patient is not on your list" });
    }
    await User.findByIdAndUpdate(patientId, { $unset: { doctor: 1 } });
    return res.json({ message: "Patient removed successfully" });
  } catch (error) {
    logger.error("Remove patient failed: ", error);
    return res.status(500).json({ message: "Unable to remove patient" });
  }
}

async function getPatients(req, res) {
  try {
    logger.info(`Fetching patients for doctor: ${req.user.sub}`);
    const doctor = await User.findById(req.user.sub).populate(
      "patients",
      "username email profileImage phone dateOfBirth bmi static_severity static_bmi_range static_age_diagnosed_range static_pef_best static_max_pef_expected static_pack_years createdAt",
    );
    return res.json(doctor.patients || []);
  } catch (error) {
    logger.error("Fetching patients failed: ", error);
    return res.status(500).json({ message: "Unable to fetch patients" });
  }
}

async function getPatientRecord(req, res) {
  try {
    logger.info(
      `Fetching patient record for doctor: ${req.user.sub}, patient: ${req.params.id}`,
    );
    const patientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patient" });
    }
    const doctor = await User.findById(req.user.sub).select("patients");
    if (!doctor) {
      return res.status(404).json({ message: "Account not found" });
    }
    const assigned = doctor.patients.some(
      (id) => String(id) === String(patientId),
    );
    if (!assigned) {
      return res
        .status(403)
        .json({ message: "This patient is not on your list." });
    }

    const patient = await User.findById(patientId).select(
      "-passwordHash -patients",
    );
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // Fetch the newest readings first so the limit never hides current data.
    // Reverse the limited set for chronological chart rendering.
    const history = (
      await WatchData.find({ userId: patientId })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean()
    ).reverse();
    const latest = history.length ? history[history.length - 1] : null;
    const locations = history.filter(
      (row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
    );
    return res.json({ patient, latest, history, locations });
  } catch (error) {
    logger.error("Unable to load patient record:", error);
    return res.status(500).json({ message: "Unable to load patient record" });
  }
}

async function updatePatientDetails(req, res) {
  try {
    const doctor = await User.findById(req.user.sub).select("patients");
    if (
      !doctor ||
      !doctor.patients.some((id) => String(id) === String(req.params.id))
    )
      return res
        .status(403)
        .json({ message: "This patient is not on your list." });
    const patient = await User.findByIdAndUpdate(
      req.params.id,
      {
        clinical: req.body.clinical || {},
        medication: req.body.medication || {},
      },
      { new: true },
    ).select("clinical medication");
    if (!patient) {
      logger.error("Unable to find patient:", error);
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json(patient);
  } catch (error) {
    logger.error("Unable to save patient details:", error);
    return res.status(500).json({ message: "Unable to save patient details" });
  }
}

module.exports = {
  searchPatients,
  addPatient,
  removePatient,
  getPatients,
  getPatientRecord,
  register,
  login,
  logout,
  forgotPassword,
  getProfile,
  updateProfile,
  updatePatientDetails,
};
