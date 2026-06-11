const { getDb } = require('../utils/firebase');
const { postSystemMessage, getTodayString } = require('./alertService');
const {
  CHECKPOINTS,
  CHECKPOINT_ORDER,
  CHECKPOINT_CONFIRMERS,
  JOURNEY_STATUS,
  ALERT_STATUS,
  CHAT_MESSAGE_TYPES,
} = require('../utils/constants');

async function getOrCreateJourney(studentId) {
  const db = getDb();
  const today = getTodayString();

  const snap = await db.collection('journeys')
    .where('studentId', '==', studentId)
    .where('date', '==', today)
    .limit(1)
    .get();

  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  const studentSnap = await db.collection('users').doc(studentId).get();
  if (!studentSnap.exists) throw new Error('Student not found');

  const student = studentSnap.data();

  const journeyData = {
    studentId,
    studentName: student.name,
    parentId: student.parentId,
    schoolId: student.schoolId,
    teacherId: student.teacherId || null,
    date: today,
    status: JOURNEY_STATUS.NOT_STARTED,
    alertStatus: ALERT_STATUS.NONE,
    checkpoints: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ref = await db.collection('journeys').add(journeyData);
  return { id: ref.id, ...journeyData };
}

async function confirmCheckpoint({ journeyId, checkpoint, confirmedBy, confirmerRole, biometricVerified }) {
  const db = getDb();

  if (!biometricVerified) {
    throw new Error('Biometric verification required to confirm checkpoint');
  }

  if (!Object.values(CHECKPOINTS).includes(checkpoint)) {
    throw new Error(`Invalid checkpoint: ${checkpoint}`);
  }

  const journeyRef = db.collection('journeys').doc(journeyId);
  const journeySnap = await journeyRef.get();
  if (!journeySnap.exists) throw new Error('Journey not found');

  const journey = journeySnap.data();

  const allowedRoles = CHECKPOINT_CONFIRMERS[checkpoint];
  if (!allowedRoles.includes(confirmerRole)) {
    throw new Error(`Role '${confirmerRole}' cannot confirm checkpoint '${checkpoint}'`);
  }

  const existing = journey.checkpoints[checkpoint] || {};
  const confirmations = existing.confirmations || {};

  if (confirmations[confirmerRole]) {
    throw new Error(`Already confirmed by ${confirmerRole}`);
  }

  confirmations[confirmerRole] = {
    userId: confirmedBy,
    timestamp: new Date(),
    biometricVerified: true,
  };

  const allConfirmed = allowedRoles.every(role => !!confirmations[role]);

  const checkpointData = {
    ...existing,
    confirmations,
    fullyConfirmed: allConfirmed,
    timestamp: allConfirmed ? new Date() : (existing.timestamp || null),
  };

  const updatedCheckpoints = { ...journey.checkpoints, [checkpoint]: checkpointData };
  const newStatus = deriveJourneyStatus(updatedCheckpoints);

  await journeyRef.update({
    [`checkpoints.${checkpoint}`]: checkpointData,
    status: newStatus,
    alertStatus: newStatus === JOURNEY_STATUS.COMPLETED ? ALERT_STATUS.NONE : journey.alertStatus,
    updatedAt: new Date(),
  });

  if (allConfirmed) {
    const label = checkpoint.replace(/_/g, ' ').toLowerCase();
    const time = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    await postSystemMessage(
      journeyId,
      `✅ ${journey.studentName} — ${label} confirmed at ${time}`,
      CHAT_MESSAGE_TYPES.SYSTEM
    );
  }

  return { journeyId, checkpoint, allConfirmed, status: newStatus };
}

function deriveJourneyStatus(checkpoints) {
  const allDone = CHECKPOINT_ORDER.every(cp => checkpoints[cp]?.fullyConfirmed === true);
  if (allDone) return JOURNEY_STATUS.COMPLETED;

  const anyStarted = CHECKPOINT_ORDER.some(cp => checkpoints[cp]?.fullyConfirmed === true);
  if (anyStarted) return JOURNEY_STATUS.IN_PROGRESS;

  return JOURNEY_STATUS.NOT_STARTED;
}

async function getJourneyForStudent(studentId) {
  const db = getDb();
  const today = getTodayString();

  const snap = await db.collection('journeys')
    .where('studentId', '==', studentId)
    .where('date', '==', today)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getSchoolJourneysToday(schoolId) {
  const db = getDb();
  const today = getTodayString();

  const snap = await db.collection('journeys')
    .where('schoolId', '==', schoolId)
    .where('date', '==', today)
    .orderBy('updatedAt', 'desc')
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

module.exports = {
  getOrCreateJourney,
  confirmCheckpoint,
  getJourneyForStudent,
  getSchoolJourneysToday,
};