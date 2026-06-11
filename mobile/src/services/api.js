import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Firebase ID token on every request automatically
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── User ──────────────────────────────────────────────────────────────────────
export const registerUser = (data) => api.post('/users/register', data);
export const updateFCMToken = (fcmToken) => api.put('/users/fcm-token', { fcmToken });
export const getProfile = () => api.get('/users/me');
export const getChildren = () => api.get('/users/children');
export const getSchoolStudents = (schoolId) => api.get(`/users/school/${schoolId}/students`);

// ── Journey ───────────────────────────────────────────────────────────────────
export const startJourney = (studentId) => api.post('/journeys/start', { studentId });
export const getStudentJourney = (studentId) => api.get(`/journeys/student/${studentId}`);
export const getSchoolJourneys = (schoolId) => api.get(`/journeys/school/${schoolId}`);
export const confirmCheckpoint = (journeyId, checkpoint) =>
  api.post(`/journeys/${journeyId}/checkpoint`, { checkpoint, biometricVerified: true });

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getChatMessages = (journeyId) => api.get(`/journeys/${journeyId}/chat`);
export const sendChatMessage = (journeyId, text) =>
  api.post(`/journeys/${journeyId}/chat`, { text });

// ── Emergency ─────────────────────────────────────────────────────────────────
export const triggerEmergency = (schoolId, journeyId, reason) =>
  api.post('/emergency/trigger', { schoolId, journeyId, reason });
export const resolveEmergency = (emergencyId, notes) =>
  api.post(`/emergency/${emergencyId}/resolve`, { notes });
export const getActiveEmergencies = (schoolId) =>
  api.get(`/emergency/school/${schoolId}/active`);

export default api;