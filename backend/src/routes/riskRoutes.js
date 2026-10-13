const express = require('express');
const authenticate = require('../middleware/authenticate');
const controller = require('../controllers/riskController');
const router = express.Router();
router.post('/patients/:id/evaluate', authenticate, controller.evaluatePatient);
router.get('/patients/:id/history', authenticate, controller.getPatientRiskHistory);
module.exports = router;
