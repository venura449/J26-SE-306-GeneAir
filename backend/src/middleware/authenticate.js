const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

module.exports = async function authenticate(request, response, next) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return response.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.jti || !(await authService.isSessionActive(payload.jti))) return response.status(401).json({ message: 'Session expired. Please sign in again.' });
    request.user = payload;
    request.tokenId = payload.jti;
    return next();
  } catch { return response.status(401).json({ message: 'Session expired. Please sign in again.' }); }
};
