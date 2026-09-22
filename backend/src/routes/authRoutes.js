const express = require('express');
const controller = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const router = express.Router();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/logout', authenticate, controller.logout);
module.exports = router;
