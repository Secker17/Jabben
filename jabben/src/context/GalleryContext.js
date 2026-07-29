import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fallbackPhotos } from '../data/portfolio';
import { firebaseConfigured } from '../lib/firebase';
import { subscribeToPublishedPhotos } from '../services/galleryService';
import {
  SITE_IMAGE_SLOTS,
  subscribeToSiteImages,
} from '../services/siteImageService';

const GalleryContext = createContext(null);

export function GalleryProvider({ children }) {
  const [firebasePhotos, setFirebasePhotos] = useState([]);
  const [firebaseSiteImages, setFirebaseSiteImages] = useState({});
  const [status, setStatus] = useState(
    firebaseConfigured ? 'loading' : 'showcase',
  );
  const [siteImagesStatus, setSiteImagesStatus] = useState(
    firebaseConfigured ? 'loading' : 'showcase',
  );

  useEffect(() => {
    if (!firebaseConfigured) {
      return undefined;
    }

    return subscribeToPublishedPhotos(
      (photos) => {
        setFirebasePhotos(photos);
        setStatus('live');
      },
      () => {
        setStatus('error');
      },
    );
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) {
      return undefined;
    }

    return subscribeToSiteImages(
      (images) => {
        setFirebaseSiteImages(images);
        setSiteImagesStatus('live');
      },
      () => {
        setSiteImagesStatus('error');
      },
    );
  }, []);

  const value = useMemo(() => {
    const knownIds = new Set(
      firebasePhotos
        .map((photo) => photo.legacyId)
        .filter((legacyId) => legacyId != null && legacyId !== '')
        .map(String),
    );
    const legacyPhotos = fallbackPhotos.filter(
      (photo) => !knownIds.has(String(photo.id)),
    );
    const photos = [...firebasePhotos, ...legacyPhotos];
    const resolvedSiteImages = {};

    SITE_IMAGE_SLOTS.forEach((slot) => {
      const linkedPhoto = slot.fallbackPhotoId
        ? photos.find(
            (photo) =>
              String(photo.legacyId || photo.id) === slot.fallbackPhotoId,
          )
        : null;
      const fallbackImage = {
        ...(linkedPhoto || {}),
        id: slot.id,
        slot: slot.id,
        label: slot.label,
        description: slot.description,
        url: linkedPhoto?.url || slot.fallbackUrl,
        imageUrl:
          linkedPhoto?.imageUrl || linkedPhoto?.url || slot.fallbackUrl,
        thumbnailUrl:
          linkedPhoto?.thumbnailUrl ||
          linkedPhoto?.url ||
          slot.fallbackUrl,
        alt: linkedPhoto?.alt || slot.fallbackAlt,
        width: linkedPhoto?.width || slot.fallbackWidth,
        height: linkedPhoto?.height || slot.fallbackHeight,
        position: linkedPhoto?.position || slot.fallbackPosition || '50% 50%',
        portrait: Boolean(slot.portrait),
        sourcePhotoId: linkedPhoto?.id || null,
        managed: false,
        isFallback: true,
      };
      const liveImage = firebaseSiteImages[slot.id];

      resolvedSiteImages[slot.id] = liveImage?.url
        ? {
            ...fallbackImage,
            ...liveImage,
            id: slot.id,
            slot: slot.id,
            label: slot.label,
            description: slot.description,
            portrait: Boolean(slot.portrait),
            managed: true,
            isFallback: false,
          }
        : fallbackImage;
    });

    return {
      photos,
      siteImages: resolvedSiteImages,
      getSiteImage: (slotId) => resolvedSiteImages[slotId] || null,
      status,
      siteImagesStatus,
      isLive: status === 'live',
    };
  }, [firebasePhotos, firebaseSiteImages, siteImagesStatus, status]);

  return (
    <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>
  );
}

export function useGallery() {
  const context = useContext(GalleryContext);

  if (!context) {
    throw new Error('useGallery must be used inside GalleryProvider.');
  }

  return context;
}
