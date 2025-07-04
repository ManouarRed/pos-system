import React, { useState, useEffect, useMemo } from 'react';
import { SubmittedSale, SaleItemRecord, PaymentMethod, Product, SizeStock } from '../../types';
import { productService } from '../../services/productService';
import { PAYMENT_METHODS } from '../../constants';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { TrashIcon } from '../icons/TrashIcon'; // If allowing item removal

interface SaleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSaleData: SubmittedSale) => void;
  sale: SubmittedSale;
  allProducts: Product[]; // To check current stock
}

export const SaleEditModal: React.FC<SaleEditModalProps> = ({ isOpen, onClose, onSave, sale, allProducts }) => {
  const [editableSaleItems, setEditableSaleItems] = useState<SaleItemRecord[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod);
  const [overallNotes, setOverallNotes] = useState<string>(sale.notes || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({}); // For item-level errors e.g. item_{index}_quantity

  useEffect(() => {
    if (isOpen) {
      setEditableSaleItems(JSON.parse(JSON.stringify(sale.items))); // Deep copy
      setPaymentMethod(sale.paymentMethod);
      setOverallNotes(sale.notes || '');
      setFormErrors({});
    }
  }, [isOpen, sale]);

  const getProductCurrentStock = (productId: string, sizeName: string): number => {
    const product = allProducts.find(p => p.id === productId);
    if (product && product.sizes) {
      const sizeEntry = product.sizes.find(s => s.size === sizeName);
      return sizeEntry ? sizeEntry.stock : 0;
    }
    return 0; 
  };

  const handleItemChange = (index: number, field: keyof SaleItemRecord, value: string | number) => {
    const newItems = [...editableSaleItems];
    const item = newItems[index];
    
    let numValue = 0;
    if (field === 'quantity' || field === 'discount' || field === 'unitPrice') {
        numValue = parseFloat(String(value));
        if (isNaN(numValue)) numValue = 0;
    }

    if (field === 'quantity') {
        item.quantity = numValue > 0 ? numValue : 1;
        
        const originalSaleQuantity = sale.items[index]?.quantity || 0;
        const currentProductStock = getProductCurrentStock(item.productId, item.selectedSize);
        const maxAllowedQuantity = currentProductStock + originalSaleQuantity;

        if (item.quantity > maxAllowedQuantity) {
            item.quantity = maxAllowedQuantity;
            setFormErrors(prev => ({ ...prev, [`item_${index}_quantity`]: `Max: ${maxAllowedQuantity} (current stock + original sale qty)` }));
        } else {
            setFormErrors(prev => ({ ...prev, [`item_${index}_quantity`]: '' }));
        }

    } else if (field === 'discount') {
        item.discount = numValue >= 0 ? numValue : 0;
        const itemTotalBeforeDiscount = item.unitPrice * item.quantity;
        if (item.discount > itemTotalBeforeDiscount) {
            item.discount = itemTotalBeforeDiscount;
        }
    } else if (field === 'unitPrice') {
        item.unitPrice = numValue >=0 ? numValue : 0;
    }
    
    item.finalPrice = (item.unitPrice * item.quantity) - item.discount;
    setEditableSaleItems(newItems);
  };


  const calculatedTotalAmount = useMemo(() => {
    return editableSaleItems.reduce((sum, item) => sum + item.finalPrice, 0);
  }, [editableSaleItems]);

  const handleSubmit = () => {
    if (editableSaleItems.some(item => item.quantity <= 0 && (getProductCurrentStock(item.productId, item.selectedSize) + (sale.items.find(si => si.productId === item.productId && si.selectedSize === item.selectedSize)?.quantity || 0)) > 0 )) {
        alert("Item quantity must be greater than 0 unless the product is completely out of stock (including amounts from this sale).");
        return;
    }
    if (Object.values(formErrors).some(err => err !== '')) {
        alert("Please correct the errors in the form.");
        return;
    }

    const updatedSaleData: SubmittedSale = {
      ...sale,
      items: editableSaleItems,
      paymentMethod: paymentMethod,
      totalAmount: calculatedTotalAmount, 
      submissionDate: sale.submissionDate, 
      notes: overallNotes,
    };
    onSave(updatedSaleData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-edit-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 id="sale-edit-modal-title" className="text-xl font-semibold text-gray-800">
            Edit Sale (ID: {sale.id.substring(sale.id.length - 8)})
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <p className="text-sm text-gray-500">Sale Date</p>
                <p className="font-medium text-gray-700">{new Date(sale.submissionDate).toLocaleString()}</p>
            </div>
             <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                options={PAYMENT_METHODS}
                containerClassName="w-full"
            />
          </div>

          <h3 className="text-lg font-medium text-gray-700 mb-2">Items</h3>
          {editableSaleItems.length > 0 ? (
            <div className="space-y-3">
              {editableSaleItems.map((item, index) => (
                <div key={`${item.productId}-${item.selectedSize}-${index}`} className="p-3 border rounded-md bg-gray-50 space-y-2">
                  <p className="font-semibold text-sm text-indigo-700">{item.title} <span className="text-xs text-gray-500">({item.code})</span></p>
                  {item.selectedSize && <p className="text-xs text-gray-500">Size: {item.selectedSize}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <Input
                      label="Quantity"
                      type="number"
                      min="0" // Allow 0 for out of stock
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      error={formErrors[`item_${index}_quantity`]}
                      containerClassName="text-xs"
                      className="text-xs"
                    />
                    <Input
                      label="Unit Price (€)"
                      type="number"
                      value={item.unitPrice.toFixed(2)}
                      readOnly 
                      containerClassName="text-xs"
                      className="text-xs read-only:bg-gray-200"
                    />
                    <Input
                      label="Discount (€)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                      containerClassName="text-xs"
                      className="text-xs"
                    />
                    <div className="text-xs">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Item Total (€)</label>
                        <p className="font-semibold text-gray-700 p-2 border border-gray-300 rounded-md bg-gray-100">
                            {item.finalPrice.toFixed(2)}
                        </p>
                    </div>
                  </div>
                   {formErrors[`item_${index}_quantity`] && <p className="text-xs text-red-500 mt-1">{formErrors[`item_${index}_quantity`]}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No items in this sale.</p>}
          
          <div>
            <label htmlFor="overallNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Overall Sale Notes (Optional)
            </label>
            <textarea
                id="overallNotes"
                name="overallNotes"
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                placeholder="Any overall notes for this sale..."
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
            <div className="flex flex-col sm:flex-row justify-between items-center">
                <p className="text-xl font-semibold text-gray-800">
                    New Total: <span className="text-indigo-600">€{calculatedTotalAmount.toFixed(2)}</span>
                </p>
                <div className="flex space-x-3 mt-3 sm:mt-0">
                    <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                    </Button>
                    <Button type="button" variant="primary" onClick={handleSubmit}>
                    Save Changes
                    </Button>
                </div>
            </div>
             <p className="text-xs text-orange-600 mt-3">
                Note: If quantities are changed, corresponding stock adjustments should be handled by a separate process or backend logic. This modal primarily updates sale record details.
            </p>
        </div>
      </div>
    </div>
  );
};