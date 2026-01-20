import React from 'react';

export const LoadingScreen = ({ message = 'جاري التحميل...' }: { message?: string }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <div className="spinner" style={{ marginBottom: '1rem' }}>...</div>
      <p dir="rtl">{message}</p>
    </div>
  );
};
