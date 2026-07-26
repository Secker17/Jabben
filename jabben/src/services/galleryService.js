import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { auth, db, firebaseConfigured, storage } from '../lib/firebase';

export const PHOTO_CATEGORIES = [
  'Portrait',
  'Wedding',
  'Concert',
  'Commercial',
  'Travel',
  'Other',
];

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const configurationError = () => {
  const error = new Error(
    'Firebase is not configured. The image was not uploaded.'
  );
  error.code = 'firebase/not-configured';
  return error;
};

const validationError = (message) => {
  const error = new Error(message);
  error.code = 'upload/invalid-input';
  return error;
};

const timestampValue = (value) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return value instanceof Date ? value : null;
};

const normalizePhoto = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    ...data,
    // Older portfolio components sometimes use imageUrl, while the canonical
    // Firestore field is url. Keeping both here makes the subscription stable.
    url: data.url || data.imageUrl || '',
    imageUrl: data.imageUrl || data.url || '',
    createdAt: timestampValue(data.createdAt),
  };
};

const sortNewestFirst = (photos) =>
  photos.sort((left, right) => {
    const leftTime = left.createdAt?.getTime?.() || 0;
    const rightTime = right.createdAt?.getTime?.() || 0;
    return rightTime - leftTime;
  });

export function subscribeToPublishedPhotos(onPhotos, onError) {
  if (typeof onPhotos !== 'function') {
    throw new TypeError('onPhotos must be a function.');
  }

  if (!firebaseConfigured || !db) {
    onPhotos([]);
    return () => {};
  }

  const publishedPhotos = query(
    collection(db, 'photos'),
    where('published', '==', true)
  );

  return onSnapshot(
    publishedPhotos,
    (snapshot) => {
      const photos = sortNewestFirst(snapshot.docs.map(normalizePhoto));
      onPhotos(photos);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
    }
  );
}

const safeFileName = (fileName) => {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'image';
};

const validateUpload = ({ file, title, alt, category, year }) => {
  if (!file || typeof file !== 'object') {
    throw validationError('Choose an image before uploading.');
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw validationError('Use JPG, PNG, WebP, or AVIF.');
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw validationError('The image file is empty or cannot be read.');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw validationError('The image must be no larger than 15 MB.');
  }

  const normalizedTitle = title?.trim();
  const normalizedAlt = alt?.trim();
  const normalizedCategory = category?.trim();
  const numericYear = Number(year);
  const maxYear = new Date().getFullYear() + 1;

  if (!normalizedTitle || normalizedTitle.length > 100) {
    throw validationError('The title must be between 1 and 100 characters.');
  }

  if (!normalizedAlt || normalizedAlt.length > 180) {
    throw validationError('The alt text must be between 1 and 180 characters.');
  }

  if (!normalizedCategory || normalizedCategory.length > 50) {
    throw validationError('Choose a valid category.');
  }

  if (
    !Number.isInteger(numericYear) ||
    numericYear < 1900 ||
    numericYear > maxYear
  ) {
    throw validationError(`The year must be between 1900 and ${maxYear}.`);
  }

  return {
    title: normalizedTitle,
    alt: normalizedAlt,
    category: normalizedCategory,
    year: numericYear,
  };
};

export async function uploadPhoto(
  { file, title, alt, category, year, featured = false, published = true },
  onProgress
) {
  if (!firebaseConfigured || !auth || !db || !storage) {
    throw configurationError();
  }

  const user = auth.currentUser;

  if (!user) {
    const error = new Error('You must be signed in to upload images.');
    error.code = 'auth/unauthenticated';
    throw error;
  }

  const clean = validateUpload({ file, title, alt, category, year });
  const uniquePart =
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `photos/${user.uid}/${uniquePart}-${safeFileName(
    file.name
  )}`;
  const storageReference = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageReference, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000,immutable',
    customMetadata: {
      uploadedBy: user.uid,
    },
  });

  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0
            ? Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )
            : 0;

        if (typeof onProgress === 'function') {
          onProgress(progress);
        }
      },
      reject,
      resolve
    );
  });

  const url = await getDownloadURL(uploadTask.snapshot.ref);

  try {
    const metadata = {
      ...clean,
      featured: Boolean(featured),
      published: Boolean(published),
      url,
      imageUrl: url,
      storagePath,
      fileName: file.name.slice(0, 180),
      contentType: file.type,
      size: file.size,
      uploadedBy: user.uid,
      createdAt: serverTimestamp(),
    };
    const documentReference = await addDoc(collection(db, 'photos'), metadata);

    if (typeof onProgress === 'function') {
      onProgress(100);
    }

    return {
      id: documentReference.id,
      ...metadata,
      createdAt: new Date(),
    };
  } catch (error) {
    // Avoid leaving an orphaned Storage object if Firestore rejects metadata.
    try {
      await deleteObject(uploadTask.snapshot.ref);
    } catch {
      // The original Firestore error is the useful one for the caller.
    }
    throw error;
  }
}
