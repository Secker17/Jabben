import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

test('renders the Julian Bjørgen identity and primary navigation', async () => {
  render(<App />);

  expect(
    await screen.findByRole('link', { name: /julian bjørgen – home/i }),
  ).toBeInTheDocument();
  const primaryNavigation = screen.getByRole('navigation', {
    name: 'Hovedmeny',
  });
  expect(
    within(primaryNavigation).getByRole('link', { name: 'Work' }),
  ).toBeInTheDocument();
  expect(
    within(primaryNavigation).getByRole('link', { name: 'Contact' }),
  ).toBeInTheDocument();
});

test('renders the private Studio route shell', async () => {
  window.history.pushState({}, '', '/studio');
  render(<App />);

  expect(
    await screen.findByRole('link', {
      name: /julian bjørgen .* return to the home page/i,
    }, { timeout: 5000 }),
  ).toBeInTheDocument();
});

test('filters the portfolio by artist', async () => {
  window.history.pushState({}, '', '/work');
  render(<App />);

  const edSheeranFilter = await screen.findByRole('button', {
    name: 'Ed Sheeran',
  });
  fireEvent.click(edSheeranFilter);

  expect(
    screen.getByRole('button', { name: 'Open photograph: Ed Sheeran' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Open photograph: Billie Eilish' }),
  ).not.toBeInTheDocument();
});
