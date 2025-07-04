
import React from 'react';
import { SaleItem, SizeStock } from '../types';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Button } from './common/Button';
import { FiTrash2 } from 'react-icons/fi';

interface SaleItemRowProps {
  item: SaleItem;
  index: number;
  onUpdateItem: (index: number, updatedItem: SaleItem) => void;
  onRemoveItem: (index: number) => void;
}

export const SaleItemRow: React.FC<SaleItemRowProps> = ({ item, index, onUpdateItem, onRemoveItem }) => {
  const isManual = item.isManual || false;

  // For non-manual products, get stock info
  const selectedSizeStockInfo = !isManual && item.product ? item.product.sizes.find(s => s.size === item.selectedSize) : undefined;
  const currentSizeStock = selectedSizeStockInfo ? selectedSizeStockInfo.stock : (isManual ? Infinity : 0); // Manual items have infinite stock
  const isOutOfStock = !isManual && currentSizeStock === 0 && (item.product?.sizes?.length || 0) > 0; // True if selected size exists but has 0 stock

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity) || newQuantity < 1) {
      newQuantity = 1;
    }

    if (!isManual && newQuantity > currentSizeStock) {
        newQuantity = currentSizeStock;
        if (currentSizeStock > 0) { 
            alert(`Max quantity for ${item.product?.title} (Size: ${item.selectedSize}) is ${currentSizeStock} due to stock limits.`);
        }
    }
    onUpdateItem(index, { ...item, quantity: newQuantity, manualQuantity: isManual ? newQuantity : undefined });
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newDiscount = parseFloat(e.target.value);
    if (isNaN(newDiscount) || newDiscount < 0) {
      newDiscount = 0;
    }
    const basePrice = isManual ? (item.manualPrice || 0) : (item.product?.price || 0);
    const quantity = isManual ? (item.manualQuantity || 0) : (item.quantity || 0);
    const maxDiscount = basePrice * quantity;
    if (newDiscount > maxDiscount) newDiscount = maxDiscount;

    onUpdateItem(index, { ...item, discount: newDiscount, manualDiscount: isManual ? newDiscount : undefined });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value;
    const newSizeStockInfo = item.product?.sizes.find(s => s.size === newSize);
    const newSelectedSizeStock = newSizeStockInfo ? newSizeStockInfo.stock : 0;
    let newQuantity = item.quantity;
    if (newQuantity > newSelectedSizeStock) {
        newQuantity = newSelectedSizeStock > 0 ? 1 : 0; 
    }
    if(newSelectedSizeStock === 0 && newSizeStockInfo) { 
        newQuantity = 0;
    }
    onUpdateItem(index, { ...item, selectedSize: newSize, quantity: newQuantity });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateItem(index, { ...item, note: e.target.value });
  };

  const displayTitle = isManual ? item.manualTitle : item.product?.title;
  const displayPrice = isManual ? (item.manualPrice || 0) : (item.product?.price || 0);
  const displayQuantity = isManual ? (item.quantity || 0) : (item.quantity || 0);
  const displayDiscount = isManual ? (item.discount || 0) : (item.discount || 0);

  const finalPrice = (displayPrice * displayQuantity - displayDiscount).toFixed(2);

  const sizeOptions = !isManual && item.product?.sizes ? item.product.sizes.map((s: SizeStock) => ({
    value: s.size,
    label: `${s.size} (Stock: ${s.stock})`,
  })) : [];

  return (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 ${isOutOfStock ? 'opacity-70 bg-red-50' : ''}`}>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{displayTitle}</td>
      <td className="px-4 py-3">
        {isManual ? (
          <span className="text-gray-400">N/A</span>
        ) : (
          <img src={item.product?.image} alt={item.product?.title} className="w-12 h-12 object-cover rounded-md" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=No+Img')}/>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{isManual ? (item.manualCode || 'N/A') : item.product?.code}</td>
      <td className="px-4 py-3">
        {!isManual && item.product?.sizes && item.product.sizes.length > 0 ? (
          <Select
            value={item.selectedSize}
            onChange={handleSizeChange}
            options={sizeOptions}
            className="w-32 text-xs"
            disabled={item.product.sizes.length === 0}
          />
        ) : (
          <span className="text-sm text-gray-500">{isManual ? (item.manualSelectedSize || 'N/A') : (item.selectedSize || '-')}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          value={displayQuantity}
          onChange={handleQuantityChange}
          min="0"
          max={isManual ? undefined : (currentSizeStock > 0 ? currentSizeStock : 0)} 
          className="w-20 text-sm text-center"
          disabled={isOutOfStock && !isManual}
        />
         {!isManual && currentSizeStock > 0 && displayQuantity >= currentSizeStock && <p className="text-xs text-orange-500 mt-1">Max stock</p>}
         {!isManual && isOutOfStock && <p className="text-xs text-red-500 mt-1">Out of stock</p>}
         {!isManual && item.product?.sizes.length === 0 && <p className="text-xs text-gray-400 mt-1">No sizes</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">€{displayPrice.toFixed(2)}</td>
      <td className="px-4 py-3">
        <Input
          type="number"
          value={displayDiscount}
          onChange={handleDiscountChange}
          min="0"
          step="0.01"
          className="w-24 text-sm text-center"
          disabled={isOutOfStock && !isManual}
        />
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-indigo-600">€{finalPrice}</td>
      <td className="px-4 py-3">
        <Input
          type="text"
          value={item.note}
          onChange={handleNoteChange}
          placeholder="Optional note..."
          className="w-full text-xs"
          disabled={isOutOfStock && !isManual}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Button variant="ghost" size="sm" onClick={() => onRemoveItem(index)} aria-label="Remove item">
          <FiTrash2 className="text-red-500 hover:text-red-700" />
        </Button>
      </td>
    </tr>
  );
};