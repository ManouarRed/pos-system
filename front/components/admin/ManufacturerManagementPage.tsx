
import React, { useState, useEffect, useCallback } from 'react';
import { Manufacturer } from '../../types';
import { productService } from '../../services/productService';
import { Button } from '../common/Button';
import { FiPlus } from 'react-icons/fi';
import { ManufacturerTable } from './ManufacturerTable';
import { ManufacturerFormModal } from './ManufacturerFormModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { FullScreenLoader } from '../common/FullScreenLoader';

export const ManufacturerManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  }

  const loadManufacturers = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const fetchedManufacturers = await productService.fetchManufacturers();
      setManufacturers(fetchedManufacturers);
    } catch (err) {
      console.error("Failed to load manufacturers:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('common.manufacturer', {count: 2}).toLowerCase() }));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadManufacturers();
  }, [loadManufacturers]);

  const handleOpenAddModal = () => {
    clearMessages();
    setEditingManufacturer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (manufacturer: Manufacturer) => {
    clearMessages();
    setEditingManufacturer(manufacturer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingManufacturer(null);
  };

  const handleSaveManufacturer = async (manufacturerData: Omit<Manufacturer, 'id'> | Manufacturer) => {
    clearMessages();
    setIsLoading(true);
    try {
      if ('id' in manufacturerData && manufacturerData.id) { 
        const updatedManufacturer = await productService.updateManufacturerAdmin(manufacturerData as Manufacturer);
        if (updatedManufacturer) {
          // setManufacturers(prev => prev.map(m => m.id === updatedManufacturer.id ? updatedManufacturer : m));
          setSuccessMessage(t('common.success') + ": " + t('common.manufacturer') + " " + t('common.edit', {count: 1}).toLowerCase() + "!");
        } else {
          throw new Error(t('errors.apiErrorGeneric', { message: "Update operation returned undefined."}));
        }
      } else { 
        await productService.addManufacturerAdmin(manufacturerData as Omit<Manufacturer, 'id'>);
        setSuccessMessage(t('common.success') + ": " + t('common.manufacturer') + " " + t('common.add', {count: 1}).toLowerCase() + "!");
      }
      await loadManufacturers();
      handleCloseModal();
    } catch (err) {
      console.error("Error saving manufacturer:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: t('common.manufacturer').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteManufacturer = async (manufacturerId: string) => {
    clearMessages();
    const manufacturerToDelete = manufacturers.find(m => m.id === manufacturerId);
    if (window.confirm(t('common.confirm') + ` ${t('common.delete').toLowerCase()} "${manufacturerToDelete?.name || 'manufacturer'}"? ${t('common.cannotBeUndone')}`)) {
        setIsLoading(true);
      try {
        const result = await productService.deleteManufacturerAdmin(manufacturerId);
        if (result.success) {
          setSuccessMessage(result.message || t('common.success') + ": " + t('common.manufacturer') + " " + t('common.delete', {count: 1}).toLowerCase() + "!");
          await loadManufacturers();
        } else {
          setActionError(result.message || t('errors.failedToLoadData', { entity: t('common.manufacturer').toLowerCase() }));
        }
      } catch (err) {
        console.error("Error deleting manufacturer:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('common.manufacturer').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
          setIsLoading(false);
      }
    }
  };
  
  const MessageDisplay = () => {
    if (actionError) return <p className="text-center text-red-500 py-4 bg-red-50 rounded-md my-4">{actionError}</p>;
    if (successMessage) return <p className="text-center text-green-500 py-4 bg-green-50 rounded-md my-4">{successMessage}</p>;
    return null;
  }

  if (isLoading && manufacturers.length === 0 && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }


  return (
    <div className="space-y-6">
      <MessageDisplay />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">{t('adminPage.tabManufacturers')}</h2>
        <Button onClick={handleOpenAddModal} variant="primary" leftIcon={<FiPlus />} disabled={isLoading}>
          {t('common.addNew')} {t('common.manufacturer').toLowerCase()}
        </Button>
      </div>

      {isLoading && manufacturers.length > 0 && <p className="text-center text-gray-500 py-4">{t('common.loading')} {t('common.manufacturer', { count: 2 }).toLowerCase()}...</p>}

      <ManufacturerTable
        manufacturers={manufacturers}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteManufacturer}
      />

      {isModalOpen && (
        <ManufacturerFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveManufacturer}
          manufacturer={editingManufacturer}
          key={editingManufacturer ? editingManufacturer.id : 'new-manufacturer-modal'}
        />
      )}
    </div>
  );
};
