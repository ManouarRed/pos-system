
import React, { useState, useEffect } from 'react';
import { Product, SizeStock } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface InventoryStockEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, updatedSizeStocks: SizeStock[]) => void;
  product: Product | null;
}

export const InventoryStockEditModal: React.FC<InventoryStockEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
}) => {
  const [editableSizeStocks, setEditableSizeStocks] = useState<SizeStock[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({}); // key: sizeName, value: error message

  useEffect(() => {
    if (isOpen && product) {
      // Deep copy to avoid mutating original product state directly
      setEditableSizeStocks(JSON.parse(JSON.stringify(product.sizes || [])));
      setFormErrors({});
    }
  }, [isOpen, product]);

  const handleStockChange = (sizeName: string, newStockValue: string) => {
    const newStock = parseInt(newStockValue, 10);
    setEditableSizeStocks(prev =>
      prev.map(ss => {
        if (ss.size === sizeName) {
          if (isNaN(newStock) || newStock < 0) {
            setFormErrors(fe => ({...fe, [sizeName]: "Stock must be a non-negative number."}));
            // Keep current value in input, but don't update internal state to an invalid number
            return { ...ss, stock: ss.stock }; // Or provide a way to show input is invalid, e.g. visual
          } else {
            setFormErrors(fe => ({...fe, [sizeName]: ''})); // Clear error
            return { ...ss, stock: newStock };
          }
        }
        return ss;
      })
    );
  };
  
  // Getter for input display that allows invalid intermediate states but tracks errors
  const getStockInputValue = (sizeName: string): string => {
    const sizeStock = editableSizeStocks.find(ss => ss.size === sizeName);
    return sizeStock ? String(sizeStock.stock) : '0';
  }


  const handleSave = () => {
    const hasErrors = Object.values(formErrors).some(err => err !== '');
    if (hasErrors) {
        alert("Please correct the errors in stock values before saving.");
        return;
    }

    if (product) {
      onSave(product.id, editableSizeStocks);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-800">Edit Stock for: {product.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {editableSizeStocks.length === 0 && (
            <p className="text-gray-500 text-sm">This product has no defined sizes. Stock cannot be edited here.</p>
          )}
          {editableSizeStocks.map((sizeStock) => (
            <div key={sizeStock.size} className="flex items-center justify-between space-x-3">
              <span className="text-sm font-medium text-gray-700 flex-1">Size: {sizeStock.size}</span>
              <Input
                type="number"
                id={`stock-${product.id}-${sizeStock.size}`}
                value={getStockInputValue(sizeStock.size)}
                onChange={(e) => handleStockChange(sizeStock.size, e.target.value)}
                min="0"
                containerClassName="w-32"
                className="text-sm text-center"
                error={formErrors[sizeStock.size]}
                aria-label={`Stock for size ${sizeStock.size}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={editableSizeStocks.length === 0 || Object.values(formErrors).some(e => e !== '')}>
            Save Stock Changes
          </Button>
        </div>
      </div>
    </div>
  );
};