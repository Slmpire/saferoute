export const COLORS = {
  primary: '#1A56DB',
  primaryLight: '#EBF5FF',
  danger: '#E02424',
  dangerLight: '#FDF2F2',
  success: '#057A55',
  successLight: '#F3FAF7',
  warning: '#C27803',
  warningLight: '#FDFDEA',
  emergency: '#9B1C1C',
  emergencyLight: '#FDE8E8',
  textPrimary: '#111928',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api/v1'  // Replace with your machine's local IP
  : 'https://your-production-url.com/api/v1';

export const CHECKPOINTS = {
  HOME_DEPARTURE: 'HOME_DEPARTURE',
  SCHOOL_ARRIVAL: 'SCHOOL_ARRIVAL',
  SCHOOL_DEPARTURE: 'SCHOOL_DEPARTURE',
  HOME_ARRIVAL: 'HOME_ARRIVAL',
};

export const CHECKPOINT_LABELS = {
  HOME_DEPARTURE: 'Left Home',
  SCHOOL_ARRIVAL: 'Arrived at School',
  SCHOOL_DEPARTURE: 'Left School',
  HOME_ARRIVAL: 'Arrived Home',
};

export const CHECKPOINT_DESCRIPTIONS = {
  HOME_DEPARTURE: 'Parent confirms student has left home for school',
  SCHOOL_ARRIVAL: 'Student checks in at the school gate',
  SCHOOL_DEPARTURE: 'Teacher and student confirm safe dismissal',
  HOME_ARRIVAL: 'Parent confirms student is safely home',
};

export const CHECKPOINT_ICONS = {
  HOME_DEPARTURE: '🏠',
  SCHOOL_ARRIVAL: '🏫',
  SCHOOL_DEPARTURE: '🎒',
  HOME_ARRIVAL: '✅',
};

export const ROLES = {
  PARENT: 'parent',
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  SECURITY: 'security',
};

export const JOURNEY_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ALERT_ACTIVE: 'ALERT_ACTIVE',
  EMERGENCY: 'EMERGENCY',
};

export const ALERT_STATUS = {
  NONE: 'NONE',
  LEVEL_1: 'LEVEL_1',
  LEVEL_2: 'LEVEL_2',
  LEVEL_3: 'LEVEL_3',
};