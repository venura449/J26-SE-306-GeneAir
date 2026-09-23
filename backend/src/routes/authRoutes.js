const express = require('express');
const controller = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const multer = require('multer');
const path = require('path');
const uploadDirectory = path.resolve(__dirname, '../../uploads');
const router = express.Router();
const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/logout', authenticate, controller.logout);
router.get('/profile', authenticate, controller.getProfile);
router.patch('/profile', authenticate, upload.single('profileImage'), controller.updateProfile);
module.exports = router;
