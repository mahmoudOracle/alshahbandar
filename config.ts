// Simple runtime config for diagnostics
// Enable debug-only behavior in development builds only.
export const DEBUG_MODE = import.meta.env.DEV;

// Environment hint (from Vite)
export const APP_ENV = import.meta.env.MODE || 'development';
