import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim(),
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.REACT_APP_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID?.trim(),
};

const requiredConfig = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId',
];

const hasCompleteConfig = requiredConfig.every(
  (key) => typeof firebaseConfig[key] === 'string' && firebaseConfig[key]
);

const createFirebaseServices = () => {
  if (!hasCompleteConfig) {
    return {
      app: null,
      auth: null,
      db: null,
      configured: false,
    };
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      configured: true,
    };
  } catch (error) {
    // A partial or malformed local configuration should never take down the
    // public portfolio. The studio will render its setup state instead.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Firebase could not be initialized.', error);
    }

    return {
      app: null,
      auth: null,
      db: null,
      configured: false,
    };
  }
};

const services = createFirebaseServices();

export const firebaseConfigured = services.configured;
export const firebaseApp = services.app;
export const auth = services.auth;
export const db = services.db;

