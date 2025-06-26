import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/직관가자/i);
  expect(titleElement).toBeInTheDocument();
});
