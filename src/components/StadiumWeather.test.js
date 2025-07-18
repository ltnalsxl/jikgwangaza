import { render, screen } from '@testing-library/react';
import StadiumWeather from './StadiumWeather';

jest.mock('./StadiumWeather', () => jest.requireActual('./StadiumWeather'));

// Mock fetch
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          response: { body: { items: { item: [{ weatherNm: '맑음' }] } } },
        }),
    })
  );
});

afterEach(() => {
  fetch.mockClear();
});

test('renders weather list', async () => {
  render(<StadiumWeather eqmtIds={["123", "456"]} />);
  expect(screen.getByTestId('stadium-weather')).toBeInTheDocument();
  // Wait for fetch
  const items = await screen.findAllByRole('listitem');
  expect(items.length).toBe(2);
});
