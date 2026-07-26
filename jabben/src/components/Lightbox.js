import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Backdrop = styled.div`
  position: fixed;
  z-index: 5000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 3vw, 3rem);
  background: rgba(5, 5, 5, 0.96);
`;

const Figure = styled.figure`
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 1rem;
  width: 100%;
  height: 100%;
  margin: 0;

  img {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: contain;
  }

  figcaption {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font: 500 0.68rem/1.5 ${theme.fonts.mono};
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Close = styled.button`
  position: absolute;
  z-index: 2;
  top: clamp(1rem, 3vw, 2rem);
  right: clamp(1rem, 3vw, 2rem);
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-items: center;
  border: 1px solid ${theme.colors.lineLight};
  border-radius: 50%;
  background: rgba(9, 10, 9, 0.7);
  color: ${theme.colors.white};
  font-size: 1.4rem;
  backdrop-filter: blur(10px);
`;

const Arrow = styled.button`
  position: absolute;
  z-index: 2;
  top: 50%;
  ${({ $next }) => ($next ? 'right: clamp(1rem, 3vw, 2rem);' : 'left: clamp(1rem, 3vw, 2rem);')}
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-items: center;
  border: 1px solid ${theme.colors.lineLight};
  border-radius: 50%;
  background: rgba(9, 10, 9, 0.65);
  color: ${theme.colors.white};
  font-size: 1.3rem;
  backdrop-filter: blur(10px);
  transform: translateY(-50%);
`;

export function Lightbox({ photo, photos, onClose, onChange }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const currentIndex = photos.findIndex((item) => item.id === photo.id);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') {
        onChange(photos[(currentIndex + 1) % photos.length]);
      }
      if (event.key === 'ArrowLeft') {
        onChange(photos[(currentIndex - 1 + photos.length) % photos.length]);
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not([disabled])',
        );
        const first = focusable?.[0];
        const last = focusable?.[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [currentIndex, onChange, onClose, photos]);

  const previous = () =>
    onChange(photos[(currentIndex - 1 + photos.length) % photos.length]);
  const next = () => onChange(photos[(currentIndex + 1) % photos.length]);

  return (
    <Backdrop
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.title}, photograph viewer`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Close ref={closeRef} type="button" onClick={onClose} aria-label="Close">
        ×
      </Close>
      {photos.length > 1 && (
        <>
          <Arrow type="button" onClick={previous} aria-label="Previous photograph">
            ←
          </Arrow>
          <Arrow $next type="button" onClick={next} aria-label="Next photograph">
            →
          </Arrow>
        </>
      )}
      <Figure>
        <img
          src={photo.url}
          alt={photo.alt || ''}
          width={photo.width || 1600}
          height={photo.height || 2000}
        />
        <figcaption>
          <span>{photo.title}</span>
          <span>
            {String(currentIndex + 1).padStart(2, '0')} /{' '}
            {String(photos.length).padStart(2, '0')}
          </span>
        </figcaption>
      </Figure>
    </Backdrop>
  );
}
