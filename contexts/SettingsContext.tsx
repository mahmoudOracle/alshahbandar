import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Settings } from '../types';
import { getSettings, saveSettings as saveSettingsService } from '../services/dataService';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { getErrorMessage } from '../src/utils/errorMessage';
import { LoadingScreen } from '../LoadingScreen';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  updateSettings: (newSettings: Omit<Settings, 'source'>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const hardcodedDefaultSettings: Settings = {
  businessName: 'Alshabandar Suite (Fallback)',
  slogan: 'Invoicing Simplified',
  address: '123 Developer Lane, Code City',
  contactInfo: 'contact@example.com',
  currency: 'USD',
  logo: '',
  invoiceFooter: '',
  language: 'ar',
  taxes: [{ id: '1', name: 'VAT', rate: 15 }],
  source: 'local',
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { companyId, authorized } = useAuth();
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!companyId || !authorized) {
        setLoading(false);
        setSettings(null);
        return;
      }

      setLoading(true);
      try {
        const firestoreSettings = await getSettings(companyId);
        if (firestoreSettings) {
          setSettings({ ...firestoreSettings, source: 'firestore' });
        } else {
          await saveSettingsService(companyId, hardcodedDefaultSettings);
          setSettings({ ...hardcodedDefaultSettings, source: 'firestore' });
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'تعذر تحميل الإعدادات من قاعدة البيانات.');
        console.warn('Could not load settings from Firestore. Error:', msg);
        addNotification(msg, 'error');
        setSettings(hardcodedDefaultSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [companyId, authorized, addNotification]);

  const updateSettings = async (newSettings: Omit<Settings, 'source'>) => {
    if (!companyId) throw new Error('No active company to save settings.');

    await saveSettingsService(companyId, newSettings);
    setSettings({ ...newSettings, source: 'firestore' });
  };

  if (loading) {
    return <LoadingScreen message="جاري تحميل الإعدادات..." />;
  }

  if (!companyId || !settings) {
    const safeUpdate = async (_: Omit<Settings, 'source'>) => {
      throw new Error('Cannot save settings: no active company');
    };
    return (
      <SettingsContext.Provider
        value={{ settings: hardcodedDefaultSettings, loading: false, updateSettings: safeUpdate }}
      >
        {children}
      </SettingsContext.Provider>
    );
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
