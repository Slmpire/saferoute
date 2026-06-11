const { getMessaging, getDb } = require('../utils/firebase');
const AfricasTalking = require('africastalking');

let at;

function getAT() {
  if (!at) {
    at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
  }
  return at;
}

async function sendPush({ tokens, title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return;

  const messaging = getMessaging();
  const message = {
    notification: { title, body },
    data: { ...data, timestamp: Date.now().toString() },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`[Push] Sent: ${response.successCount} ok, ${response.failureCount} failed`);
    return response;
  } catch (err) {
    console.error('[Push] Error:', err.message);
  }
}

async function sendSMS({ to, message }) {
  const sms = getAT().SMS;
  const numbers = Array.isArray(to) ? to : [to];

  try {
    const result = await sms.send({
      to: numbers,
      message,
      from: process.env.AT_SENDER_ID || 'SafeRoute',
    });
    console.log('[SMS] Sent:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[SMS] Error:', err.message);
  }
}

async function makeCall({ to }) {
  const voice = getAT().VOICE;
  const numbers = Array.isArray(to) ? to : [to];

  try {
    const result = await voice.call({
      callFrom: process.env.AT_SENDER_ID || 'SafeRoute',
      callTo: numbers,
    });
    console.log('[Call] Initiated:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[Call] Error:', err.message);
  }
}

async function getFCMTokensForUsers(userIds) {
  const db = getDb();
  const tokens = [];

  for (const uid of userIds) {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      const data = snap.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    }
  }

  return tokens;
}

async function getPhonesForUsers(userIds) {
  const db = getDb();
  const phones = [];

  for (const uid of userIds) {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      const data = snap.data();
      if (data.phone) phones.push(data.phone);
    }
  }

  return phones;
}

module.exports = {
  sendPush,
  sendSMS,
  makeCall,
  getFCMTokensForUsers,
  getPhonesForUsers,
};