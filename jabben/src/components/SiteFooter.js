import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Footer = styled.footer`
  padding: clamp(5rem, 11vw, 10rem) var(--page-gutter) 2rem;
  overflow: hidden;
  background: ${theme.colors.orange};
  color: ${theme.colors.night};
`;

const FooterTop = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
  gap: 4rem;
  max-width: var(--max-width);
  margin: 0 auto clamp(5rem, 10vw, 9rem);

  p {
    max-width: 33rem;
    margin: 0;
    font-size: clamp(1rem, 1.6vw, 1.35rem);
  }

  @media (max-width: 46rem) {
    grid-template-columns: 1fr;
  }
`;

const FooterTitle = styled.p`
  max-width: 60rem !important;
  font: 400 clamp(3.2rem, 8vw, 8.5rem) / 0.88 ${theme.fonts.display};
  letter-spacing: -0.05em;
`;

const FooterLinks = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.8rem;

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 3.2rem;
    border-bottom: 1px solid rgba(9, 10, 9, 0.35);
    font: 600 0.72rem/1 ${theme.fonts.mono};
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  a::after {
    content: '↗';
  }
`;

const Wordmark = styled.div`
  width: max-content;
  margin-left: -0.035em;
  font: 400 clamp(7rem, 22vw, 23rem) / 0.67 ${theme.fonts.display};
  letter-spacing: -0.07em;
  white-space: nowrap;
`;

const FinePrint = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  max-width: var(--max-width);
  margin: 3.5rem auto 0;
  padding-top: 1rem;
  border-top: 1px solid rgba(9, 10, 9, 0.35);
  font: 500 0.62rem/1.5 ${theme.fonts.mono};
  letter-spacing: 0.08em;
  text-transform: uppercase;

  @media (max-width: 35rem) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export function SiteFooter() {
  return (
    <Footer>
      <FooterTop>
        <FooterTitle>Have a stage, an idea or a moment in mind?</FooterTitle>
        <FooterLinks>
          <a href="mailto:bjorgenjulian@gmail.com">
            bjorgenjulian@gmail.com
          </a>
          <a
            href="https://www.instagram.com/julianbjorgen/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
          <Link to="/contact">Start a project</Link>
        </FooterLinks>
      </FooterTop>
      <Wordmark aria-hidden="true">JULIAN—BJØRGEN</Wordmark>
      <FinePrint>
        <span>© {new Date().getFullYear()} Julian Bjørgen</span>
        <span>Photography · Film · Visual identity</span>
        <Link to="/studio">Studio ↗</Link>
      </FinePrint>
    </Footer>
  );
}
