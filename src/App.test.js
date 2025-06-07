import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the JikgwanGaja heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /직관가자/i });
  expect(heading).toBeInTheDocument();
});
