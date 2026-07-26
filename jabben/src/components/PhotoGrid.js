import styled from 'styled-components';
import { theme } from '../styles/theme';

const Grid = styled.div`
  display: grid;
  grid-auto-flow: dense;
  grid-auto-rows: clamp(13rem, 25vw, 28rem);
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.6vw, 1.5rem);
  max-width: var(--max-width);
  margin: 0 auto;

  @media (max-width: 50rem) {
    grid-auto-rows: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 34rem) {
    display: flex;
    flex-direction: column;
  }
`;

const Card = styled.button`
  position: relative;
  grid-column: ${({ $variant }) => {
    if ($variant === 0) return 'span 7';
    if ($variant === 1) return 'span 5';
    if ($variant === 2) return '2 / span 5';
    if ($variant === 3) return '7 / span 6';
    if ($variant === 4) return 'span 4';
    return 'span 8';
  }};
  grid-row: span ${({ $variant }) => ($variant === 0 || $variant === 5 ? 2 : 1)};
  min-height: 22rem;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: ${theme.colors.nightSoft};
  color: ${theme.colors.white};
  text-align: left;

  &::after {
    position: absolute;
    inset: auto 0 0;
    height: 45%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.78), transparent);
    content: '';
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: ${({ $position }) => $position};
    transition:
      transform 0.8s ${theme.easing.smooth},
      filter 0.8s ease;
  }

  &:hover img,
  &:focus-visible img {
    filter: saturate(1.08);
    transform: scale(1.025);
  }

  @media (max-width: 50rem) {
    grid-column: span 1;
    grid-row: auto;
    aspect-ratio: ${({ $variant }) =>
      $variant % 3 === 0 ? '3 / 4' : '4 / 5'};
    min-height: 0;
  }

  @media (max-width: 34rem) {
    width: 100%;
    aspect-ratio: ${({ $variant }) =>
      $variant % 3 === 0 ? '3 / 4' : '4 / 5'};
  }
`;

const Caption = styled.span`
  position: absolute;
  z-index: 1;
  right: clamp(1rem, 2vw, 1.5rem);
  bottom: clamp(1rem, 2vw, 1.5rem);
  left: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;

  strong {
    font: 400 clamp(1.8rem, 3vw, 3.3rem) / 0.95 ${theme.fonts.display};
  }

  small {
    flex-shrink: 0;
    font: 500 0.62rem/1.3 ${theme.fonts.mono};
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

export function PhotoGrid({ photos, onSelect, limit }) {
  const visiblePhotos = typeof limit === 'number' ? photos.slice(0, limit) : photos;

  return (
    <Grid>
      {visiblePhotos.map((photo, index) => (
        <Card
          key={photo.id}
          type="button"
          $variant={index % 6}
          $position={photo.position || '50% 50%'}
          onClick={() => onSelect(photo)}
          aria-label={`Open photograph: ${photo.title}`}
        >
          <img
            src={photo.thumbnailUrl || photo.url}
            alt={photo.alt || ''}
            width={photo.width || 1200}
            height={photo.height || 1500}
            loading={index < 2 ? 'eager' : 'lazy'}
          />
          <Caption>
            <strong>{photo.title}</strong>
            <small>
              {photo.category || 'Photography'} · {photo.year || 'Now'}
            </small>
          </Caption>
        </Card>
      ))}
    </Grid>
  );
}
