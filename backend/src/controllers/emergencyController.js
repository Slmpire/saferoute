const { getDb } = require('../utils/firebase');
const {
  sendPush,
  sendSMS,
  makeCall,
  getFCMTokensForUsers,
} = require('../services/notificationService');
const { postSystemMessage } = require('../services/alertService');
const { JOURNEY_STATUS, CHAT_MESSAGE_TYPES } = require('../utils/constants');

async function triggerEmergency(req, res) {
  const { schoolId, journeyId, reason } = req.body;
  const triggeredBy = req.user.uid;
  const triggererRole = req.user.role;

  if (!schoolId) return res.status(400).json({ error: 'schoolId is required' });

  const db = getDb();

  const emergencyRef = await db.collection('emergencies').add({
    schoolId,
    journeyId: journeyId || null,
    triggeredBy,
    triggererRole,
    reason: reason || 'Emergency triggered',
    timestamp: new Date(),
    resolved: false,
  });

  const emergencyId = emergencyRef.id;

  const usersSnap = await db.collection('users')
    .where('schoolId', '==', schoolId)
    .get();

  const tokens = await getFCMTokensForUsers(usersSnap.docs.map(d => d.id));

  await sendPush({
    tokens,
    title: '🚨 EMERGENCY ALERT',
    body: 'Emergency reported at your school. Stay calm and follow safety procedures.',
    data: { emergencyId, schoolId, type: 'EMERGENCY' },
  });

  const schoolSnap = await db.collection('schools').doc(schoolId).get();
  const schoolName = schoolSnap.exists ? schoolSnap.data().name : 'a registered school';
  const schoolAddress = schoolSnap.exists ? schoolSnap.data().address : '';

  const securityPhone = process.env.SECURITY_ORG_PHONE;
  const smsText = `🚨 EMERGENCY at ${schoolName}, ${schoolAddress}. Triggered by ${triggererRole}. Emergency ID: ${emergencyId}. Respond immediately.`;

  if (securityPhone) {
    await sendSMS({ to: [securityPhone], message: smsText });
    await makeCall({ to: [securityPhone] });
  }

  if (journeyId) {
    await db.collection('journeys').doc(journeyId).update({
      status: JOURNEY_STATUS.EMERGENCY,
      emergencyId,
      updatedAt: new Date(),
    });

    await postSystemMessage(
      journeyId,
      `🚨 EMERGENCY TRIGGERED by ${triggererRole}. Security has been contacted. Emergency ID: ${emergencyId}`,
      CHAT_MESSAGE_TYPES.EMERGENCY
    );
  }

  console.log(`[Emergency] ${emergencyId} triggered at school ${schoolId} by ${triggererRole}`);

  return res.status(200).json({ message: 'Emergency alert sent to all parties', emergencyId });
}

async function resolveEmergency(req, res) {
  const { emergencyId } = req.params;
  const { notes } = req.body;
  const resolvedBy = req.user.uid;

  const db = getDb();
  const ref = db.collection('emergencies').doc(emergencyId);
  const snap = await ref.get();

  if (!snap.exists) return res.status(404).json({ error: 'Emergency not found' });

  await ref.update({
    resolved: true,
    resolvedBy,
    resolvedAt: new Date(),
    resolutionNotes: notes || '',
  });

  const emergency = snap.data();
  const usersSnap = await db.collection('users')
    .where('schoolId', '==', emergency.schoolId)
    .get();

  const tokens = await getFCMTokensForUsers(usersSnap.docs.map(d => d.id));

  await sendPush({
    tokens,
    title: '✅ Emergency Resolved',
    body: 'The emergency at your school has been resolved. You are safe.',
    data: { emergencyId, type: 'EMERGENCY_RESOLVED' },
  });

  if (emergency.journeyId) {
    await postSystemMessage(
      emergency.journeyId,
      `✅ Emergency resolved at ${new Date().toLocaleTimeString('en-NG')}. ${notes || ''}`,
      CHAT_MESSAGE_TYPES.SYSTEM
    );
  }

  return res.json({ message: 'Emergency resolved', emergencyId });
}

async function getActiveEmergencies(req, res) {
  const { schoolId } = req.params;
  const db = getDb();

  const snap = await db.collection('emergencies')
    .where('schoolId', '==', schoolId)
    .where('resolved', '==', false)
    .orderBy('timestamp', 'desc')
    .get();

  return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

module.exports = { triggerEmergency, resolveEmergency, getActiveEmergencies };