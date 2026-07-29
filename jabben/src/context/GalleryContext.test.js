import { render, screen } from '@testing-library/react';
import { GalleryProvider, useGallery } from './GalleryContext';
import { SITE_IMAGE_SLOTS } from '../services/siteImageService';

function GalleryProbe() {
  const { photos, siteImages, getSiteImage } = useGallery();
  const aboutLeft = getSiteImage('aboutLeft');

  return (
    <>
      <span data-testid="first-artist">{photos[0]?.artist}</span>
      <span data-testid="slot-count">{Object.keys(siteImages).length}</span>
      <span data-testid="about-left-source">{aboutLeft?.sourcePhotoId}</span>
      <span data-testid="about-left-fallback">
        {String(aboutLeft?.isFallback)}
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
  expect(screen.getByTestId('about-left-source')).toHaveTextContent('08');
  expect(screen.getByTestId('about-left-fallback')).toHaveTextContent('true');
});

test('publishes only the five user-visible site image slots', () => {
  expect(SITE_IMAGE_SLOTS.map((slot) => slot.id)).toEqual([
    'homeHero',
    'aboutLeft',
    'aboutPortrait',
    'aboutRight',
    'studioLogin',
  ]);
});
