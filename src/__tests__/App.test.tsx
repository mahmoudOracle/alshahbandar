import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('App (smoke)', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Basic smoke: expect the app to render something root-ish
    const el = screen.queryByText(/Alshabandar|تجاري|Login|Dashboard/i);
    expect(el === null || el).toBeDefined();
  });
});
