import { auth, db, firebaseConfigured } from '../lib/firebase';

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
export const MAX_STORED_IMAGE_SIZE = 650 * 1024;
export const MAX_IMAGE_DATA_LENGTH = 900000;
export const MAX_IMAGE_DIMENSION = 2400;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const mediaConfigurationError = () => {
  const error = new Error(
    'Firebase is not configured. The image could not be saved in Firestore.',
  );
  error.code = 'firebase/not-configured';
  return error;
};

export const mediaValidationError = (message) => {
  const error = new Error(message);
  error.code = 'upload/invalid-input';
  return error;
};

export function requireAuthenticatedMediaServices() {
  if (!firebaseConfigured || !auth || !db) {
    throw mediaConfigurationError();
  }

  const user = auth.currentUser;

  if (!user) {
    const error = new Error('You must be signed in to manage images.');
    error.code = 'auth/unauthenticated';
    throw error;
  }

  return { db, user };
}

export function validateImageFile(file) {
  if (!file || typeof file !== 'object') {
    throw mediaValidationError('Choose an image before uploading.');
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw mediaValidationError('Use JPG, PNG, WebP, or AVIF.');
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw mediaValidationError('The image file is empty or cannot be read.');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw mediaValidationError('The image must be no larger than 15 MB.');
  }

  return file;
}

export function normalizePosition(value, fallback = '50% 50%') {
  if (value == null || value === '') {
    return fallback;
  }

  const position = String(value).trim();

  if (
    !position ||
    position.length > 40 ||
    /[;{}<>]/.test(position)
  ) {
    throw mediaValidationError('Choose a valid image focus position.');
  }

  return position;
}

const safeFileName = (fileName) => {
  const normalized = String(fileName || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'image';
};

const uniquePart = () =>
  (typeof window !== 'undefined' && window.crypto?.randomUUID?.()) ||
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const compressionError = (message, cause) => {
  const error = new Error(message);
  error.code = 'upload/compression-failed';
  if (cause) {
    error.cause = cause;
  }
  return error;
};

const reportProgress = (onProgress, value) => {
  if (typeof onProgress === 'function') {
    onProgress(Math.max(0, Math.min(100, Math.round(value))));
  }
};

const loadWithImageBitmap = async (file) => {
  if (
    typeof window === 'undefined' ||
    typeof window.createImageBitmap !== 'function'
  ) {
    return null;
  }

  try {
    let bitmap;

    try {
      bitmap = await window.createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
    } catch {
      bitmap = await window.createImageBitmap(file);
    }

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  } catch {
    return null;
  }
};

const loadWithImageElement = async (file) => {
  if (
    typeof window === 'undefined' ||
    typeof window.Image !== 'function' ||
    !window.URL?.createObjectURL
  ) {
    return null;
  }

  const objectUrl = window.URL.createObjectURL(file);
  const image = new window.Image();

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(compressionError('The selected image could not be decoded.'));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      close: () => window.URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    window.URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

const loadImageSource = async (file) => {
  const bitmap = await loadWithImageBitmap(file);
  if (bitmap) {
    return bitmap;
  }

  const image = await loadWithImageElement(file);
  if (image) {
    return image;
  }

  throw compressionError(
    'This browser cannot prepare images for Firestore. Try a current version of Chrome, Edge, Firefox, or Safari.',
  );
};

const createCanvas = (width, height) => {
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function'
  ) {
    throw compressionError(
      'This browser cannot prepare images for Firestore.',
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    throw compressionError(
      'The browser could not start its image compressor.',
    );
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  return { canvas, context };
};

const renderToCanvas = ({
  canvas,
  context,
  source,
  width,
  height,
  contentType,
}) => {
  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);

  // JPEG has no alpha channel. A white background avoids transparent pixels
  // becoming black when WebP encoding is unavailable.
  if (contentType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
};

const encodeCanvas = (canvas, contentType, quality) =>
  new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(
        compressionError('The browser cannot encode the selected image.'),
      );
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            compressionError('The browser could not encode the selected image.'),
          );
          return;
        }
        resolve(blob);
      },
      contentType,
      quality,
    );
  });

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    if (typeof FileReader !== 'function') {
      reject(
        compressionError('The browser cannot read the compressed image.'),
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(
          compressionError('The browser returned an invalid image result.'),
        );
      }
    };
    reader.onerror = () =>
      reject(
        compressionError(
          'The compressed image could not be read.',
          reader.error,
        ),
      );
    reader.readAsDataURL(blob);
  });

const compressionQualities = [0.86, 0.76, 0.66, 0.56, 0.46, 0.36, 0.28];
const outputContentTypes = ['image/webp', 'image/jpeg'];

export async function compressImageForFirestore(file, onProgress) {
  validateImageFile(file);
  reportProgress(onProgress, 3);

  const loaded = await loadImageSource(file);

  try {
    const originalWidth = Number(loaded.width);
    const originalHeight = Number(loaded.height);

    if (
      !Number.isFinite(originalWidth) ||
      !Number.isFinite(originalHeight) ||
      originalWidth <= 0 ||
      originalHeight <= 0
    ) {
      throw compressionError('The selected image has invalid dimensions.');
    }

    reportProgress(onProgress, 14);

    const initialScale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight),
    );
    let width = Math.max(1, Math.round(originalWidth * initialScale));
    let height = Math.max(1, Math.round(originalHeight * initialScale));
    const { canvas, context } = createCanvas(width, height);
    let smallestBlob = null;
    let attempts = 0;
    const maximumAttempts =
      outputContentTypes.length * compressionQualities.length * 8;

    for (let resizeAttempt = 0; resizeAttempt < 8; resizeAttempt += 1) {
      for (const contentType of outputContentTypes) {
        renderToCanvas({
          canvas,
          context,
          source: loaded.source,
          width,
          height,
          contentType,
        });

        for (const quality of compressionQualities) {
          attempts += 1;
          reportProgress(
            onProgress,
            15 + (attempts / maximumAttempts) * 70,
          );

          const blob = await encodeCanvas(canvas, contentType, quality);

          // Browsers that do not support WebP may silently return PNG.
          if (blob.type !== contentType) {
            break;
          }

          if (!smallestBlob || blob.size < smallestBlob.size) {
            smallestBlob = blob;
          }

          if (blob.size <= MAX_STORED_IMAGE_SIZE) {
            const imageData = await blobToDataUrl(blob);

            if (imageData.length <= MAX_IMAGE_DATA_LENGTH) {
              reportProgress(onProgress, 96);
              return {
                imageData,
                width,
                height,
                contentType: blob.type,
                size: blob.size,
                originalSize: file.size,
              };
            }
          }
        }
      }

      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }

    throw compressionError(
      smallestBlob
        ? 'The image could not be compressed enough for Firestore. Try exporting it at a smaller size.'
        : 'The browser could not encode the selected image as WebP or JPEG.',
    );
  } catch (error) {
    if (error?.code === 'upload/compression-failed') {
      throw error;
    }

    throw compressionError(
      'The image could not be prepared for Firestore.',
      error,
    );
  } finally {
    loaded.close?.();
  }
}

export async function readImageDimensions(file) {
  validateImageFile(file);
  const loaded = await loadImageSource(file);

  try {
    return {
      width: loaded.width,
      height: loaded.height,
    };
  } finally {
    loaded.close?.();
  }
}

export async function uploadImageFile({
  file,
  pathPrefix,
  user,
  onProgress,
}) {
  validateImageFile(file);

  // Preserve the existing caller contract while keeping the binary entirely
  // in Firestore. The prefix and uid still help produce a traceable filename,
  // without creating a second copy of the base64 payload in the document.
  const compressed = await compressImageForFirestore(file, onProgress);
  const namePrefix = [pathPrefix, user?.uid, uniquePart()]
    .filter(Boolean)
    .join('-');
  const fileName = `${namePrefix ? `${safeFileName(namePrefix)}-` : ''}${safeFileName(
    file.name,
  )}`.slice(0, 180);

  reportProgress(onProgress, 100);

  return {
    ...compressed,
    fileName,
  };
}

// Kept as a compatibility no-op while callers migrate away from the old
// Firebase Storage path. Firestore document deletion now removes the image.
export async function deleteStoredImage() {
  return undefined;
}
