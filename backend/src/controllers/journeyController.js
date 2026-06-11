const {
  getOrCreateJourney,
  confirmCheckpoint,
  getJourneyForStudent,
  getSchoolJourneysToday,
} = require('../services/journeyService');

async function getStudentJourney(req, res) {
  const { studentId } = req.params;

  try {
    const journey = await getJourneyForStudent(studentId);
    if (!journey) return res.status(404).json({ message: 'No journey found for today' });
    return res.json(journey);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function startJourney(req, res) {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    const journey = await getOrCreateJourney(studentId);
    return res.status(200).json(journey);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function confirmCheckpointHandler(req, res) {
  const { journeyId } = req.params;
  const { checkpoint, biometricVerified } = req.body;
  const confirmedBy = req.user.uid;
  const confirmerRole = req.user.role;

  if (!checkpoint) return res.status(400).json({ error: 'checkpoint is required' });
  if (!biometricVerified) return res.status(400).json({ error: 'Biometric verification required' });

  try {
    const result = await confirmCheckpoint({
      journeyId,
      checkpoint,
      confirmedBy,
      confirmerRole,
      biometricVerified,
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function getSchoolJourneys(req, res) {
  const { schoolId } = req.params;

  try {
    const journeys = await getSchoolJourneysToday(schoolId);
    return res.json(journeys);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getStudentJourney,
  startJourney,
  confirmCheckpointHandler,
  getSchoolJourneys,
};