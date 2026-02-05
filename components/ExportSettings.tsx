import React, { useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../src/ui/Button';
import { t } from '../src/i18n/t';

interface ExportSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (scale: number, format: 'pdf' | 'png' | 'jpg') => void;
  filenameBase: string;
}

const ExportSettings: React.FC<ExportSettingsProps> = ({
  isOpen,
  onClose,
  onExport,
  filenameBase,
}) => {
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(scale, format);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('exportSettingsTitle')}
    >
      <div className="space-y-6 py-4">
        {/* Scale Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('exportSettingsScale')}
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-right min-w-12">
              <div className="text-lg font-semibold text-primary-600">{scale}x</div>
              <div className="text-xs text-gray-500">
                {Math.round(scale * 96)} DPI
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p>• 1x - {Math.round(96)} DPI: {t('exportQualityLow')}</p>
            <p>• 2x - {Math.round(192)} DPI: {t('exportQualityMedium')}</p>
            <p>• 4x - {Math.round(384)} DPI: {t('exportQualityHigh')}</p>
          </div>
        </div>

        {/* Format Setting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('exportSettingsFormat')}
          </label>
          <div className="flex gap-3">
            {(
              [
                { value: 'pdf', label: t('exportFormatPdf') },
                { value: 'png', label: t('exportFormatPng') },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{
                  borderColor: format === option.value ? '#2563eb' : '#d1d5db',
                  backgroundColor:
                    format === option.value
                      ? 'rgba(37, 99, 235, 0.1)'
                      : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value={option.value}
                  checked={format === option.value}
                  onChange={(e) => setFormat(e.target.value as 'pdf' | 'png')}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* File Info */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          <div className="font-medium text-gray-900 dark:text-gray-200 mb-1">
            {t('exportPreview')}
          </div>
          <p>
            {filenameBase}.{format === 'pdf' ? 'pdf' : format === 'png' ? 'png' : 'jpg'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={exporting}
          >
            {t('exportCancel')}
          </Button>
          <Button
            onClick={handleExport}
            loading={exporting}
          >
            {t('exportDownload')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportSettings;
