import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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
import {
  bootstrapStudioOwner as bootstrapOwner,
  createStudioUser as provisionStudioUser,
  getStudioUserAccess,
  isConfiguredStudioOwner,
  listStudioUsers as listProvisionedStudioUsers,
  subscribeToStudioUserAccess,
  updateStudioUserAccess as updateProvisionedStudioUserAccess,
} from '../services/userAdminService';

const AuthContext = createContext(null);
const emptyClaims = Object.freeze({
  role: 'none',
  admin: false,
  studio: false,
  enabled: false,
});

const configurationError = () => {
  const error = new Error(
    'Firebase is not configured. Add the environment variables and restart the app.'
  );
  error.code = 'firebase/not-configured';
  return error;
};

const accessError = (message) => {
  const error = new Error(message);
  error.code = 'auth/unauthenticated';
  return error;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(emptyClaims);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let resolved = false;
    let sequence = 0;
    let unsubscribeFromAccess = null;
    const timeoutId = window.setTimeout(() => {
      if (!resolved && active) {
        setLoading(false);
      }
    }, 5000);

    const stopAccessSubscription = () => {
      if (unsubscribeFromAccess) {
        unsubscribeFromAccess();
        unsubscribeFromAccess = null;
      }
    };

    const unsubscribeFromAuth = onAuthStateChanged(
      auth,
      async (nextUser) => {
        const currentSequence = ++sequence;
        stopAccessSubscription();

        if (!nextUser) {
          resolved = true;
          window.clearTimeout(timeoutId);

          if (active && currentSequence === sequence) {
            setUser(null);
            setClaims(emptyClaims);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setUser(nextUser);
          setLoading(true);
        }

        try {
          let studioAccess = await getStudioUserAccess(nextUser.uid);

          if (
            !studioAccess &&
            isConfiguredStudioOwner(nextUser.email)
          ) {
            studioAccess = await bootstrapOwner();
          }

          resolved = true;
          window.clearTimeout(timeoutId);

          if (!active || currentSequence !== sequence) return;

          setClaims(studioAccess || emptyClaims);
          setLoading(false);

          unsubscribeFromAccess = subscribeToStudioUserAccess(
            nextUser.uid,
            (nextAccess) => {
              if (active && currentSequence === sequence) {
                setClaims(nextAccess || emptyClaims);
              }
            },
            (error) => {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('Studio access could not be refreshed.', error);
              }

              if (active && currentSequence === sequence) {
                setClaims(emptyClaims);
              }
            }
          );
        } catch (error) {
          resolved = true;
          window.clearTimeout(timeoutId);

          if (process.env.NODE_ENV !== 'production') {
            console.warn('Studio access could not be loaded.', error);
          }

          if (active && currentSequence === sequence) {
            setClaims(emptyClaims);
            setLoading(false);
          }
        }
      },
      () => {
        resolved = true;
        window.clearTimeout(timeoutId);
        stopAccessSubscription();

        if (active) {
          setUser(null);
          setClaims(emptyClaims);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      stopAccessSubscription();
      unsubscribeFromAuth();
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

  const refreshClaims = useCallback(async () => {
    const currentUser = auth?.currentUser;

    if (!currentUser) {
      throw accessError('You must be signed in to refresh access.');
    }

    let studioAccess = await getStudioUserAccess(currentUser.uid);

    if (
      !studioAccess &&
      isConfiguredStudioOwner(currentUser.email)
    ) {
      studioAccess = await bootstrapOwner();
    }

    setClaims(studioAccess || emptyClaims);
    return studioAccess || emptyClaims;
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword } = {}) => {
      const currentUser = auth?.currentUser;

      if (!currentUser?.email) {
        throw accessError(
          'You must be signed in with an email account to change your password.'
        );
      }

      if (!currentPassword || !newPassword) {
        const error = new Error(
          'Enter both your current password and a new password.'
        );
        error.code = 'auth/missing-password';
        throw error;
      }

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      await refreshClaims();
    },
    [refreshClaims]
  );

  const createStudioUser = useCallback(
    async ({ email, password, displayName } = {}) =>
      provisionStudioUser({ email, password, displayName }),
    []
  );

  const listStudioUsers = useCallback(
    async (options = {}) => listProvisionedStudioUsers(options),
    []
  );

  const updateStudioUserAccess = useCallback(
    async (access = {}) => updateProvisionedStudioUserAccess(access),
    []
  );

  const isAdmin = claims.enabled === true && claims.admin === true;
  const isStudio =
    claims.enabled === true &&
    (claims.studio === true || isAdmin);

  const value = useMemo(
    () => ({
      user,
      claims,
      loading,
      configured: firebaseConfigured,
      isAdmin,
      isStudio,
      login,
      logout,
      resetPassword,
      refreshClaims,
      changePassword,
      createStudioUser,
      listStudioUsers,
      updateStudioUserAccess,
    }),
    [
      user,
      claims,
      loading,
      isAdmin,
      isStudio,
      login,
      logout,
      resetPassword,
      refreshClaims,
      changePassword,
      createStudioUser,
      listStudioUsers,
      updateStudioUserAccess,
    ]
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
