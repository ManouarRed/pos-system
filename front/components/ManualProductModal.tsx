import React, { useState, useEffect } from 'react';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { useLanguage } from '../contexts/LanguageContext';

interface ManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { title: string; code: string; price: number; quantity: number; discount: number; selectedSize: string }) => void;
}

export const ManualProductModal: React.FC<ManualProductModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState<number | string>('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [discount, setDiscount] = useState<number | string>(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCode('');
      setPrice('');
      setQuantity(1);
      setDiscount(0);
      setSelectedSize('');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    setError(null);
    const parsedPrice = parseFloat(String(price));
    const parsedQuantity = parseInt(String(quantity), 10);
    const parsedDiscount = parseFloat(String(discount));

    if (!title.trim()) {
      setError(t('manualProductModal.titleRequired'));
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError(t('manualProductModal.invalidPrice'));
      return;
    }
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError(t('manualProductModal.invalidQuantity'));
      return;
    }
    if (isNaN(parsedDiscount) || parsedDiscount < 0) {
      setError(t('manualProductModal.invalidDiscount'));
      return;
    }

    onSave({
      title: title.trim(),
      code: code.trim(),
      price: parsedPrice,
      quantity: parsedQuantity,
      discount: parsedDiscount,
      selectedSize: selectedSize.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('manualProductModal.title')}</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        
        <div className="space-y-4 mb-6">
          <Input
            label={t('manualProductModal.productNameLabel')}
            id="manualProductName"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('manualProductModal.productNamePlaceholder')}
            required
          />
          <Input
            label={t('manualProductModal.codeLabel')}
            id="manualProductCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('manualProductModal.codePlaceholder')}
          />
          <Input
            label={t('manualProductModal.priceLabel')}
            id="manualProductPrice"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
          />
          <Input
            label={t('manualProductModal.quantityLabel')}
            id="manualProductQuantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            required
          />
          <Input
            label={t('manualProductModal.discountLabel')}
            id="manualProductDiscount"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          <Input
            label={t('manualProductModal.sizeLabel')}
            id="manualProductSize"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            placeholder={t('manualProductModal.sizePlaceholder')}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('common.add')}
          </Button>
        </div>
      </div>
    </div>
  );
};