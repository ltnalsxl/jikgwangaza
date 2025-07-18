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
          updatedAt: '2025-07-18T17:00:00+09:00',
          data: [
            { eqmtId: '123', stadium: 'A', weatherNm: '맑음', team: 'T1' },
            { eqmtId: '456', stadium: 'B', weatherNm: '흐림', team: 'T2' },
          ],
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
  expect(items[0].textContent).toContain('⚾ A');
  expect(items[0].textContent).toContain('맑음');
  expect(items[0].textContent).toContain('17:00');
});
