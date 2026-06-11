const admin = require('firebase-admin');

let db;
let messaging;

function initFirebase() {
  if (admin.apps.length > 0) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  db = admin.firestore();
  messaging = admin.messaging();

  console.log('[Firebase] Initialized successfully');
}

function getDb() {
  if (!db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return db;
}

function getMessaging() {
  if (!messaging) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return messaging;
}

function getAuth() {
  return admin.auth();
}

module.exports = { initFirebase, getDb, getMessaging, getAuth };