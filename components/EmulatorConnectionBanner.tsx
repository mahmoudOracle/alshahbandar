import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080; // Default Firestore emulator port

const EmulatorConnectionBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const checkEmulatorStatus = async () => {
      // Only show banner in development and if emulators are intended to be used
      if (import.meta.env.PROD || import.meta.env.VITE_USE_EMULATORS !== 'true') {
        setLoading(false);
        setShowBanner(false);
        return;
      }

      try {
        // Attempt to connect to a known emulator endpoint
        // Firestore emulator exposes a /_inspector/ endpoint or just its base URL
        const response = await fetch(`http://${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}/`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          setShowBanner(false);
        } else {
          setShowBanner(true);
        }
      } catch (error) {
        console.warn('[EmulatorConnectionBanner] Firestore emulator unreachable:', error);
        setShowBanner(true);
      } finally {
        setLoading(false);
      }
    };

    // Check immediately and then every few seconds
    checkEmulatorStatus();
    interval = setInterval(checkEmulatorStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading || !showBanner) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white p-2 flex items-center justify-center text-sm font-medium">
      <ExclamationTriangleIcon className="h-5 w-5 me-2" />
      <span>Firebase Emulators are not running. Please run `npm run dev:emu` in your terminal.</span>
    </div>
  );
};

export default EmulatorConnectionBanner;
