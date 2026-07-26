import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Page = styled.main`
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 2rem;
  background: ${theme.colors.orange};
  color: ${theme.colors.night};
  text-align: center;

  small {
    font: 600 0.68rem/1 ${theme.fonts.mono};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 1.5rem 0 2.5rem;
    font: 400 clamp(4rem, 13vw, 12rem) / 0.78 ${theme.fonts.display};
    letter-spacing: -0.055em;
  }

  a {
    display: inline-flex;
    min-height: 3.5rem;
    align-items: center;
    border-bottom: 1px solid currentColor;
    font: 700 0.68rem/1 ${theme.fonts.mono};
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

export function NotFoundPage() {
  return (
    <Page id="main-content">
      <div>
        <small>Error 404</small>
        <h1>This frame did not make the cut.</h1>
        <Link to="/">Back to the home page ↗</Link>
      </div>
    </Page>
  );
}
