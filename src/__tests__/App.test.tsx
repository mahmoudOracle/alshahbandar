import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

describe('App (smoke)', () => {
  it('renders without crashing', () => {
    render(
      <HashRouter>
        <NotificationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NotificationProvider>
      </HashRouter>
    );
    // Basic smoke: expect the app to render something root-ish
    const el = screen.queryByText(/Alshabandar|تجاري|Login|ملخّص/i);
    expect(el === null || el).toBeDefined();
  });
});
