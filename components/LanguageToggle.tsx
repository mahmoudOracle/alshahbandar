import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './ui/Button';
import { t } from '../src/i18n/t';

const LanguageToggle: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const lang = (settings && settings.language) || 'ar';

  const setLang = async (l: 'ar' | 'en') => {
    try {
      await updateSettings({
        ...settings!,
        language: l,
      });
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  return (
    <div className="flex gap-2 items-center justify-center mt-2">
      <Button
        variant={lang === 'ar' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setLang('ar')}
        aria-label={t('languageArabic')}
      >
        {t('languageArabic')}
      </Button>
      <Button
        variant={lang === 'en' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setLang('en')}
        aria-label="English"
      >
        EN
      </Button>
    </div>
  );
};

export default LanguageToggle;
