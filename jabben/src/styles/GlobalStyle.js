import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: dark;
    --ink: ${theme.colors.ink};
    --night: ${theme.colors.night};
    --paper: ${theme.colors.paper};
    --orange: ${theme.colors.orange};
    --page-gutter: clamp(1.15rem, 3vw, 3.5rem);
    --max-width: 112rem;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
    background: ${theme.colors.night};
  }

  body {
    margin: 0;
    min-width: 20rem;
    min-height: 100vh;
    overflow-x: hidden;
    background: ${theme.colors.night};
    color: ${theme.colors.white};
    font-family: ${theme.fonts.sans};
    font-size: 1rem;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  body::before {
    position: fixed;
    z-index: 10000;
    inset: 0;
    pointer-events: none;
    content: '';
    opacity: 0.045;
    background-image:
      repeating-radial-gradient(circle at 12% 22%, transparent 0, rgba(255,255,255,.7) .5px, transparent 1px, transparent 4px),
      repeating-radial-gradient(circle at 72% 68%, transparent 0, rgba(0,0,0,.7) .5px, transparent 1px, transparent 5px);
    background-size: 7px 7px, 9px 9px;
    mix-blend-mode: soft-light;
  }

  #root {
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  input,
  textarea,
  select {
    color: inherit;
    font: inherit;
  }

  button,
  select {
    cursor: pointer;
  }

  img {
    display: block;
    max-width: 100%;
  }

  ::selection {
    background: ${theme.colors.orange};
    color: ${theme.colors.night};
  }

  :focus-visible {
    outline: 3px solid ${theme.colors.orange};
    outline-offset: 4px;
  }

  .skip-link {
    position: fixed;
    z-index: 20000;
    top: 1rem;
    left: 1rem;
    padding: .8rem 1rem;
    background: ${theme.colors.white};
    color: ${theme.colors.ink};
    transform: translateY(-180%);
    transition: transform .2s ease;
  }

  .skip-link:focus {
    transform: translateY(0);
  }

  .page-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    min-height: 100svh;
    background: ${theme.colors.night};
    color: ${theme.colors.white};
    font: 500 .7rem/1 ${theme.fonts.mono};
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .page-loader i {
    width: 2.5rem;
    height: 1px;
    background: ${theme.colors.orange};
    animation: loading-line 1.1s ${theme.easing.smooth} infinite alternate;
    transform-origin: left;
  }

  @keyframes loading-line {
    from { transform: scaleX(.15); }
    to { transform: scaleX(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
`;
