import { render, screen } from '@testing-library/react';
import { App } from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

test('renders the Julian Bjørgen identity and primary navigation', async () => {
  render(<App />);

  expect(
    await screen.findByRole('link', { name: /julian bjørgen – home/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Work' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument();
});

test('renders the private Studio route shell', async () => {
  window.history.pushState({}, '', '/studio');
  render(<App />);

  expect(
    await screen.findByRole('link', {
      name: /julian bjørgen .* return to the home page/i,
    }),
  ).toBeInTheDocument();
});
