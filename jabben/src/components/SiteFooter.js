import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Footer = styled.footer`
  padding: clamp(3.5rem, 7vw, 6rem) var(--page-gutter) 1.5rem;
  border-top: 1px solid ${theme.colors.lineLight};
  background: ${theme.colors.night};
  color: ${theme.colors.white};
`;

const FooterInner = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;
`;

const ContactRow = styled.div`
  display: grid;
  align-items: end;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(2rem, 6vw, 7rem);
  padding-bottom: clamp(2.75rem, 5vw, 4.5rem);

  small {
    display: block;
    margin-bottom: 1rem;
    color: ${theme.colors.orange};
    font: 600 0.64rem/1.4 ${theme.fonts.mono};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  @media (max-width: 42rem) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterTitle = styled.h2`
  max-width: 16ch;
  margin: 0;
  font: 400 clamp(2.4rem, 5vw, 5rem) / 0.95 ${theme.fonts.display};
  letter-spacing: -0.035em;

  em {
    color: ${theme.colors.paperDeep};
    font-weight: inherit;
  }
`;

const ContactLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  min-height: 3.35rem;
  padding: 0.2rem 1.35rem;
  border: 1px solid ${theme.colors.lineLight};
  border-radius: 999px;
  font: 600 0.67rem/1 ${theme.fonts.mono};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition:
    border-color 0.25s ${theme.easing.smooth},
    background 0.25s ${theme.easing.smooth},
    color 0.25s ${theme.easing.smooth},
    transform 0.25s ${theme.easing.smooth};

  span {
    color: ${theme.colors.orange};
    font-size: 1rem;
    transition: color 0.25s ${theme.easing.smooth};
  }

  &:hover {
    border-color: ${theme.colors.orange};
    background: ${theme.colors.orange};
    color: ${theme.colors.night};
    transform: translateY(-2px);
  }

  &:hover span {
    color: inherit;
  }
`;

const FooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding-top: 1.35rem;
  border-top: 1px solid ${theme.colors.lineLight};

  @media (max-width: 48rem) {
    align-items: flex-start;
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const FooterLinks = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem clamp(1.25rem, 3vw, 2.5rem);

  a {
    color: ${theme.colors.paperDeep};
    font-size: 0.82rem;
    transition: color 0.2s ease;
  }

  a:hover {
    color: ${theme.colors.white};
  }
`;

const FinePrint = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
  color: ${theme.colors.smoke};
  font: 500 0.58rem/1.5 ${theme.fonts.mono};
  letter-spacing: 0.07em;
  text-transform: uppercase;

  a {
    color: ${theme.colors.paperDeep};
    transition: color 0.2s ease;
  }

  a:hover {
    color: ${theme.colors.orange};
  }

  @media (max-width: 35rem) {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }
`;

export function SiteFooter() {
  return (
    <Footer>
      <FooterInner>
        <ContactRow>
          <div>
            <small>Let’s make something memorable</small>
            <FooterTitle>
              Have a moment in mind? <em>Let’s talk.</em>
            </FooterTitle>
          </div>
          <ContactLink to="/contact">
            Start a project <span aria-hidden="true">↗</span>
          </ContactLink>
        </ContactRow>
        <FooterBar>
          <FooterLinks aria-label="Footer navigation">
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
            <Link to="/contact">Contact</Link>
          </FooterLinks>
          <FinePrint>
            <span>© {new Date().getFullYear()} Julian Bjørgen</span>
            <Link to="/studio">Studio</Link>
          </FinePrint>
        </FooterBar>
      </FooterInner>
    </Footer>
  );
}
