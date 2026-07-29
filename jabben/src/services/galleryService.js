import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';
import {
  MAX_IMAGE_SIZE,
  mediaValidationError,
  normalizePosition,
  requireAuthenticatedMediaServices,
  uploadImageFile,
  validateImageFile,
} from './mediaServiceUtils';

export { MAX_IMAGE_SIZE };

export const PHOTO_CATEGORIES = [
  'Portrait',
  'Wedding',
  'Concert',
  'Commercial',
  'Travel',
  'Other',
];

const timestampValue = (value) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return value instanceof Date ? value : null;
};

const normalizedText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const managementError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeLegacyId = (value) => {
  if (value == null || value === '') {
    return '';
  }

  const legacyId = String(value).trim();

  if (
    !legacyId ||
    legacyId.length > 80 ||
    !/^[a-zA-Z0-9._-]+$/.test(legacyId)
  ) {
    throw mediaValidationError('Choose a valid legacy image identifier.');
  }

  return legacyId;
};

const normalizePhoto = (snapshot) => {
  const data = snapshot.data();
  const title = normalizedText(data.title);
  const artist = normalizedText(data.artist) || title;
  const url =
    data.imageData ||
    data.dataUrl ||
    data.src ||
    data.url ||
    data.imageUrl ||
    '';

  return {
    id: snapshot.id,
    ...data,
    title,
    artist,
    // Keep the aliases while older components and documents use both names.
    url,
    imageUrl: data.imageData ? url : data.imageUrl || url,
    thumbnailUrl: data.imageData ? url : data.thumbnailUrl || url,
    position: data.position || '50% 50%',
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
    managed: true,
  };
};

const sortNewestFirst = (photos) =>
  photos.sort((left, right) => {
    const leftTime = left.createdAt?.getTime?.() || 0;
    const rightTime = right.createdAt?.getTime?.() || 0;
    return rightTime - leftTime;
  });

const noop = () => {};

const reportSubscriptionError = (onError, error) => {
  if (typeof onError === 'function') {
    onError(error);
  }
};

export function subscribeToPublishedPhotos(onPhotos, onError) {
  if (typeof onPhotos !== 'function') {
    throw new TypeError('onPhotos must be a function.');
  }

  if (!firebaseConfigured || !db) {
    onPhotos([]);
    return noop;
  }

  const publishedPhotos = query(
    collection(db, 'photos'),
    where('published', '==', true),
  );

  return onSnapshot(
    publishedPhotos,
    (snapshot) => {
      const photos = sortNewestFirst(snapshot.docs.map(normalizePhoto));
      onPhotos(photos);
    },
    (error) => reportSubscriptionError(onError, error),
  );
}

export function subscribeToManagedPhotos(onPhotos, onError) {
  if (typeof onPhotos !== 'function') {
    throw new TypeError('onPhotos must be a function.');
  }

  if (!firebaseConfigured || !db) {
    onPhotos([]);
    return noop;
  }

  if (!auth?.currentUser) {
    reportSubscriptionError(
      onError,
      managementError(
        'auth/unauthenticated',
        'You must be signed in to manage images.',
      ),
    );
    return noop;
  }

  return onSnapshot(
    query(collection(db, 'photos')),
    (snapshot) => {
      const photos = sortNewestFirst(snapshot.docs.map(normalizePhoto));
      onPhotos(photos);
    },
    (error) => reportSubscriptionError(onError, error),
  );
}

const validatePhotoMetadata = ({
  title,
  alt,
  artist,
  category,
  year,
  position,
}) => {
  const normalizedTitle = normalizedText(title);
  const normalizedAlt = normalizedText(alt);
  const normalizedArtist = normalizedText(artist) || normalizedTitle;
  const normalizedCategory = normalizedText(category);
  const numericYear = Number(year);
  const maxYear = new Date().getFullYear() + 1;

  if (!normalizedTitle || normalizedTitle.length > 100) {
    throw mediaValidationError(
      'The title must be between 1 and 100 characters.',
    );
  }

  if (!normalizedArtist || normalizedArtist.length > 100) {
    throw mediaValidationError(
      'The artist must be between 1 and 100 characters.',
    );
  }

  if (!normalizedAlt || normalizedAlt.length > 180) {
    throw mediaValidationError(
      'The alt text must be between 1 and 180 characters.',
    );
  }

  if (!normalizedCategory || normalizedCategory.length > 50) {
    throw mediaValidationError('Choose a valid category.');
  }

  if (
    !Number.isInteger(numericYear) ||
    numericYear < 1900 ||
    numericYear > maxYear
  ) {
    throw mediaValidationError(
      `The year must be between 1900 and ${maxYear}.`,
    );
  }

  return {
    title: normalizedTitle,
    alt: normalizedAlt,
    artist: normalizedArtist,
    category: normalizedCategory,
    year: numericYear,
    position: normalizePosition(position),
  };
};

const imageAliases = (imageData) => ({
  url: imageData || '',
  imageUrl: imageData || '',
  thumbnailUrl: imageData || '',
});

export async function uploadPhoto(
  {
    file,
    title,
    alt,
    artist,
    category,
    year,
    position = '50% 50%',
    featured = false,
    published = true,
    legacyId,
  },
  onProgress,
) {
  const { user } = requireAuthenticatedMediaServices();
  validateImageFile(file);

  const clean = validatePhotoMetadata({
    title,
    alt,
    artist,
    category,
    year,
    position,
  });
  const cleanLegacyId = normalizeLegacyId(legacyId);
  const uploadedImage = await uploadImageFile({
    file,
    pathPrefix: 'photos',
    user,
    onProgress,
  });

  const metadata = {
    ...clean,
    ...uploadedImage,
    featured: Boolean(featured),
    published: Boolean(published),
    uploadedBy: user.uid,
    updatedBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(cleanLegacyId ? { legacyId: cleanLegacyId } : {}),
  };
  const documentReference = await addDoc(collection(db, 'photos'), metadata);

  if (typeof onProgress === 'function') {
    onProgress(100);
  }

  const now = new Date();
  return {
    id: documentReference.id,
    ...metadata,
    ...imageAliases(metadata.imageData),
    createdAt: now,
    updatedAt: now,
    managed: true,
  };
}

const mutablePhotoFields = new Set([
  'title',
  'alt',
  'artist',
  'category',
  'year',
  'position',
  'featured',
  'published',
  'sortOrder',
  'legacyId',
]);

const validatePartialText = (value, maximum, label) => {
  const normalized = normalizedText(value);

  if (!normalized || normalized.length > maximum) {
    throw mediaValidationError(
      `${label} must be between 1 and ${maximum} characters.`,
    );
  }

  return normalized;
};

const sanitizePhotoChanges = (fields) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw mediaValidationError('Choose valid photo fields to update.');
  }

  const unknownField = Object.keys(fields).find(
    (field) => !mutablePhotoFields.has(field),
  );

  if (unknownField) {
    throw mediaValidationError(`The photo field "${unknownField}" cannot be edited.`);
  }

  const clean = {};

  if ('title' in fields) {
    clean.title = validatePartialText(fields.title, 100, 'The title');
  }

  if ('alt' in fields) {
    clean.alt = validatePartialText(fields.alt, 180, 'The alt text');
  }

  if ('artist' in fields) {
    clean.artist =
      fields.artist == null || normalizedText(fields.artist) === ''
        ? deleteField()
        : validatePartialText(fields.artist, 100, 'The artist');
  }

  if ('category' in fields) {
    clean.category = validatePartialText(
      fields.category,
      50,
      'The category',
    );
  }

  if ('year' in fields) {
    const numericYear = Number(fields.year);
    const maxYear = new Date().getFullYear() + 1;

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 1900 ||
      numericYear > maxYear
    ) {
      throw mediaValidationError(
        `The year must be between 1900 and ${maxYear}.`,
      );
    }
    clean.year = numericYear;
  }

  if ('position' in fields) {
    clean.position = normalizePosition(fields.position);
  }

  for (const field of ['featured', 'published']) {
    if (field in fields) {
      if (typeof fields[field] !== 'boolean') {
        throw mediaValidationError(`${field} must be true or false.`);
      }
      clean[field] = fields[field];
    }
  }

  if ('sortOrder' in fields) {
    const sortOrder = Number(fields.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      throw mediaValidationError('Choose a valid photo order.');
    }
    clean.sortOrder = sortOrder;
  }

  if ('legacyId' in fields) {
    const legacyId = normalizeLegacyId(fields.legacyId);
    clean.legacyId = legacyId || deleteField();
  }

  if (Object.keys(clean).length === 0) {
    throw mediaValidationError('Choose at least one photo field to update.');
  }

  return clean;
};

const validatePhotoId = (photoId) => {
  if (
    typeof photoId !== 'string' ||
    !photoId.trim() ||
    photoId.includes('/')
  ) {
    throw mediaValidationError('Choose a valid managed photo.');
  }

  return photoId.trim();
};

const validateManagedPhoto = (photo) => {
  if (!photo || typeof photo !== 'object' || photo.managed === false) {
    throw managementError(
      'gallery/legacy-photo',
      'Import this legacy image before editing or deleting it.',
    );
  }

  return validatePhotoId(photo.id);
};

export async function updatePhoto(photoId, fields) {
  const { user } = requireAuthenticatedMediaServices();
  const id = validatePhotoId(photoId);
  const changes = sanitizePhotoChanges(fields);

  await updateDoc(doc(db, 'photos', id), {
    ...changes,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  return {
    id,
    ...changes,
    updatedAt: new Date(),
    updatedBy: user.uid,
  };
}

export async function replacePhoto(photo, file, onProgress) {
  const { user } = requireAuthenticatedMediaServices();
  const id = validateManagedPhoto(photo);
  validateImageFile(file);

  const uploadedImage = await uploadImageFile({
    file,
    pathPrefix: 'photos',
    user,
    onProgress,
  });
  const imageMetadata = uploadedImage;

  await updateDoc(doc(db, 'photos', id), {
    ...imageMetadata,
    // Remove aliases left by the former Storage backend. Keeping the encoded
    // image in one field is essential to stay below Firestore's document cap.
    url: deleteField(),
    imageUrl: deleteField(),
    thumbnailUrl: deleteField(),
    storagePath: deleteField(),
    dataUrl: deleteField(),
    src: deleteField(),
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  });

  if (typeof onProgress === 'function') {
    onProgress(100);
  }

  return {
    ...photo,
    ...imageMetadata,
    ...imageAliases(imageMetadata.imageData),
    id,
    updatedAt: new Date(),
    updatedBy: user.uid,
    managed: true,
  };
}

export async function deletePhoto(photo) {
  requireAuthenticatedMediaServices();
  const id = validateManagedPhoto(photo);

  await deleteDoc(doc(db, 'photos', id));

  return { id, deleted: true };
}
