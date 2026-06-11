const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const {
  registerUser,
  updateFCMToken,
  getProfile,
  getStudentsForSchool,
  getChildrenForParent,
} = require('../controllers/userController');
const {
  getStudentJourney,
  startJourney,
  confirmCheckpointHandler,
  getSchoolJourneys,
} = require('../controllers/journeyController');
const {
  triggerEmergency,
  resolveEmergency,
  getActiveEmergencies,
} = require('../controllers/emergencyController');
const { getChatMessages, postMessage } = require('../controllers/chatController');

// ── User routes ───────────────────────────────────────────────────────────────
router.post('/users/register', requireAuth, registerUser);
router.put('/users/fcm-token', requireAuth, updateFCMToken);
router.get('/users/me', requireAuth, getProfile);
router.get('/users/children', requireAuth, requireRole('parent'), getChildrenForParent);
router.get('/users/school/:schoolId/students', requireAuth, requireRole('admin', 'teacher'), getStudentsForSchool);

// ── Journey routes ────────────────────────────────────────────────────────────
router.post('/journeys/start', requireAuth, startJourney);
router.post('/journeys/:journeyId/checkpoint', requireAuth, confirmCheckpointHandler);
router.get('/journeys/student/:studentId', requireAuth, getStudentJourney);
router.get('/journeys/school/:schoolId', requireAuth, requireRole('admin', 'teacher'), getSchoolJourneys);

// ── Chat routes ───────────────────────────────────────────────────────────────
router.get('/journeys/:journeyId/chat', requireAuth, getChatMessages);
router.post('/journeys/:journeyId/chat', requireAuth, postMessage);

// ── Emergency routes ──────────────────────────────────────────────────────────
router.post('/emergency/trigger', requireAuth, triggerEmergency);
router.post('/emergency/:emergencyId/resolve', requireAuth, requireRole('admin', 'security'), resolveEmergency);
router.get('/emergency/school/:schoolId/active', requireAuth, getActiveEmergencies);

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

module.exports = router;