
import React, { useState, useEffect } from 'react';
import { Category, Manufacturer } from '../../types';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

interface ProductBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { categoryId?: string; manufacturerId?: string; isVisible?: boolean }) => void;
  categories: Category[];
  manufacturers: Manufacturer[];
  productsCount: number;
}

export const ProductBulkEditModal: React.FC<ProductBulkEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  manufacturers,
  productsCount,
}) => {
  const [applyCategoryChange, setApplyCategoryChange] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const [applyManufacturerChange, setApplyManufacturerChange] = useState(false);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');

  const [applyVisibilityChange, setApplyVisibilityChange] = useState(false);
  const [selectedIsVisible, setSelectedIsVisible] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setApplyCategoryChange(false);
      setSelectedCategoryId(categories.length > 0 ? categories[0].id : '');
      setApplyManufacturerChange(false);
      setSelectedManufacturerId(manufacturers.length > 0 ? manufacturers[0].id : '');
      setApplyVisibilityChange(false);
      setSelectedIsVisible(true);
    }
  }, [isOpen, categories, manufacturers]);

  const handleSave = () => {
    const updates: { categoryId?: string; manufacturerId?: string; isVisible?: boolean } = {};
    if (applyCategoryChange) updates.categoryId = selectedCategoryId;
    if (applyManufacturerChange) updates.manufacturerId = selectedManufacturerId;
    if (applyVisibilityChange) updates.isVisible = selectedIsVisible;

    if (Object.keys(updates).length === 0) {
        alert("Please select at least one property to change and specify its new value.");
        return;
    }
    onSave(updates);
  };

  if (!isOpen) return null;

  const categoryOptions = categories.map(cat => ({ value: cat.id, label: cat.name }));
  const manufacturerOptions = manufacturers.map(man => ({ value: man.id, label: man.name }));
  const visibilityOptions = [
    { value: 'true', label: 'Visible' },
    { value: 'false', label: 'Hidden' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Bulk Edit {productsCount} Product(s)</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="space-y-6">
          {/* Category Update Section */}
          <div className="p-4 border rounded-md">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="applyCategoryChange"
                checked={applyCategoryChange}
                onChange={(e) => setApplyCategoryChange(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
              />
              <label htmlFor="applyCategoryChange" className="font-medium text-gray-700">Change Category</label>
            </div>
            {applyCategoryChange && (
              <Select
                label="New Category"
                options={categoryOptions}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={categories.length === 0}
              />
            )}
          </div>

          {/* Manufacturer Update Section */}
          <div className="p-4 border rounded-md">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="applyManufacturerChange"
                checked={applyManufacturerChange}
                onChange={(e) => setApplyManufacturerChange(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
              />
              <label htmlFor="applyManufacturerChange" className="font-medium text-gray-700">Change Manufacturer</label>
            </div>
            {applyManufacturerChange && (
              <Select
                label="New Manufacturer"
                options={manufacturerOptions}
                value={selectedManufacturerId}
                onChange={(e) => setSelectedManufacturerId(e.target.value)}
                disabled={manufacturers.length === 0}
              />
            )}
          </div>

          {/* Visibility Update Section */}
          <div className="p-4 border rounded-md">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="applyVisibilityChange"
                checked={applyVisibilityChange}
                onChange={(e) => setApplyVisibilityChange(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
              />
              <label htmlFor="applyVisibilityChange" className="font-medium text-gray-700">Change Visibility</label>
            </div>
            {applyVisibilityChange && (
              <Select
                label="New Visibility Status"
                options={visibilityOptions}
                value={selectedIsVisible ? 'true' : 'false'}
                onChange={(e) => setSelectedIsVisible(e.target.value === 'true')}
              />
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Apply Changes</Button>
        </div>
      </div>
    </div>
  );
};