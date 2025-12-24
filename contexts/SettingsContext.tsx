
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Settings } from '../types';
import { getSettings, saveSettings as saveSettingsService } from '../services/dataService';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

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
    taxes: [{ id: '1', name: 'VAT', rate: 15 }],
    source: 'local',
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!activeCompanyId) {
          setLoading(false);
          setSettings(null);
          return;
      }

      setLoading(true);
      try {
        const firestoreSettings = await getSettings(activeCompanyId);
        if (firestoreSettings) {
          setSettings({ ...firestoreSettings, source: 'firestore' });
        } else {
            console.log('No settings in source. Seeding default settings for company:', activeCompanyId);
            await saveSettingsService(activeCompanyId, hardcodedDefaultSettings);
            setSettings({ ...hardcodedDefaultSettings, source: 'firestore' });
        }
      } catch (err: any) {
        console.warn("Could not load settings from Firestore. Error:", { message: err.message, code: err.code });
        addNotification("تعذّر تحميل الإعدادات من قاعدة البيانات.", "error");
        setSettings(hardcodedDefaultSettings);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [activeCompanyId, addNotification]);

  const updateSettings = async (newSettings: Omit<Settings, 'source'>) => {
    if (!activeCompanyId) throw new Error("No active company to save settings.");
    
    await saveSettingsService(activeCompanyId, newSettings);
    setSettings({ ...newSettings, source: 'firestore' });
  };
  
  // If still loading, show full-screen loader to avoid flashing UI
  if (loading) {
    return <div className="flex items-center justify-center h-screen">جاري تحميل الإعدادات...</div>;
  }

  // If there is no active company (e.g., before user selects/joins a company),
  // provide a safe local default so the app can render without blocking.
  if (!activeCompanyId || !settings) {
    const safeUpdate = async (_: Omit<Settings, 'source'>) => {
      throw new Error('Cannot save settings: no active company');
    };
    return (
      <SettingsContext.Provider value={{ settings: hardcodedDefaultSettings, loading: false, updateSettings: safeUpdate }}>
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
