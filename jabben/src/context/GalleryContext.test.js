import { render, screen } from '@testing-library/react';
import { GalleryProvider, useGallery } from './GalleryContext';
import { SITE_IMAGE_SLOTS } from '../services/siteImageService';

function GalleryProbe() {
  const { photos, siteImages, getSiteImage } = useGallery();
  const studioLogin = getSiteImage('studioLogin');

  return (
    <>
      <span data-testid="first-artist">{photos[0]?.artist}</span>
      <span data-testid="slot-count">{Object.keys(siteImages).length}</span>
      <span data-testid="studio-login-source">
        {studioLogin?.sourcePhotoId}
      </span>
      <span data-testid="studio-login-fallback">
        {String(studioLogin?.isFallback)}
      </span>
    </>
  );
}

test('adds legacy artist metadata and resolves every site image fallback', () => {
  render(
    <GalleryProvider>
      <GalleryProbe />
    </GalleryProvider>,
  );

  expect(screen.getByTestId('first-artist')).toHaveTextContent('Ed Sheeran');
  expect(screen.getByTestId('slot-count')).toHaveTextContent(
    String(SITE_IMAGE_SLOTS.length),
  );
  expect(screen.getByTestId('studio-login-source')).toHaveTextContent('08');
  expect(screen.getByTestId('studio-login-fallback')).toHaveTextContent('true');
});

test('publishes only the two user-visible site image slots', () => {
  expect(SITE_IMAGE_SLOTS.map((slot) => slot.id)).toEqual([
    'homeHero',
    'studioLogin',
  ]);
});
