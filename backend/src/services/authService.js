const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Session = require("../models/Session");
const logger = require("../utils/logger");

const jwtSecret = process.env.JWT_SECRET;
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    countryCode: user.countryCode || "+1",
    phone: user.phone || "",
    specialty: user.specialty || "",
    organization: user.organization || "",
    bio: user.bio || "",
    profileImage: user.profileImage || "",
    dateOfBirth: user.dateOfBirth || "",
    bmi: user.bmi ?? 0,
    static_bmi_range: user.static_bmi_range || "Normal",
    static_age_diagnosed_range: user.static_age_diagnosed_range || "0-6yo",
    static_max_pef_expected: user.static_max_pef_expected ?? 490,
    static_pack_years: user.static_pack_years ?? 0,
    static_severity: user.static_severity || "Moderate",
    static_pef_best: user.static_pef_best ?? 450,
  };
}

async function createSession(user) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await Session.create({ tokenId, userId: user.id, expiresAt });

  logger.info(`Session saved to database for user: ${user.id}`);
  return {
    token: jwt.sign(
      { sub: user.id, email: user.email, name: user.name, jti: tokenId },
      jwtSecret,
      { expiresIn: "7d" },
    ),
    user: publicUser(user),
  };
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    logger.warn(
      `Registration blocked: Email already exists in database (${normalizedEmail})`,
    );
    throw Object.assign(
      new Error("An account with this email already exists."),
      { status: 409 },
    );
  }
  logger.info(`New user record created in database: ${user.id}`);
  return createSession(user);
}

async function login(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    logger.warn(
      `Login rejected: Invalid database credentials for email (${normalizedEmail})`,
    );
    throw Object.assign(new Error("Email or password is incorrect."), {
      status: 401,
    });
  }

  logger.info(`User credentials verified in database: ${user.id}`);
  return createSession(user);
}

async function getProfile(userId) {
  const user = await User.findById(userId);

  if (!user) {
    logger.warn(
      `Profile fetch failed: User ID not found in database (${userId})`,
    );
    throw Object.assign(new Error("User account not found."), { status: 404 });
  }

  return publicUser(user);
}

async function updateProfile(userId, profile) {
  const user = await User.findByIdAndUpdate(userId, profile, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    logger.warn(
      `Profile update failed: User ID not found in database (${userId})`,
    );
    throw Object.assign(new Error("User account not found."), { status: 404 });
  }

  logger.info(`User profile updated in database: ${userId}`);
  return publicUser(user);
}

async function revokeSession(tokenId) {
  await Session.deleteOne({ tokenId });
  logger.info(`Session record deleted from database for token: ${tokenId}`);
}

async function isSessionActive(tokenId) {
  return Boolean(
    await Session.exists({ tokenId, expiresAt: { $gt: new Date() } }),
  );
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  revokeSession,
  isSessionActive,
};
