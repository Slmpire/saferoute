const { getDb } = require('../utils/firebase');
const {
  sendPush,
  sendSMS,
  makeCall,
  getFCMTokensForUsers,
  getPhonesForUsers,
} = require('./notificationService');
const {
  ALERT_STATUS,
  JOURNEY_STATUS,
  CHECKPOINTS,
  CHAT_MESSAGE_TYPES,
} = require('../utils/constants');

const WINDOW_HOME_TO_SCHOOL = parseInt(process.env.WINDOW_HOME_TO_SCHOOL || '60') * 60 * 1000;
const WINDOW_SCHOOL_TO_HOME = parseInt(process.env.WINDOW_SCHOOL_TO_HOME || '90') * 60 * 1000;
const ESCALATION_1 = parseInt(process.env.ALERT_ESCALATION_MINUTES || '15') * 60 * 1000;
const ESCALATION_2 = parseInt(process.env.SECURITY_ESCALATION_MINUTES || '30') * 60 * 1000;

async function postSystemMessage(journeyId, text, type = CHAT_MESSAGE_TYPES.SYSTEM) {
  const db = getDb();
  await db.collection('journeys').doc(journeyId).collection('chat').add({
    type,
    text,
    timestamp: new Date(),
    authorId: 'system',
    authorName: 'SafeRoute',
  });
}

async function escalateLevel1(journey, journeyId, missingCheckpoint) {
  const db = getDb();
  const { studentId, parentId, schoolId } = journey;

  const adminSnap = await db.collection('users')
    .where('schoolId', '==', schoolId)
    .where('role', '==', 'admin')
    .get();
  const adminIds = adminSnap.docs.map(d => d.id);

  const allIds = [parentId, ...adminIds];
  const tokens = await getFCMTokensForUsers(allIds);

  const studentSnap = await db.collection('users').doc(studentId).get();
  const studentName = studentSnap.data()?.name || 'Your student';

  const message = `${studentName} has not completed checkpoint: ${missingCheckpoint.replace(/_/g, ' ')}. Please check in.`;

  await sendPush({
    tokens,
    title: '⚠️ SafeRoute Alert',
    body: message,
    data: { journeyId, checkpoint: missingCheckpoint, level: '1' },
  });

  await postSystemMessage(journeyId, `🔔 Alert Level 1: ${message}`, CHAT_MESSAGE_TYPES.ALERT);

  await db.collection('journeys').doc(journeyId).update({
    alertStatus: ALERT_STATUS.LEVEL_1,
    alertLevel1At: new Date(),
    status: JOURNEY_STATUS.ALERT_ACTIVE,
  });

  console.log(`[Alert L1] Journey ${journeyId} — ${missingCheckpoint}`);
}

async function escalateLevel2(journey, journeyId, missingCheckpoint) {
  const db = getDb();
  const { studentId, parentId } = journey;

  const studentSnap = await db.collection('users').doc(studentId).get();
  const studentName = studentSnap.data()?.name || 'Student';

  const smsText = `SAFEROUTE ALERT: ${studentName} has not confirmed checkpoint ${missingCheckpoint.replace(/_/g, ' ')}. Please respond immediately or contact the school.`;

  const phones = await getPhonesForUsers([parentId]);
  if (phones.length > 0) {
    await sendSMS({ to: phones, message: smsText });
    await makeCall({ to: phones });
  }

  await postSystemMessage(journeyId, `📵 Alert Level 2: SMS and call sent to parent.`, CHAT_MESSAGE_TYPES.ALERT);

  await db.collection('journeys').doc(journeyId).update({
    alertStatus: ALERT_STATUS.LEVEL_2,
    alertLevel2At: new Date(),
  });

  console.log(`[Alert L2] Journey ${journeyId} — SMS+Call fired`);
}

async function escalateLevel3(journey, journeyId) {
  const db = getDb();
  const { studentId, schoolId } = journey;

  const studentSnap = await db.collection('users').doc(studentId).get();
  const studentName = studentSnap.data()?.name || 'Student';

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = schoolSnap.data()?.name || 'a registered school';
  const schoolAddress = schoolSnap.data()?.address || '';

  const securityPhone = process.env.SECURITY_ORG_PHONE;
  const smsText = `SAFEROUTE SECURITY ALERT: ${studentName} from ${schoolName} (${schoolAddress}) has gone missing. Journey ID: ${journeyId}. Immediate response required.`;

  if (securityPhone) {
    await sendSMS({ to: [securityPhone], message: smsText });
    await makeCall({ to: [securityPhone] });
  }

  await postSystemMessage(
    journeyId,
    `🚨 Alert Level 3: Security organisation has been contacted.`,
    CHAT_MESSAGE_TYPES.EMERGENCY
  );

  await db.collection('journeys').doc(journeyId).update({
    alertStatus: ALERT_STATUS.LEVEL_3,
    alertLevel3At: new Date(),
  });

  console.log(`[Alert L3] Journey ${journeyId} — Security org contacted`);
}

async function checkMissedCheckpoints() {
  const db = getDb();
  const now = Date.now();

  const activeSnap = await db.collection('journeys')
    .where('status', 'in', [JOURNEY_STATUS.IN_PROGRESS, JOURNEY_STATUS.ALERT_ACTIVE])
    .where('date', '==', getTodayString())
    .get();

  for (const doc of activeSnap.docs) {
    try {
      await evaluateJourney(doc.data(), doc.id, now);
    } catch (err) {
      console.error(`[Cron] Error evaluating journey ${doc.id}:`, err.message);
    }
  }
}

async function evaluateJourney(journey, journeyId, now) {
  const { checkpoints = {}, alertStatus } = journey;

  if (alertStatus === ALERT_STATUS.LEVEL_3) return;

  // HOME_DEPARTURE done but SCHOOL_ARRIVAL missing
  if (checkpoints[CHECKPOINTS.HOME_DEPARTURE] && !checkpoints[CHECKPOINTS.SCHOOL_ARRIVAL]) {
    const departedAt = checkpoints[CHECKPOINTS.HOME_DEPARTURE].timestamp?.toMillis?.() || 0;
    const elapsed = now - departedAt;

    if (elapsed > WINDOW_HOME_TO_SCHOOL + ESCALATION_2 && alertStatus !== ALERT_STATUS.LEVEL_3) {
      await escalateLevel3(journey, journeyId);
    } else if (elapsed > WINDOW_HOME_TO_SCHOOL + ESCALATION_1 && alertStatus === ALERT_STATUS.LEVEL_1) {
      await escalateLevel2(journey, journeyId, CHECKPOINTS.SCHOOL_ARRIVAL);
    } else if (elapsed > WINDOW_HOME_TO_SCHOOL && alertStatus === ALERT_STATUS.NONE) {
      await escalateLevel1(journey, journeyId, CHECKPOINTS.SCHOOL_ARRIVAL);
    }
  }

  // SCHOOL_DEPARTURE done but HOME_ARRIVAL missing
  if (checkpoints[CHECKPOINTS.SCHOOL_DEPARTURE] && !checkpoints[CHECKPOINTS.HOME_ARRIVAL]) {
    const departedAt = checkpoints[CHECKPOINTS.SCHOOL_DEPARTURE].timestamp?.toMillis?.() || 0;
    const elapsed = now - departedAt;

    if (elapsed > WINDOW_SCHOOL_TO_HOME + ESCALATION_2 && alertStatus !== ALERT_STATUS.LEVEL_3) {
      await escalateLevel3(journey, journeyId);
    } else if (elapsed > WINDOW_SCHOOL_TO_HOME + ESCALATION_1 && alertStatus === ALERT_STATUS.LEVEL_1) {
      await escalateLevel2(journey, journeyId, CHECKPOINTS.HOME_ARRIVAL);
    } else if (elapsed > WINDOW_SCHOOL_TO_HOME && alertStatus === ALERT_STATUS.NONE) {
      await escalateLevel1(journey, journeyId, CHECKPOINTS.HOME_ARRIVAL);
    }
  }
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

module.exports = {
  checkMissedCheckpoints,
  escalateLevel1,
  escalateLevel2,
  escalateLevel3,
  postSystemMessage,
  getTodayString,
};