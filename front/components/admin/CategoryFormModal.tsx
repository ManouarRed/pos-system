
import React, { useState, useEffect } from 'react';
import { Category } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: Omit<Category, 'id'> | Category) => void;
  category: Category | null; // Category to edit, or null for new category
}

const initialFormData: { name: string } = {
  name: '',
};

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, category }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (category && isOpen) {
      setFormData({ name: category.name });
    } else if (!category && isOpen) {
      setFormData(initialFormData);
    }
    if (isOpen) {
      setFormError(null); // Clear errors when modal opens
    }
  }, [category, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ name: e.target.value });
    if (formError) setFormError(null); // Clear error on change
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError("Category name is required.");
      return false;
    }
    // Potentially check for duplicate category names here if needed
    setFormError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      if (category) { // Editing existing category
        onSave({ ...category, name: formData.name });
      } else { // Adding new category
        onSave({ name: formData.name });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 id="category-modal-title" className="text-xl font-semibold text-gray-800">
            {category ? 'Edit Category' : 'Add New Category'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={formError || undefined}
            required
            autoFocus
          />
          <div className="pt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {category ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};