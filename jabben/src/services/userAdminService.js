import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseApp,
  firebaseConfigured,
} from '../lib/firebase';

const studioUsersCollection = 'studioUsers';
const ownerEmail = (
  process.env.REACT_APP_STUDIO_OWNER_EMAIL || ''
).trim().toLowerCase();

const configurationError = () => {
  const error = new Error(
    'Firebase Auth and Firestore must be configured before Studio users can be managed.'
  );
  error.code = 'firebase/not-configured';
  return error;
};

const inputError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const timestampToIso = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;

  try {
    return value.toDate().toISOString();
  } catch {
    return null;
  }
};

const normalizeStudioUser = (uid, data = {}) => {
  const enabled = data.enabled === true;
  const admin = enabled && data.admin === true;
  const studio = enabled && (data.studio === true || admin);
  const role = admin ? 'admin' : studio ? 'studio' : 'none';

  return {
    uid,
    email: normalizeEmail(data.email),
    displayName:
      typeof data.displayName === 'string' ? data.displayName.trim() : '',
    role,
    admin,
    studio,
    enabled,
    disabled: data.disabled === true,
    emailVerified: data.emailVerified === true,
    isOwner: data.isOwner === true,
    createdAt: timestampToIso(data.createdAt),
    lastSignInAt: timestampToIso(data.lastSignInAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
};

const requireFirebase = () => {
  if (!firebaseConfigured || !firebaseApp || !auth || !db) {
    throw configurationError();
  }
};

const requireSignedInUser = () => {
  requireFirebase();

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw inputError(
      'auth/unauthenticated',
      'You must be signed in to manage Studio users.'
    );
  }

  return currentUser;
};

const getStudioUserRef = (uid) =>
  doc(db, studioUsersCollection, uid);

export const studioOwnerEmail = ownerEmail;

export const isConfiguredStudioOwner = (email) =>
  Boolean(ownerEmail) && normalizeEmail(email) === ownerEmail;

export async function getStudioUserAccess(uid) {
  requireFirebase();

  const normalizedUid = typeof uid === 'string' ? uid.trim() : '';
  if (!normalizedUid) {
    throw inputError(
      'user-admin/missing-uid',
      'Select a Firebase user to load.'
    );
  }

  const snapshot = await getDoc(getStudioUserRef(normalizedUid));
  return snapshot.exists()
    ? normalizeStudioUser(snapshot.id, snapshot.data())
    : null;
}

export function subscribeToStudioUserAccess(uid, onValue, onError) {
  requireFirebase();

  const normalizedUid = typeof uid === 'string' ? uid.trim() : '';
  if (!normalizedUid) {
    throw inputError(
      'user-admin/missing-uid',
      'Select a Firebase user to watch.'
    );
  }

  return onSnapshot(
    getStudioUserRef(normalizedUid),
    (snapshot) => {
      onValue(
        snapshot.exists()
          ? normalizeStudioUser(snapshot.id, snapshot.data())
          : null
      );
    },
    onError
  );
}

export async function bootstrapStudioOwner() {
  const currentUser = requireSignedInUser();
  const normalizedCurrentEmail = normalizeEmail(currentUser.email);

  if (!ownerEmail) {
    throw inputError(
      'user-admin/owner-not-configured',
      'Add REACT_APP_STUDIO_OWNER_EMAIL before bootstrapping Studio.'
    );
  }

  if (normalizedCurrentEmail !== ownerEmail) {
    throw inputError(
      'user-admin/not-owner',
      'This Firebase account is not the configured Studio owner.'
    );
  }

  const ownerRef = getStudioUserRef(currentUser.uid);

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ownerRef);
    if (existing.exists()) return;

    transaction.set(ownerRef, {
      uid: currentUser.uid,
      email: normalizedCurrentEmail,
      displayName: currentUser.displayName?.trim() || '',
      role: 'admin',
      admin: true,
      studio: true,
      enabled: true,
      disabled: false,
      emailVerified: currentUser.emailVerified === true,
      isOwner: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid,
      updatedBy: currentUser.uid,
    });
  });

  return getStudioUserAccess(currentUser.uid);
}

const createSecondaryAppName = () =>
  `studio-user-provisioning-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

export async function createStudioUser({
  email,
  password,
  displayName,
} = {}) {
  const currentAdmin = requireSignedInUser();
  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName =
    typeof displayName === 'string' ? displayName.trim() : '';

  if (!normalizedEmail) {
    throw inputError(
      'user-admin/missing-email',
      'Enter an email address for the new user.'
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw inputError(
      'user-admin/invalid-password',
      'Use a temporary password with at least 8 characters.'
    );
  }

  const secondaryApp = initializeApp(
    firebaseApp.options,
    createSecondaryAppName()
  );
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser = null;

  try {
    await setPersistence(secondaryAuth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      password
    );
    createdUser = credential.user;

    if (normalizedDisplayName) {
      await updateProfile(createdUser, {
        displayName: normalizedDisplayName,
      });
    }

    const userRecord = {
      uid: createdUser.uid,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      role: 'studio',
      admin: false,
      studio: true,
      enabled: true,
      disabled: false,
      emailVerified: createdUser.emailVerified === true,
      isOwner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentAdmin.uid,
      updatedBy: currentAdmin.uid,
    };

    try {
      await setDoc(getStudioUserRef(createdUser.uid), userRecord);
    } catch (cause) {
      try {
        await deleteUser(createdUser);
        createdUser = null;
      } catch {
        // The original Firestore error is more useful. If rollback also
        // fails, the unapproved Auth account still has no Studio access.
      }

      throw cause;
    }

    return {
      ...normalizeStudioUser(createdUser.uid, userRecord),
      requiresPasswordReset: false,
      invitationSent: false,
    };
  } finally {
    if (secondaryAuth.currentUser) {
      try {
        await signOut(secondaryAuth);
      } catch {
        // App deletion below clears the in-memory secondary session.
      }
    }

    await deleteApp(secondaryApp);
  }
}

export async function listStudioUsers() {
  requireSignedInUser();

  const snapshot = await getDocs(collection(db, studioUsersCollection));
  const users = snapshot.docs
    .map((userSnapshot) =>
      normalizeStudioUser(userSnapshot.id, userSnapshot.data())
    )
    .sort((left, right) => {
      if (left.isOwner !== right.isOwner) return left.isOwner ? -1 : 1;
      if (left.admin !== right.admin) return left.admin ? -1 : 1;

      return (left.displayName || left.email).localeCompare(
        right.displayName || right.email
      );
    });

  return {
    users,
    nextPageToken: null,
  };
}

export async function updateStudioUserAccess({
  uid,
  studio,
  admin,
} = {}) {
  const currentAdmin = requireSignedInUser();
  const normalizedUid = typeof uid === 'string' ? uid.trim() : '';

  if (!normalizedUid) {
    throw inputError(
      'user-admin/missing-uid',
      'Select a Firebase user to update.'
    );
  }

  if (normalizedUid === currentAdmin.uid) {
    throw inputError(
      'user-admin/self-access-change',
      'You cannot change access for your current account.'
    );
  }

  if (typeof studio !== 'boolean' || typeof admin !== 'boolean') {
    throw inputError(
      'user-admin/invalid-access',
      'Studio and administrator access must be true or false.'
    );
  }

  const nextAdmin = admin === true;
  const nextStudio = studio === true || nextAdmin;
  const enabled = nextStudio || nextAdmin;
  const role = nextAdmin ? 'admin' : nextStudio ? 'studio' : 'none';
  const userRef = getStudioUserRef(normalizedUid);

  await updateDoc(userRef, {
    role,
    admin: nextAdmin,
    studio: nextStudio,
    enabled,
    updatedAt: serverTimestamp(),
    updatedBy: currentAdmin.uid,
  });

  const updatedSnapshot = await getDoc(userRef);
  if (!updatedSnapshot.exists()) {
    throw inputError(
      'user-admin/user-not-found',
      'The Studio access record no longer exists.'
    );
  }

  return {
    ...normalizeStudioUser(updatedSnapshot.id, updatedSnapshot.data()),
    requiresReauthentication: false,
  };
}
