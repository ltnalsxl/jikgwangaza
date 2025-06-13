import { normalizeDate } from './date';

test('converts GMT string to YYYY-MM-DD', () => {
  const input = 'Tue Jun 03 2025 00:00:00 GMT+0900';
  expect(normalizeDate(input)).toBe('2025-06-03');
});

test('returns YYYY-MM-DD as-is', () => {
  expect(normalizeDate('2025-06-03')).toBe('2025-06-03');
});
