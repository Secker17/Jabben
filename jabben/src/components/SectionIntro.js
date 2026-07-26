import styled from 'styled-components';
import { theme } from '../styles/theme';

const Intro = styled.header`
  display: grid;
  grid-template-columns: minmax(8rem, 0.3fr) minmax(0, 1fr);
  gap: clamp(2rem, 6vw, 8rem);
  max-width: var(--max-width);
  margin: 0 auto clamp(3rem, 7vw, 7rem);
  padding-top: 1rem;
  border-top: 1px solid ${({ $dark }) =>
    $dark ? theme.colors.lineLight : theme.colors.lineDark};

  @media (max-width: 42rem) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const Eyebrow = styled.p`
  margin: 0;
  font: 600 0.68rem/1.5 ${theme.fonts.mono};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  max-width: 72rem;
  margin: 0;
  font: 400 clamp(3rem, 7.5vw, 8rem) / 0.9 ${theme.fonts.display};
  letter-spacing: -0.045em;

  em {
    color: ${theme.colors.orange};
    font-weight: inherit;
  }
`;

export function SectionIntro({ eyebrow, children, dark = false }) {
  return (
    <Intro $dark={dark}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Title>{children}</Title>
    </Intro>
  );
}
