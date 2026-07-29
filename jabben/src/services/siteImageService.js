import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, firebaseConfigured } from '../lib/firebase';
import { fallbackPhotos } from '../data/portfolio';
import {
  mediaValidationError,
  normalizePosition,
  requireAuthenticatedMediaServices,
  uploadImageFile,
  validateImageFile,
} from './mediaServiceUtils';

const fallbackPhoto = (id) =>
  fallbackPhotos.find((photo) => photo.id === id);
const billieEilish = fallbackPhoto('08');
const coldplay = fallbackPhoto('21');

export const SITE_IMAGE_SLOTS = Object.freeze([
  Object.freeze({
    id: 'homeHero',
    label: 'Home hero',
    description: 'The full-screen image at the top of the home page.',
    fallbackUrl: '/images/julian-bjorgen-hero.png',
    fallbackAlt:
      'An artist standing in warm stage light in front of a concert crowd.',
    fallbackWidth: 1536,
    fallbackHeight: 1024,
    fallbackPosition: '20% 50%',
  }),
  Object.freeze({
    id: 'aboutLeft',
    label: 'About — left',
    description: 'The first concert image in the About page image row.',
    fallbackUrl: billieEilish?.thumbnailUrl || billieEilish?.url || '',
    fallbackAlt: billieEilish?.alt || 'Billie Eilish performing live.',
    fallbackPhotoId: '08',
    fallbackWidth: billieEilish?.width,
    fallbackHeight: billieEilish?.height,
    fallbackPosition: billieEilish?.position || '50% 38%',
  }),
  Object.freeze({
    id: 'aboutPortrait',
    label: 'About — portrait',
    description: 'The portrait in the middle of the About page image row.',
    fallbackUrl:
      'https://static.wixstatic.com/media/29cc10_d487fce3e74d4833be0509abcb11b31e~mv2.png/v1/fit/w_1200,h_1400,q_90/julian-bjorgen.png',
    fallbackAlt: 'Julian Bjørgen in front of the camera.',
    fallbackWidth: 986,
    fallbackHeight: 666,
    fallbackPosition: 'center bottom',
    portrait: true,
  }),
  Object.freeze({
    id: 'aboutRight',
    label: 'About — right',
    description: 'The final concert image in the About page image row.',
    fallbackUrl: coldplay?.thumbnailUrl || coldplay?.url || '',
    fallbackAlt: coldplay?.alt || 'Coldplay performing live.',
    fallbackPhotoId: '21',
    fallbackWidth: coldplay?.width,
    fallbackHeight: coldplay?.height,
    fallbackPosition: coldplay?.position || '50% 50%',
  }),
  Object.freeze({
    id: 'studioLogin',
    label: 'Studio sign-in',
    description: 'The background image shown beside the Studio sign-in form.',
    fallbackUrl: billieEilish?.url || '',
    fallbackAlt: billieEilish?.alt || 'Billie Eilish performing live.',
    fallbackPhotoId: '08',
    fallbackWidth: billieEilish?.width,
    fallbackHeight: billieEilish?.height,
    fallbackPosition: '50% 50%',
  }),
]);

const slotIds = new Set(SITE_IMAGE_SLOTS.map((slot) => slot.id));

const timestampValue = (value) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return value instanceof Date ? value : null;
};

const slotDefinition = (slotId) =>
  SITE_IMAGE_SLOTS.find((slot) => slot.id === slotId);

const validateSlotId = (slotId) => {
  if (!slotIds.has(slotId)) {
    throw mediaValidationError('Choose a valid site image position.');
  }

  return slotId;
};

const normalizeSiteImage = (snapshot) => {
  const data = snapshot.data();
  const slot = snapshot.id;
  const url = data.imageData || data.url || data.imageUrl || '';

  return {
    id: slot,
    ...data,
    slot,
    url,
    imageUrl: data.imageData || data.imageUrl || url,
    thumbnailUrl: data.imageData || data.thumbnailUrl || url,
    position: data.position || '50% 50%',
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
    managed: true,
    isFallback: false,
  };
};

const noop = () => {};

export function subscribeToSiteImages(onImages, onError) {
  if (typeof onImages !== 'function') {
    throw new TypeError('onImages must be a function.');
  }

  if (!firebaseConfigured || !db) {
    onImages({});
    return noop;
  }

  return onSnapshot(
    collection(db, 'siteImages'),
    (snapshot) => {
      const images = {};

      snapshot.docs.forEach((imageDocument) => {
        if (slotIds.has(imageDocument.id)) {
          const image = normalizeSiteImage(imageDocument);
          images[image.slot] = image;
        }
      });

      onImages(images);
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      }
    },
  );
}

const cleanAltText = (value, fallback) => {
  const alt = typeof value === 'string' ? value.trim() : fallback;

  if (typeof alt !== 'string' || !alt.trim() || alt.trim().length > 180) {
    throw mediaValidationError(
      'The alt text must be between 1 and 180 characters.',
    );
  }

  return alt.trim();
};

export async function replaceSiteImage(
  slotId,
  file,
  { alt, position } = {},
  onProgress,
) {
  const slot = validateSlotId(slotId);
  const definition = slotDefinition(slot);
  const { user } = requireAuthenticatedMediaServices();
  validateImageFile(file);

  const documentReference = doc(db, 'siteImages', slot);
  const currentSnapshot = await getDoc(documentReference);
  const current = currentSnapshot.exists() ? currentSnapshot.data() : {};
  const uploadedImage = await uploadImageFile({
    file,
    pathPrefix: `site-images/${slot}`,
    user,
    onProgress,
  });
  const now = serverTimestamp();
  const metadata = {
    ...uploadedImage,
    slot,
    alt: cleanAltText(alt, current.alt || definition.fallbackAlt),
    position: normalizePosition(
      position,
      current.position || definition.fallbackPosition || '50% 50%',
    ),
    uploadedBy: current.uploadedBy || user.uid,
    updatedBy: user.uid,
    updatedAt: now,
    createdAt: currentSnapshot.exists() ? current.createdAt : now,
  };

  // Deliberately overwrite instead of merging. This removes legacy image
  // aliases and keeps only one copy of the data URL in Firestore so the
  // document remains safely below its 1 MiB size limit.
  await setDoc(documentReference, metadata);

  if (typeof onProgress === 'function') {
    onProgress(100);
  }

  return {
    id: slot,
    ...current,
    ...metadata,
    url: uploadedImage.imageData,
    imageUrl: uploadedImage.imageData,
    thumbnailUrl: uploadedImage.imageData,
    createdAt: timestampValue(current.createdAt) || new Date(),
    updatedAt: new Date(),
    managed: true,
    isFallback: false,
  };
}
