import React, { useState } from 'react';
import React, { useState } from 'react';
import { Product } from '../../types';
import { Button } from '../common/Button';
import { FiEdit, FiTrash2, FiEye, FiEyeOff, FiCopy } from 'react-icons/fi';
import { ZoomModal } from '../common/ZoomModal'; // Import ZoomModal

interface ProductTableProps {
  products: Product[];
  selectedProductIds: string[];
  onSelectProduct: (productId: string, isSelected: boolean) => void;
  onSelectAllProducts: (isSelected: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleVisibility: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  readOnly?: boolean;
  currentPageProducts: Product[];
  sortConfig: { key: keyof Product | 'totalStock'; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof Product | 'totalStock') => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedProductIds,
  onSelectProduct,
  onSelectAllProducts,
  onEdit,
  onDelete,
  onToggleVisibility,
  onDuplicate,
  readOnly = false,
  currentPageProducts,
  sortConfig,
  requestSort,
}) => {
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const allOnPageSelected = currentPageProducts.length > 0 && currentPageProducts.every(p => selectedProductIds.includes(p.id));

  if (products.length === 0) {
    return <p className="text-center text-gray-500 py-8">No products found.</p>;
  }

  const getSortIndicator = (key: keyof Product | 'totalStock') => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {!readOnly && (
              <th scope="col" className="p-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={allOnPageSelected}
                  onChange={(e) => onSelectAllProducts(e.target.checked)}
                  aria-label="Select all products on this page"
                />
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('title')}>Title {getSortIndicator('title')}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('price')}>Price {getSortIndicator('price')}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalStock')}>Stock {getSortIndicator('totalStock')}</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visible</th>
            {!readOnly && <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className={`hover:bg-gray-50 ${selectedProductIds.includes(product.id) ? 'bg-blue-50' : ''}`}>
              {!readOnly && (
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    value={product.id}
                    checked={selectedProductIds.includes(product.id)}
                    onChange={(e) => onSelectProduct(product.id, e.target.checked)}
                    aria-label={`Select product ${product.title}`}
                  />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div
                  className="relative w-[44px] h-[55px] cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredImage(product.fullSizeImage);
                    setShowZoom(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setZoomPosition({ x: rect.right, y: rect.top + rect.height / 2 });
                  }}
                  onMouseLeave={() => {
                    setHoveredImage(null);
                    setShowZoom(false);
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/44x55?text=No+Img')}
                  />
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.title}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categoryName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.manufacturerName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{product.price.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.totalStock ?? 0}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => !readOnly && onToggleVisibility(product)}
                  disabled={readOnly}
                >
                  {product.isVisible ? <FiEye className="text-green-500" /> : <FiEyeOff className="text-gray-400" />}
                </Button>
              </td>
              {!readOnly && (
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  <Button variant="icon" size="sm" onClick={() => onEdit(product)}><FiEdit /></Button>
                  <Button variant="icon" size="sm" onClick={() => onDuplicate(product)}><FiCopy /></Button>
                  <Button variant="icon" size="sm" onClick={() => onDelete(product.id)}><FiTrash2 /></Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {showZoom && hoveredImage && (
        <ZoomModal imageUrl={hoveredImage} position={zoomPosition} onClose={() => setShowZoom(false)} />
      )}
    </div>
  );
};