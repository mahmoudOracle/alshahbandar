import React from 'react';
import { FullPageSpinner } from './Spinner';

/**
 * A full-screen loading indicator to be used when the application is in a loading state,
 * such as during initial authentication or when resolving user permissions.
 */
const LoadingScreen: React.FC = () => {
  return <FullPageSpinner />;
};

export default LoadingScreen;
