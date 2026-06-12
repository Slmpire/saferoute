import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDJBMgPXjlO5KKMRQorQOTTUn27Xo74Bms",
  authDomain: "saferoute-dded8.firebaseapp.com",
  projectId: "saferoute-dded8",
  storageBucket: "saferoute-dded8.firebasestorage.app",
  messagingSenderId: "781234960568",
  appId: "1:781234960568:web:84b30dc3df021bcfc91c4d",
};

let app;
let auth;
let db;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };