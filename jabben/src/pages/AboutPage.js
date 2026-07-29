import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useGallery } from '../context/GalleryContext';
import { theme } from '../styles/theme';

const Page = styled.main`
  background: ${theme.colors.paper};
  color: ${theme.colors.ink};
`;

const Hero = styled.header`
  min-height: 92svh;
  padding: clamp(9rem, 16vw, 14rem) var(--page-gutter)
    clamp(5rem, 10vw, 9rem);
`;

const HeroInner = styled.div`
  display: grid;
  align-items: end;
  grid-template-columns: minmax(0, 1.35fr) minmax(17rem, 0.65fr);
  gap: clamp(3rem, 8vw, 10rem);
  max-width: var(--max-width);
  min-height: 65svh;
  margin: 0 auto;

  h1 {
    max-width: 73rem;
    margin: 0;
    font: 400 clamp(4.8rem, 13vw, 14rem) / 0.73 ${theme.fonts.display};
    letter-spacing: -0.06em;
  }

  h1 em {
    display: block;
    margin-left: clamp(0rem, 10vw, 10rem);
    color: ${theme.colors.orangeDark};
    font-weight: inherit;
  }

  aside {
    padding-top: 1rem;
    border-top: 1px solid ${theme.colors.lineDark};
  }

  aside small {
    font: 600 0.65rem/1 ${theme.fonts.mono};
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  aside p {
    margin: 2rem 0 0;
    font-size: clamp(1.05rem, 1.7vw, 1.35rem);
  }

  @media (max-width: 48rem) {
    grid-template-columns: 1fr;
  }
`;

const ImageRun = styled.section`
  display: grid;
  align-items: end;
  grid-template-columns: 0.75fr 1.25fr 0.6fr;
  gap: clamp(0.7rem, 1.8vw, 1.8rem);
  padding: 0 var(--page-gutter) clamp(7rem, 13vw, 13rem);
  overflow: hidden;

  figure {
    margin: 0;
    overflow: hidden;
    background: ${theme.colors.paperDeep};
  }

  figure:nth-child(1),
  figure:nth-child(3) {
    aspect-ratio: 3 / 4;
  }

  figure:nth-child(2) {
    aspect-ratio: 4 / 5;
  }

  figure.portrait {
    background: ${theme.colors.orange};
  }

  figure.portrait img {
    object-fit: contain;
    object-position: center bottom;
    filter: contrast(1.08);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 42rem) {
    grid-template-columns: 1fr 1.35fr;

    figure:nth-child(3) {
      display: none;
    }
  }
`;

const DarkSection = styled.section`
  padding: clamp(7rem, 13vw, 13rem) var(--page-gutter);
  background: ${theme.colors.night};
  color: ${theme.colors.white};
`;

const Bio = styled.div`
  display: grid;
  grid-template-columns: minmax(10rem, 0.3fr) minmax(0, 1fr);
  gap: clamp(2rem, 7vw, 10rem);
  max-width: var(--max-width);
  margin: 0 auto;

  > small {
    font: 600 0.65rem/1.5 ${theme.fonts.mono};
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  > div > p {
    max-width: 70rem;
    margin: 0;
    font: 400 clamp(2.2rem, 4.8vw, 5.3rem) / 1 ${theme.fonts.display};
    letter-spacing: -0.035em;
  }

  > div > p em {
    color: ${theme.colors.orange};
    font-weight: inherit;
  }

  @media (max-width: 42rem) {
    grid-template-columns: 1fr;
  }
`;

const Facts = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  max-width: 70rem;
  margin-top: clamp(4rem, 8vw, 8rem);
  background: ${theme.colors.lineLight};

  article {
    min-height: 13rem;
    padding: 1.5rem;
    background: ${theme.colors.night};
  }

  strong {
    display: block;
    color: ${theme.colors.orange};
    font: 400 clamp(3.5rem, 6vw, 6.5rem) / 1 ${theme.fonts.display};
  }

  span {
    display: block;
    max-width: 12rem;
    margin-top: 1rem;
    color: rgba(255, 253, 248, 0.65);
    font-size: 0.9rem;
  }

  @media (max-width: 38rem) {
    grid-template-columns: 1fr;
  }
`;

const Process = styled.section`
  padding: clamp(7rem, 13vw, 13rem) var(--page-gutter);
  background: ${theme.colors.paper};
`;

const ProcessInner = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;

  h2 {
    max-width: 70rem;
    margin: 0 0 clamp(4rem, 8vw, 8rem);
    font: 400 clamp(3.5rem, 8vw, 8.5rem) / 0.88 ${theme.fonts.display};
    letter-spacing: -0.05em;
  }

  h2 em {
    color: ${theme.colors.orangeDark};
    font-weight: inherit;
  }
`;

const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-top: 1px solid ${theme.colors.lineDark};
  list-style: none;

  li {
    min-height: 16rem;
    padding: 1.5rem 1.5rem 1.5rem 0;
    border-right: 1px solid ${theme.colors.lineDark};
  }

  li:not(:first-child) {
    padding-left: 1.5rem;
  }

  small {
    font: 600 0.65rem/1 ${theme.fonts.mono};
  }

  h3 {
    margin: 4rem 0 1rem;
    font: 400 clamp(1.8rem, 3vw, 3.2rem) / 1 ${theme.fonts.display};
  }

  p {
    margin: 0;
    color: #5e5a53;
    font-size: 0.92rem;
  }

  @media (max-width: 50rem) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 32rem) {
    grid-template-columns: 1fr;

    li,
    li:not(:first-child) {
      min-height: 0;
      padding: 1.5rem 0 2.5rem;
      border-right: 0;
      border-bottom: 1px solid ${theme.colors.lineDark};
    }

    h3 {
      margin-top: 2rem;
    }
  }
`;

const ContactLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  min-height: 3.5rem;
  margin-top: 4rem;
  border-bottom: 1px solid ${theme.colors.ink};
  font: 700 0.68rem/1 ${theme.fonts.mono};
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const steps = [
  ['Tell me', 'Share the idea, the date and what the photographs need to do.'],
  ['Plan', 'We shape the visual direction, location and a simple plan with room for the real.'],
  ['Photograph', 'On the day, I work close to the action, calmly and with an eye for detail.'],
  ['Deliver', 'You receive a carefully curated and fully finished series of images.'],
];

export function AboutPage() {
  const { getSiteImage } = useGallery();
  const visualPhotos = [
    getSiteImage('aboutLeft'),
    getSiteImage('aboutPortrait'),
    getSiteImage('aboutRight'),
  ].filter(Boolean);

  return (
    <Page id="main-content">
      <Hero>
        <HeroInner>
          <h1>
            Behind
            <em>the camera.</em>
          </h1>
          <aside>
            <small>Julian Bjørgen / Photographer</small>
            <p>
              Photographer, filmmaker and designer with an uncompromising love
              for music and visual storytelling.
            </p>
          </aside>
        </HeroInner>
      </Hero>

      <ImageRun aria-label="A selection of concert photographs">
        {visualPhotos.map((photo) => (
          <figure key={photo.id} className={photo.portrait ? 'portrait' : ''}>
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              style={{ objectPosition: photo.position }}
            />
          </figure>
        ))}
      </ImageRun>

      <DarkSection>
        <Bio>
          <small>( Hi, I’m Julian )</small>
          <div>
            <p>
              I photograph music because no two nights are the same. But my
              perspective does not stop at the edge of the stage — I also work
              with portraits, city life, film and <em>design.</em>
            </p>
            <Facts>
              <article>
                <strong>02</strong>
                <span>years of media studies in Norway</span>
              </article>
              <article>
                <strong>24+</strong>
                <span>artists in the curated archive</span>
              </article>
              <article>
                <strong>01</strong>
                <span>goal: photographs that continue to feel real</span>
              </article>
            </Facts>
          </div>
        </Bio>
      </DarkSection>

      <Process>
        <ProcessInner>
          <h2>
            A simple process. <em>A clear result.</em>
          </h2>
          <Steps>
            {steps.map(([title, text], index) => (
              <li key={title}>
                <small>0{index + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </Steps>
          <ContactLink to="/contact">Start a conversation ↗</ContactLink>
        </ProcessInner>
      </Process>
    </Page>
  );
}
