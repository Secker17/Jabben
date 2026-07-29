import { fireEvent, render, screen } from '@testing-library/react';
import { useGallery } from '../context/GalleryContext';
import { WorkPage } from './WorkPage';

jest.mock('../context/GalleryContext', () => ({
  useGallery: jest.fn(),
}));

const photo = (id, title, artist) => ({
  id,
  title,
  artist,
  category: 'Concert',
  year: 2025,
  alt: `${artist} performing live.`,
  url: `https://example.com/${id}.jpg`,
  width: 1200,
  height: 1500,
});

test('groups multiple photographs under the same artist filter', () => {
  useGallery.mockReturnValue({
    photos: [
      photo('ed-1', 'Opening song', 'Ed Sheeran'),
      photo('ed-2', 'Encore', 'Ed Sheeran'),
      photo('pitbull-1', 'Pitbull', 'Pitbull'),
    ],
    status: 'live',
  });

  render(<WorkPage />);

  expect(screen.getByText(/03 images/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Ed Sheeran' }));

  expect(screen.getByText(/02 images/i)).toBeInTheDocument();
  expect(
    screen.getAllByRole('button', { name: /open photograph/i }),
  ).toHaveLength(2);
});

test('falls back to title for older photographs without artist metadata', () => {
  useGallery.mockReturnValue({
    photos: [photo('legacy', 'Billie Eilish', undefined)],
    status: 'showcase',
  });

  render(<WorkPage />);

  expect(
    screen.getByRole('button', { name: 'Billie Eilish' }),
  ).toBeInTheDocument();
});
