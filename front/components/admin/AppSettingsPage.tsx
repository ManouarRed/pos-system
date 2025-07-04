
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FiSave, FiRefreshCw, FiUpload, FiDownload, FiMoon, FiSun } from 'react-icons/fi';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { productService } from '../../services/productService';

export const AppSettingsPage: React.FC = () => {
  const { t } = useLanguage();

  // Low Stock Configuration
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10); // Default value

  // UI Preferences
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);

  // Data Management
  const [backupFileName, setBackupFileName] = useState<string>('pos_backup.json');
  const [availableBackups, setAvailableBackups] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [backupRestoreMessage, setBackupRestoreMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const clearMessages = () => {
    setBackupRestoreMessage(null);
  };

  const fetchBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    clearMessages();
    try {
      const backups = await productService.listBackups();
      setAvailableBackups(backups);
      if (backups.length > 0) {
        setSelectedBackup(backups[0]); // Select the newest backup by default
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
      setBackupRestoreMessage({ type: 'error', message: t('settingsPage.fetchBackupsError') });
    } finally {
      setIsLoadingBackups(false);
    }
  }, [t]);

  useEffect(() => {
    // Load settings from localStorage or a global config if available
    const savedLowStock = localStorage.getItem('lowStockThreshold');
    if (savedLowStock) {
      setLowStockThreshold(Number(savedLowStock));
    }
    const savedDarkMode = localStorage.getItem('darkModeEnabled');
    if (savedDarkMode) {
      setDarkModeEnabled(savedDarkMode === 'true');
    }
    fetchBackups();
  }, [fetchBackups]);

  useEffect(() => {
    // Apply dark mode class to body
    if (darkModeEnabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkModeEnabled', String(darkModeEnabled));
  }, [darkModeEnabled]);

  const handleSaveSettings = () => {
    localStorage.setItem('lowStockThreshold', String(lowStockThreshold));
    localStorage.setItem('darkModeEnabled', String(darkModeEnabled));
    alert(t('settingsPage.saveSettingsSuccess'));
  };

  const handleResetSettings = () => {
    if (window.confirm(t('settingsPage.resetSettingsConfirm'))) {
      setLowStockThreshold(10); // Reset to default
      setDarkModeEnabled(false); // Reset to default
      localStorage.removeItem('lowStockThreshold');
      localStorage.removeItem('darkModeEnabled');
      alert(t('settingsPage.resetSettingsSuccess'));
    }
  };

  const handleBackupData = async () => {
    clearMessages();
    try {
      const response = await productService.createBackup();
      setBackupRestoreMessage({ type: 'success', message: t('settingsPage.backupDataSuccess', { fileName: response.filename }) });
      fetchBackups(); // Refresh list of backups
    } catch (error) {
      console.error("Backup failed:", error);
      setBackupRestoreMessage({ type: 'error', message: t('settingsPage.backupDataError', { error: error.message }) });
    }
  };

  const handleRestoreData = async () => {
    clearMessages();
    if (!selectedBackup) {
      setBackupRestoreMessage({ type: 'error', message: t('settingsPage.restoreDataNoFile') });
      return;
    }
    if (!window.confirm(t('settingsPage.restoreDataConfirm', { fileName: selectedBackup }))) {
      return;
    }

    try {
      const response = await productService.restoreBackup(selectedBackup);
      setBackupRestoreMessage({ type: 'success', message: t('settingsPage.restoreDataSuccess', { fileName: selectedBackup }) });
      // Optionally reload other data in the app if needed after restore
    } catch (error) {
      console.error("Restore failed:", error);
      setBackupRestoreMessage({ type: 'error', message: t('settingsPage.restoreDataError', { error: error.message }) });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t('adminPage.tabSettings')}</h2>
      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <p className="text-gray-700">{t('settingsPage.description')}</p>

        {backupRestoreMessage && (
          <div className={`p-3 rounded-md text-sm ${backupRestoreMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {backupRestoreMessage.message}
          </div>
        )}

        {/* Low Stock Configuration */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('settingsPage.lowStockConfigTitle')}</h3>
          <Input
            label={t('settingsPage.lowStockThresholdLabel')}
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Number(e.target.value))}
            min="0"
            placeholder="10"
          />
          <p className="text-sm text-gray-500 mt-2">{t('settingsPage.lowStockThresholdDescription')}</p>
        </div>

        {/* User Interface Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('settingsPage.uiPreferencesTitle')}</h3>
          <div className="flex items-center justify-between">
            <label htmlFor="darkModeToggle" className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  id="darkModeToggle"
                  className="sr-only"
                  checked={darkModeEnabled}
                  onChange={(e) => setDarkModeEnabled(e.target.checked)}
                />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
              </div>
              <div className="ml-3 text-gray-700 font-medium">
                {darkModeEnabled ? t('settingsPage.darkModeEnabled') : t('settingsPage.darkModeDisabled')}
              </div>
              <div className="ml-2 text-gray-500">
                {darkModeEnabled ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
              </div>
            </label>
          </div>
          <style>{`
            .dot {
              transform: translateX(0%);
            }
            input:checked ~ .dot {
              transform: translateX(100%);
              background-color: #4ade80; /* green-400 */
            }
            input:checked ~ .block {
              background-color: #22c55e; /* green-500 */
            }
            html.dark {
              background-color: #1a202c; /* Example dark background */
              color: #e2e8f0; /* Example dark text */
            }
            html.dark .bg-white {
              background-color: #2d3748; /* Darker background for cards */
            }
            html.dark .text-gray-700 {
              color: #e2e8f0;
            }
            html.dark .text-gray-800 {
              color: #f7fafc;
            }
            html.dark .text-gray-500 {
              color: #a0aec0;
            }
            html.dark .border-gray-200 {
              border-color: #4a5568;
            }
          `}</style>
        </div>

        {/* Data Management */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('settingsPage.dataManagementTitle')}</h3>
          <div className="space-y-4">
            <div>
              <Input
                label={t('settingsPage.backupFileNameLabel')}
                type="text"
                value={backupFileName}
                onChange={(e) => setBackupFileName(e.target.value)}
                placeholder="pos_backup.json"
              />
              <Button onClick={handleBackupData} variant="secondary" leftIcon={<FiDownload />} className="mt-2">
                {t('settingsPage.backupButton')}
              </Button>
            </div>
            <div>
              <Select
                label={t('settingsPage.restoreFileSelectLabel')}
                options={availableBackups.map(file => ({ value: file, label: file }))}
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                disabled={availableBackups.length === 0 || isLoadingBackups}
              />
              <Button onClick={handleRestoreData} variant="secondary" leftIcon={<FiUpload />} className="mt-2" disabled={!selectedBackup || isLoadingBackups}>
                {t('settingsPage.restoreButton')}
              </Button>
              {isLoadingBackups && <p className="text-sm text-gray-500 mt-2">{t('common.loading')} backups...</p>}
            </div>
          </div>
        </div>

        <div className="flex space-x-4 border-t border-gray-200 pt-6">
          <Button onClick={handleSaveSettings} variant="primary" leftIcon={<FiSave />}>
            {t('settingsPage.saveButton')}
          </Button>
          <Button onClick={handleResetSettings} variant="secondary" leftIcon={<FiRefreshCw />}>
            {t('settingsPage.resetButton')}
          </Button>
        </div>
      </div>
    </div>
  );
};
