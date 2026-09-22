const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');

const jwtSecret = process.env.JWT_SECRET;
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }

async function createSession(user) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await Session.create({ tokenId, userId: user.id, expiresAt });
  return { token: jwt.sign({ sub: user.id, email: user.email, name: user.name, jti: tokenId }, jwtSecret, { expiresIn: '7d' }), user: publicUser(user) };
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
  return createSession(user);
}

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw Object.assign(new Error('Email or password is incorrect.'), { status: 401 });
  return createSession(user);
}

async function revokeSession(tokenId) { await Session.deleteOne({ tokenId }); }
async function isSessionActive(tokenId) { return Boolean(await Session.exists({ tokenId, expiresAt: { $gt: new Date() } })); }

module.exports = { register, login, revokeSession, isSessionActive };
