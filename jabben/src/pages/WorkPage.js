import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Lightbox } from '../components/Lightbox';
import { PhotoGrid } from '../components/PhotoGrid';
import { useGallery } from '../context/GalleryContext';
import { theme } from '../styles/theme';

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(9rem, 16vw, 14rem) var(--page-gutter)
    clamp(7rem, 13vw, 13rem);
  background: ${theme.colors.night};
`;

const Masthead = styled.header`
  display: grid;
  align-items: end;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.32fr);
  gap: clamp(2rem, 6vw, 7rem);
  max-width: var(--max-width);
  margin: 0 auto clamp(4rem, 9vw, 8rem);

  h1 {
    margin: 0;
    font: 400 clamp(5.2rem, 15vw, 15rem) / 0.7 ${theme.fonts.display};
    letter-spacing: -0.065em;
  }

  h1 em {
    display: block;
    color: ${theme.colors.orange};
    font-weight: inherit;
  }

  p {
    max-width: 28rem;
    margin: 0;
    color: rgba(255, 253, 248, 0.68);
    font-size: clamp(0.95rem, 1.5vw, 1.15rem);
  }

  @media (max-width: 46rem) {
    grid-template-columns: 1fr;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  max-width: var(--max-width);
  margin: 0 auto 2rem;
  padding: 1rem 0;
  border-top: 1px solid ${theme.colors.lineLight};
  border-bottom: 1px solid ${theme.colors.lineLight};

  > span {
    color: ${theme.colors.smoke};
    font: 500 0.62rem/1 ${theme.fonts.mono};
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  @media (max-width: 35rem) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  button {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid
      ${({ $active }) =>
        $active ? theme.colors.orange : theme.colors.lineLight};
    border-radius: 999px;
    background: transparent;
    font: 600 0.62rem/1 ${theme.fonts.mono};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition:
      background 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;
  }

  button[aria-pressed='true'],
  button:hover {
    border-color: ${theme.colors.orange};
    background: ${theme.colors.orange};
    color: ${theme.colors.night};
  }
`;

const photoArtist = (photo) =>
  String(photo.artist || photo.title || '').trim();

export function WorkPage() {
  const { photos, status } = useGallery();
  const [filter, setFilter] = useState('All');
  const [activePhoto, setActivePhoto] = useState(null);
  const artists = useMemo(
    () => ['All', ...new Set(photos.map(photoArtist).filter(Boolean))],
    [photos],
  );
  const visiblePhotos =
    filter === 'All'
      ? photos
      : photos.filter((photo) => photoArtist(photo) === filter);

  const chooseArtist = (artist) => {
    setFilter(artist);
    setActivePhoto(null);
  };

  return (
    <Page id="main-content">
      <Masthead>
        <h1>
          One second.
          <em>Forever.</em>
        </h1>
        <p>
          A curated selection from concerts and encounters with artists —
          photographed up close, in the middle of the light, and always with
          respect for the moment.
        </p>
      </Masthead>
      <Toolbar>
        <Filters aria-label="Filter the portfolio by artist">
          {artists.map((artist) => (
            <button
              key={artist}
              type="button"
              aria-pressed={filter === artist}
              onClick={() => chooseArtist(artist)}
            >
              {artist}
            </button>
          ))}
        </Filters>
        <span>
          {String(visiblePhotos.length).padStart(2, '0')} images ·{' '}
          {status === 'live' ? 'Live gallery' : 'Curated archive'}
        </span>
      </Toolbar>
      <PhotoGrid photos={visiblePhotos} onSelect={setActivePhoto} />
      {activePhoto && (
        <Lightbox
          photo={activePhoto}
          photos={visiblePhotos}
          onClose={() => setActivePhoto(null)}
          onChange={setActivePhoto}
        />
      )}
    </Page>
  );
}
