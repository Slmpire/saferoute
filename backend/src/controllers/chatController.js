const { getDb } = require('../utils/firebase');
const { CHAT_MESSAGE_TYPES } = require('../utils/constants');

async function getChatMessages(req, res) {
  const { journeyId } = req.params;
  const db = getDb();

  const snap = await db.collection('journeys').doc(journeyId)
    .collection('chat')
    .orderBy('timestamp', 'asc')
    .get();

  return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

async function postMessage(req, res) {
  const { journeyId } = req.params;
  const { text } = req.body;
  const uid = req.user.uid;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const db = getDb();

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });

  const user = userSnap.data();

  const journeySnap = await db.collection('journeys').doc(journeyId).get();
  if (!journeySnap.exists) return res.status(404).json({ error: 'Journey not found' });

  const journey = journeySnap.data();

  const linkedIds = [journey.studentId, journey.parentId, journey.teacherId].filter(Boolean);
  const isAdmin = user.role === 'admin' && user.schoolId === journey.schoolId;
  const isLinked = linkedIds.includes(uid);

  if (!isLinked && !isAdmin) {
    return res.status(403).json({ error: 'Not authorised to post in this journey chat' });
  }

  const message = {
    type: CHAT_MESSAGE_TYPES.USER,
    text: text.trim(),
    authorId: uid,
    authorName: user.name,
    authorRole: user.role,
    timestamp: new Date(),
  };

  const ref = await db.collection('journeys').doc(journeyId).collection('chat').add(message);

  return res.status(201).json({ id: ref.id, ...message });
}

module.exports = { getChatMessages, postMessage };