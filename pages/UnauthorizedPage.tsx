import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedPage: React.FC = () => {
  const { status, user, error, logout } = useAuth();

  const getMessage = () => {
    switch (status) {
      case 'unauthorized_notMember':
        return 'Your account is not registered as a member of this company. Please contact your administrator.';
      case 'unauthorized_companyInactive':
        return 'This company account is currently inactive. Please contact support for assistance.';
      case 'error':
        return `An error occurred: ${error || 'Unknown error'}`;
      default:
        return 'You do not have permission to access this application.';
    }
  };

  const cardStyle: React.CSSProperties = {
    margin: '100px auto',
    padding: '40px',
    maxWidth: '600px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '16px',
  };

  const infoStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
  };

  const emailStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '32px',
    wordBreak: 'break-all',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    color: '#fff',
    backgroundColor: '#4299e1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  };

  return (
    <div style={{ background: '#f7fafc', height: '100vh', paddingTop: '1px' }}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Access Denied</h1>
        <p style={infoStyle}>{getMessage()}</p>
        {user && (
          <p style={emailStyle}>
            Attempted login with: <strong>{user.email}</strong>
          </p>
        )}
        <button
          onClick={logout}
          style={buttonStyle}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2b6cb0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4299e1')}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
