import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fallbackPhotos } from '../data/portfolio';
import { firebaseConfigured } from '../lib/firebase';
import { subscribeToPublishedPhotos } from '../services/galleryService';

const GalleryContext = createContext(null);

export function GalleryProvider({ children }) {
  const [firebasePhotos, setFirebasePhotos] = useState([]);
  const [status, setStatus] = useState(
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

  const value = useMemo(() => {
    const knownIds = new Set(firebasePhotos.map((photo) => photo.legacyId));
    const legacyPhotos = fallbackPhotos.filter(
      (photo) => !knownIds.has(photo.id),
    );

    return {
      photos: [...firebasePhotos, ...legacyPhotos],
      status,
      isLive: status === 'live',
    };
  }, [firebasePhotos, status]);

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
