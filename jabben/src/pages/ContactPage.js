import styled from 'styled-components';
import { theme } from '../styles/theme';

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(9rem, 16vw, 14rem) var(--page-gutter)
    clamp(7rem, 13vw, 13rem);
  background: ${theme.colors.paper};
  color: ${theme.colors.ink};
`;

const Intro = styled.header`
  max-width: var(--max-width);
  margin: 0 auto clamp(5rem, 10vw, 10rem);

  > small {
    font: 600 0.65rem/1 ${theme.fonts.mono};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 90rem;
    margin: 1.5rem 0 0;
    font: 400 clamp(4.5rem, 12vw, 13rem) / 0.74 ${theme.fonts.display};
    letter-spacing: -0.06em;
  }

  h1 em {
    display: block;
    margin-left: clamp(0rem, 12vw, 12rem);
    color: ${theme.colors.orangeDark};
    font-weight: inherit;
  }
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(16rem, 0.45fr) minmax(0, 1fr);
  gap: clamp(4rem, 10vw, 12rem);
  max-width: var(--max-width);
  margin: 0 auto;

  @media (max-width: 48rem) {
    grid-template-columns: 1fr;
  }
`;

const Details = styled.aside`
  h2 {
    margin: 0 0 1.5rem;
    font: 400 clamp(2rem, 4vw, 4rem) / 1 ${theme.fonts.display};
  }

  p {
    max-width: 28rem;
    margin: 0 0 3rem;
    color: #5e5a53;
  }

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 4rem;
    border-top: 1px solid ${theme.colors.lineDark};
    font: 600 0.68rem/1.5 ${theme.fonts.mono};
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  a:last-child {
    border-bottom: 1px solid ${theme.colors.lineDark};
  }

  a::after {
    content: '↗';
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem 1.5rem;

  @media (max-width: 36rem) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 0.65rem;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};

  span {
    font: 600 0.63rem/1 ${theme.fonts.mono};
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  input,
  textarea,
  select {
    width: 100%;
    min-height: 3.5rem;
    padding: 0.85rem 0;
    border: 0;
    border-bottom: 1px solid ${theme.colors.lineDark};
    border-radius: 0;
    background: transparent;
    color: ${theme.colors.ink};
    outline: 0;
    transition: border-color 0.2s ease;
  }

  textarea {
    min-height: 9rem;
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: ${theme.colors.orangeDark};
  }
`;

const SubmitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  grid-column: 1 / -1;
  gap: 2rem;
  margin-top: 1rem;

  small {
    max-width: 20rem;
    color: #6b675f;
  }

  button {
    flex-shrink: 0;
    width: 8.5rem;
    height: 8.5rem;
    border: 0;
    border-radius: 50%;
    background: ${theme.colors.orange};
    color: ${theme.colors.night};
    font: 700 0.65rem/1.4 ${theme.fonts.mono};
    letter-spacing: 0.09em;
    text-transform: uppercase;
    transition:
      transform 0.4s ${theme.easing.smooth},
      background 0.2s ease;
  }

  button:hover {
    background: ${theme.colors.ink};
    color: ${theme.colors.white};
    transform: rotate(-6deg);
  }

  @media (max-width: 36rem) {
    align-items: flex-start;
    flex-direction: column-reverse;
  }
`;

export function ContactPage() {
  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(
      `Photography enquiry from ${data.get('name')}`,
    );
    const body = encodeURIComponent(
      [
        `Name: ${data.get('name')}`,
        `Email: ${data.get('email')}`,
        `Type of project: ${data.get('type')}`,
        `Date / period: ${data.get('date') || 'To be confirmed'}`,
        '',
        data.get('message'),
      ].join('\n'),
    );
    window.location.href = `mailto:bjorgenjulian@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <Page id="main-content">
      <Intro>
        <small>( Contact )</small>
        <h1>
          Something
          <em>in mind?</em>
        </h1>
      </Intro>
      <ContactGrid>
        <Details>
          <h2>Tell me about it.</h2>
          <p>
            Share what you are planning, where it is happening and what the
            photographs need to do. Then we will find the right next step.
          </p>
          <a href="mailto:bjorgenjulian@gmail.com">
            bjorgenjulian@gmail.com
          </a>
          <a
            href="https://www.instagram.com/julianbjorgen/"
            target="_blank"
            rel="noreferrer"
          >
            @julianbjorgen
          </a>
        </Details>

        <Form onSubmit={handleSubmit}>
          <Field>
            <span>Name *</span>
            <input name="name" autoComplete="name" required />
          </Field>
          <Field>
            <span>Email *</span>
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field>
            <span>Type of project *</span>
            <select name="type" defaultValue="" required>
              <option value="" disabled>
                Select
              </option>
              <option>Concert / event</option>
              <option>Portrait</option>
              <option>Film / content</option>
              <option>Design</option>
              <option>Other</option>
            </select>
          </Field>
          <Field>
            <span>Preferred date</span>
            <input name="date" type="text" placeholder="Date or period" />
          </Field>
          <Field $wide>
            <span>Tell me about the project *</span>
            <textarea
              name="message"
              required
              placeholder="What is happening, where, and what do you need?"
            />
          </Field>
          <SubmitRow>
            <small>
              The button opens your email app with the enquiry ready to send.
            </small>
            <button type="submit">Open email ↗</button>
          </SubmitRow>
        </Form>
      </ContactGrid>
    </Page>
  );
}
