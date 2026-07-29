import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Lightbox } from '../components/Lightbox';
import { PhotoGrid } from '../components/PhotoGrid';
import { SectionIntro } from '../components/SectionIntro';
import { useGallery } from '../context/GalleryContext';
import { theme } from '../styles/theme';

const Hero = styled.main`
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  background: ${theme.colors.night};
`;

const HeroImage = styled.div`
  position: absolute;
  inset: 0;

  &::after {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(5, 5, 5, 0.94) 0%, rgba(5, 5, 5, 0.5) 42%, rgba(5, 5, 5, 0.05) 72%),
      linear-gradient(0deg, rgba(5, 5, 5, 0.72) 0%, transparent 40%);
    content: '';
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 20% 50%;
    animation: hero-reveal 1.25s ${theme.easing.smooth} both;
  }

  @keyframes hero-reveal {
    from {
      opacity: 0;
      transform: scale(1.04);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 45rem) {
    img {
      object-position: 20% 50%;
    }

    &::after {
      background:
        linear-gradient(0deg, rgba(5, 5, 5, 0.9) 0%, transparent 62%),
        linear-gradient(90deg, rgba(5, 5, 5, 0.55), transparent);
    }
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-direction: column;
  min-height: 100svh;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 9rem var(--page-gutter) clamp(2rem, 5vw, 4rem);
`;

const Kicker = styled.p`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0 0 1.5rem;
  font: 600 0.67rem/1.4 ${theme.fonts.mono};
  letter-spacing: 0.13em;
  text-transform: uppercase;

  &::before {
    width: 2.7rem;
    height: 1px;
    background: ${theme.colors.orange};
    content: '';
  }
`;

const HeroTitle = styled.h1`
  max-width: 67rem;
  margin: 0;
  font: 400 clamp(4.7rem, 13vw, 13rem) / 0.72 ${theme.fonts.display};
  letter-spacing: -0.065em;

  span {
    display: block;
    margin-left: clamp(1rem, 16vw, 15rem);
    color: ${theme.colors.orange};
    font-style: italic;
  }
`;

const HeroBottom = styled.div`
  display: grid;
  align-items: end;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2rem;
  width: 100%;
  margin-top: clamp(2rem, 6vh, 5rem);

  p {
    max-width: 34rem;
    margin: 0;
    color: rgba(255, 253, 248, 0.8);
    font-size: clamp(0.95rem, 1.4vw, 1.15rem);
  }

  @media (max-width: 38rem) {
    align-items: start;
    grid-template-columns: 1fr;
  }
`;

const RoundLink = styled(Link)`
  display: inline-grid;
  width: 7.5rem;
  height: 7.5rem;
  place-items: center;
  padding: 1rem;
  border-radius: 50%;
  background: ${theme.colors.orange};
  color: ${theme.colors.night};
  font: 700 0.64rem/1.4 ${theme.fonts.mono};
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
  transition:
    transform 0.45s ${theme.easing.smooth},
    background 0.25s ease;

  &:hover {
    background: ${theme.colors.white};
    transform: rotate(-7deg) scale(1.04);
  }
`;

const Ticker = styled.div`
  display: flex;
  overflow: hidden;
  border-top: 1px solid ${theme.colors.lineLight};
  border-bottom: 1px solid ${theme.colors.lineLight};
  background: ${theme.colors.night};

  div {
    display: flex;
    flex-shrink: 0;
    gap: 2rem;
    min-width: 100%;
    padding: 1rem;
    animation: ticker 24s linear infinite;
  }

  span {
    display: flex;
    align-items: center;
    gap: 2rem;
    font: 500 0.68rem/1 ${theme.fonts.mono};
    letter-spacing: 0.13em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  span::after {
    color: ${theme.colors.orange};
    content: '✦';
  }

  @keyframes ticker {
    to {
      transform: translateX(-100%);
    }
  }
`;

const WorkSection = styled.section`
  padding: clamp(6rem, 12vw, 12rem) var(--page-gutter);
  background: ${theme.colors.night};
`;

const WorkFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  max-width: var(--max-width);
  margin: clamp(2rem, 5vw, 4rem) auto 0;
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  min-height: 3.5rem;
  border-bottom: 1px solid ${theme.colors.white};
  font: 600 0.68rem/1 ${theme.fonts.mono};
  letter-spacing: 0.11em;
  text-transform: uppercase;

  span {
    color: ${theme.colors.orange};
    font-size: 1.2rem;
  }
`;

export function HomePage() {
  const { getSiteImage, photos } = useGallery();
  const [activePhoto, setActivePhoto] = useState(null);
  const heroImage = getSiteImage('homeHero');
  const featured = photos.filter((photo) => photo.featured);
  const selected = featured.length >= 6 ? featured : photos;
  const tickerItems = [
    'Concert photography',
    'Portraits',
    'Film',
    'Design',
    'Oslo · Norway',
  ];

  return (
    <>
      <Hero id="main-content">
        <HeroImage>
          <img
            src={heroImage?.url || '/images/julian-bjorgen-hero.png'}
            alt={
              heroImage?.alt ||
              'An artist standing in warm stage light in front of a concert crowd.'
            }
            width={heroImage?.width || 1536}
            height={heroImage?.height || 1024}
            style={{ objectPosition: heroImage?.position || '20% 50%' }}
            fetchPriority="high"
          />
        </HeroImage>
        <HeroContent>
          <Kicker>Julian Bjørgen · Photographer</Kicker>
          <HeroTitle>
            Caught in
            <span>the moment.</span>
          </HeroTitle>
          <HeroBottom>
            <p>
              Concert photography with nerve. Portraits with personality.
              Visual stories that still resonate when the lights go down.
            </p>
            <RoundLink to="/work">View selected work ↗</RoundLink>
          </HeroBottom>
        </HeroContent>
      </Hero>

      <Ticker aria-hidden="true">
        {[0, 1].map((loop) => (
          <div key={loop}>
            {tickerItems.map((item) => (
              <span key={`${loop}-${item}`}>{item}</span>
            ))}
          </div>
        ))}
      </Ticker>

      <WorkSection>
        <SectionIntro eyebrow="01 / Selected work" dark>
          Turn it up. <em>Stay still.</em>
        </SectionIntro>
        <PhotoGrid photos={selected} limit={8} onSelect={setActivePhoto} />
        <WorkFooter>
          <TextLink to="/work">
            View the full portfolio <span>↗</span>
          </TextLink>
        </WorkFooter>
      </WorkSection>

      {activePhoto && (
        <Lightbox
          photo={activePhoto}
          photos={selected.slice(0, 8)}
          onClose={() => setActivePhoto(null)}
          onChange={setActivePhoto}
        />
      )}
    </>
  );
}
