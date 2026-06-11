const { getDb, getAuth } = require('../utils/firebase');
const { ROLES } = require('../utils/constants');

async function registerUser(req, res) {
  const { name, phone, role, schoolId, parentId, teacherId } = req.body;
  const uid = req.user.uid;
  const db = getDb();

  const allowedRoles = Object.values(ROLES);
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
  }

  const userData = {
    uid,
    name,
    phone: phone || null,
    role,
    schoolId: schoolId || null,
    parentId: role === 'student' ? parentId : null,
    teacherId: role === 'student' ? teacherId : null,
    fcmToken: null,
    enrolledAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('users').doc(uid).set(userData);
  await getAuth().setCustomUserClaims(uid, { role });

  return res.status(201).json({ message: 'User registered', uid, role });
}

async function updateFCMToken(req, res) {
  const { fcmToken } = req.body;
  const uid = req.user.uid;
  const db = getDb();

  if (!fcmToken) return res.status(400).json({ error: 'fcmToken is required' });

  await db.collection('users').doc(uid).update({ fcmToken, updatedAt: new Date() });

  return res.json({ message: 'FCM token updated' });
}

async function getProfile(req, res) {
  const uid = req.user.uid;
  const db = getDb();

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return res.status(404).json({ error: 'User not found' });

  return res.json(snap.data());
}

async function getStudentsForSchool(req, res) {
  const { schoolId } = req.params;
  const db = getDb();

  const snap = await db.collection('users')
    .where('schoolId', '==', schoolId)
    .where('role', '==', 'student')
    .get();

  return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

async function getChildrenForParent(req, res) {
  const uid = req.user.uid;
  const db = getDb();

  const snap = await db.collection('users')
    .where('parentId', '==', uid)
    .where('role', '==', 'student')
    .get();

  return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

module.exports = {
  registerUser,
  updateFCMToken,
  getProfile,
  getStudentsForSchool,
  getChildrenForParent,
};