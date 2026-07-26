import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth, firebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

const configurationError = () => {
  const error = new Error(
    'Firebase is not configured. Add the environment variables and restart the app.'
  );
  error.code = 'firebase/not-configured';
  return error;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    let resolved = false;
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        setLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        resolved = true;
        window.clearTimeout(timeoutId);
        setUser(nextUser);
        setLoading(false);
      },
      () => {
        resolved = true;
        window.clearTimeout(timeoutId);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    if (!auth) {
      throw configurationError();
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      const error = new Error('Enter both your email address and password.');
      error.code = 'auth/missing-credentials';
      throw error;
    }

    return signInWithEmailAndPassword(auth, normalizedEmail, password);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) {
      throw configurationError();
    }

    return signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!auth) {
      throw configurationError();
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      const error = new Error('Enter your email address first.');
      error.code = 'auth/missing-email';
      throw error;
    }

    return sendPasswordResetEmail(auth, normalizedEmail);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      login,
      logout,
      resetPassword,
    }),
    [user, loading, login, logout, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
