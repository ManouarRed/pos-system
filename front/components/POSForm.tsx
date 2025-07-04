
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, SaleItem, Category, PaymentMethod, SaleItemWithFinalPrice, SizeStock } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { productService } from '../services/productService';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Button } from './common/Button';
import { SaleItemRow } from './SaleItemRow';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { ManualProductModal } from './ManualProductModal'; // Import the new modal
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique IDs
import { useLanguage } from '../contexts/LanguageContext'; // Import useLanguage

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

const ALL_CATEGORIES_ID = "All Categories"; 

export const POSForm: React.FC = () => {
  const { t } = useLanguage(); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState<boolean>(false);
  
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For submit sale loading state
  const [isManualProductModalOpen, setIsManualProductModalOpen] = useState<boolean>(false); // State for manual product modal

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      setCategoryError(null);
      try {
        const fetchedCategoriesResponse = await productService.fetchCategories();
        setCategories(fetchedCategoriesResponse.items);
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategoryError(t('errors.failedToLoadData', { entity: t('common.category', {count: 2}) }));
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, [t]);

  const debouncedSearch = useCallback(
    debounce(async (term: string, categoryIdToSearch: string) => {
      if (term.trim().length < 2 && categoryIdToSearch === ALL_CATEGORIES_ID) { 
        setSearchResults([]);
        setIsLoadingSearch(false);
        setShowSearchResults(false);
        return;
      }
      setIsLoadingSearch(true);
      try {
        // productService.fetchProducts now expects categoryId or null/undefined
        const results = await productService.fetchProducts(term, categoryIdToSearch === ALL_CATEGORIES_ID ? undefined : categoryIdToSearch);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Error fetching products:", error);
        setSearchResults([]);
        // Optionally set an error message for product search
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm, selectedCategoryId);
  }, [searchTerm, selectedCategoryId, debouncedSearch]);

  const addProductToSale = (product: Product) => {
    if ((product.totalStock ?? 0) === 0) {
      alert(t('posForm.outOfStockTooltip', { productTitle: product.title }));
      return;
    }

    let defaultSizeInfo: SizeStock | undefined = product.sizes.find(s => s.stock > 0);
    if (!defaultSizeInfo && product.sizes.length > 0) {
      defaultSizeInfo = product.sizes[0]; // Fallback to first size if all are 0 stock
    }
    
    const defaultSizeName = defaultSizeInfo ? defaultSizeInfo.size : '';
    const defaultSizeStock = defaultSizeInfo ? defaultSizeInfo.stock : 0;

    if (defaultSizeStock === 0 && defaultSizeInfo) { // Explicitly out of stock for the chosen default size
         alert(t('posForm.productOutOfStockWithSize', { productTitle: product.title, sizeName: defaultSizeName }));
         return;
    }
     if (!defaultSizeInfo && product.sizes.length > 0) { // No sizes defined or all somehow invalid
        alert(t('posForm.productNoSizesWithStock', { productTitle: product.title }));
        return;
    }
     if (product.sizes.length === 0) { // No sizes at all
        alert(t('posForm.productNoSizesWithStock', { productTitle: product.title }));
        return;
    }


    const existingItemIndex = saleItems.findIndex(item => item.product?.id === product.id && item.selectedSize === defaultSizeName);
    
    if (existingItemIndex > -1) {
        const existingItem = saleItems[existingItemIndex];
        // const selectedSizeStockInfo = product.sizes.find(s => s.size === existingItem.selectedSize);
        // const currentSelectedSizeStock = selectedSizeStockInfo ? selectedSizeStockInfo.stock : 0;
        // Max stock is actually the product's stock for that size in the DB, not just what's left locally
        const actualProductSizeStock = product.sizes.find(s => s.size === defaultSizeName)?.stock ?? 0;


        if(existingItem.quantity < actualProductSizeStock) { 
            updateSaleItem(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
        } else {
            alert(t('posForm.maxStockReached', { stockCount: actualProductSizeStock, productTitle: product.title, sizeInfo: defaultSizeName ? ` (Size: ${defaultSizeName})` : '' }));
        }
    } else {
        if (defaultSizeStock > 0 || product.sizes.length === 0) { // Add if stock or no sizes (assume infinite for no-size items)
            const newSaleItem: SaleItem = {
              id: uuidv4(), // Use uuid for unique ID
              product, 
              selectedSize: defaultSizeName,
              quantity: 1,
              discount: 0,
              note: '',
            };
            setSaleItems(prevItems => [...prevItems, newSaleItem]);
        } else {
             alert(t('posForm.productOutOfStockWithSize', { productTitle: product.title, sizeName: defaultSizeName }));
             return;
        }
    }
    setSearchTerm(''); 
    setSearchResults([]); 
    setShowSearchResults(false); 
    setSubmissionStatus(null); 
  };

  const handleSaveManualProduct = (manualProductData: { title: string; code: string; price: number; quantity: number; discount: number; selectedSize: string }) => {
    const newSaleItem: SaleItem = {
      id: uuidv4(), // Unique ID for manual product
      isManual: true,
      title: manualProductData.title, // Ensure title is set for manual products
      code: manualProductData.code, // Ensure code is set for manual products
      manualTitle: manualProductData.title,
      manualCode: manualProductData.code,
      manualPrice: manualProductData.price,
      manualQuantity: manualProductData.quantity,
      manualDiscount: manualProductData.discount,
      manualSelectedSize: manualProductData.selectedSize,
      selectedSize: manualProductData.selectedSize || 'N/A', // Use provided size or default
      quantity: manualProductData.quantity,
      discount: manualProductData.discount,
      note: '',
    };
    setSaleItems(prevItems => [...prevItems, newSaleItem]);
    setIsManualProductModalOpen(false);
    setSubmissionStatus(null);
  };

  const updateSaleItem = (index: number, updatedItem: SaleItem) => {
    setSaleItems(prevItems => prevItems.map((item, i) => (i === index ? updatedItem : item)));
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  const saleItemsWithFinalPrice: SaleItemWithFinalPrice[] = useMemo(() => {
    return saleItems.map(item => {
      const basePrice = item.isManual ? item.manualPrice! : item.product!.price;
      const quantity = item.isManual ? item.manualQuantity! : item.quantity;
      const discount = item.isManual ? item.manualDiscount! : item.discount;
      return {
        ...item,
        finalPrice: basePrice * quantity - discount,
      };
    });
  }, [saleItems]);

  const totalAmount = useMemo(() => {
    return saleItemsWithFinalPrice.reduce((sum, item) => sum + item.finalPrice, 0);
  }, [saleItemsWithFinalPrice]);

  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      setSubmissionStatus({ type: 'error', message: t('posForm.emptySaleError') });
      return;
    }
    
    setIsSubmitting(true); 
    setSubmissionStatus(null); 
    
    try {
      // Stock update on backend will be part of submitSaleToHistory
      // The backend should handle stock reduction atomically with sale creation.
      await productService.submitSaleToHistory(saleItems, totalAmount, paymentMethod);
      
      setSubmissionStatus({ type: 'success', message: t('posForm.saleSuccessMessage') });
      setSaleItems([]);
      setSearchTerm('');
      setShowSearchResults(false);
      setSelectedCategoryId(ALL_CATEGORIES_ID);
      setPaymentMethod(PAYMENT_METHODS[0]);
      // Optionally refetch products if stock changes are significant for the POS view
      // debouncedSearch(searchTerm, selectedCategoryId); // This might be too quick or not needed
      setTimeout(() => setSubmissionStatus(null), 5000);

    } catch (error) {
      console.error("Error submitting sale:", error);
      const errorMessage = error instanceof Error ? error.message : t('posForm.saleErrorMessage');
      setSubmissionStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSale = () => {
    if (saleItems.length === 0 && searchTerm === '' && selectedCategoryId === ALL_CATEGORIES_ID) return; 

    const confirmClear = window.confirm(t('posForm.confirmClearSale'));
    if (confirmClear) {
      setSaleItems([]);
      setSearchTerm('');
      setSelectedCategoryId(ALL_CATEGORIES_ID);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setSearchResults([]);
      setShowSearchResults(false);
      setSubmissionStatus(null);
    }
  };

  const categoryOptions = useMemo(() => {
    return [
      { value: ALL_CATEGORIES_ID, label: t('posForm.allCategoriesOption') },
      ...categories.map(cat => ({ value: cat.id, label: cat.name }))
    ];
  }, [categories, t]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl space-y-6"> 
      {submissionStatus && (
        <div className="${submissionStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} p-4 rounded-md text-sm mb-4" role="alert">
          {submissionStatus.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {isLoadingCategories ? (
            <p className="text-sm text-gray-500 md:col-span-1">{t('common.loading')} {t('common.category', {count: 2}).toLowerCase()}...</p>
        ) : categoryError ? (
            <p className="text-sm text-red-500 md:col-span-1">{categoryError}</p>
        ) : (
            <Select
              label={t('posForm.filterByCategoryLabel')}
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSubmissionStatus(null); 
              }}
              options={categoryOptions}
              containerClassName="md:col-span-1"
              aria-label={t('posForm.filterByCategoryLabel')}
              disabled={categories.length === 0}
            />
        )}
        <div className="relative md:col-span-2">
          <Input
            label={t('posForm.searchProductLabel')}
            type="text"
            placeholder={t('posForm.searchProductPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value.trim() === '') setShowSearchResults(false);
              setSubmissionStatus(null); 
            }}
            onFocus={() => searchTerm.trim() && searchResults.length > 0 && setShowSearchResults(true)}
            className="pr-10"
            aria-label={t('posForm.searchProductLabel')}
          />
          <FiSearch className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
          {isLoadingSearch && !submissionStatus && <p className="text-xs text-gray-500 mt-1" aria-live="polite">{t('posForm.searching')}</p>}
          {showSearchResults && (
            <div 
              className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"
              onMouseLeave={() => setShowSearchResults(false)}
            >
              {searchResults.length > 0 ? (
                <ul>
                  {searchResults.map(product => (
                    <li
                      key={product.id}
                      className={`p-3 hover:bg-indigo-50 cursor-pointer text-sm flex items-center ${(product.totalStock ?? 0) === 0 ? 'text-gray-400 opacity-70 cursor-not-allowed' : 'text-gray-700'}`}
                      onClick={() => (product.totalStock ?? 0) > 0 && addProductToSale(product)}
                      onKeyDown={(e) => (product.totalStock ?? 0) > 0 && e.key === 'Enter' && addProductToSale(product)}
                      title={(product.totalStock ?? 0) === 0 ? t('posForm.outOfStockTooltip', {productTitle: product.title}) : t('posForm.productTitleTooltip', {productTitle: product.title, manufacturerName: product.manufacturerName || 'N/A'})}
                      tabIndex={(product.totalStock ?? 0) > 0 ? 0 : -1}
                      role="option"
                      aria-selected="false" 
                      aria-disabled={(product.totalStock ?? 0) === 0}
                    >
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-10 h-10 object-cover rounded-md mr-3 flex-shrink-0" 
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=No+Img')}
                      />
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{product.title}</p>
                                <p className="text-xs text-gray-500">{product.code} - {product.manufacturerName || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{t('common.category')}: {product.categoryName || 'N/A'} - {t('posForm.stockInfo', { stockCount: product.totalStock ?? 0 })}</p>
                            </div>
                            {(product.totalStock ?? 0) > 0 && <FiPlus className="text-indigo-500 h-5 w-5 ml-2 flex-shrink-0"/> }
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                 searchTerm.trim().length > 1 && !isLoadingSearch && (
                   <p className="p-3 text-sm text-gray-500">{t('posForm.noProductsFoundFor', {searchTerm: searchTerm})}</p>
                 )
              )}
            </div>
          )}
        </div>
        <Button 
            onClick={() => setIsManualProductModalOpen(true)} 
            variant="secondary" 
            className="ml-4"
            leftIcon={<FiPlus />}
        >
            {t('posForm.addManualProduct')}
        </Button>
      </div>

      {saleItems.length > 0 && (
        <div className="mt-6 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300" aria-label={t('posForm.tableHeaderProductName')}> 
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">{t('posForm.tableHeaderProductName')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderImage')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderCode')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderSize')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderQuantity')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderUnitPrice')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderDiscount')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderFinalPrice')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('posForm.tableHeaderNote')}</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-900">{t('posForm.tableHeaderActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {saleItems.map((item, index) => (
                      <SaleItemRow
                        key={item.id} 
                        item={item}
                        index={index}
                        onUpdateItem={updateSaleItem}
                        onRemoveItem={removeSaleItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {saleItems.length === 0 && (
        <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md mt-6">
          {t('posForm.noProductsAdded')}
        </p>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Select
            label={t('posForm.paymentMethodLabel')}
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as PaymentMethod);
              setSubmissionStatus(null); 
            }}
            options={PAYMENT_METHODS} 
            containerClassName="w-full sm:w-auto sm:min-w-[200px]"
            aria-label={t('posForm.paymentMethodLabel')}
          />
          <div className="text-right w-full sm:w-auto space-y-2">
            <p className="text-xl font-semibold text-gray-800" aria-live="polite">
              {t('posForm.totalLabel')}: <span className="text-indigo-600">€{totalAmount.toFixed(2)}</span>
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <Button
                onClick={handleClearSale}
                disabled={saleItems.length === 0 && searchTerm === '' && selectedCategoryId === ALL_CATEGORIES_ID}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                aria-label={t('posForm.clearSaleButton')}
              >
                {t('posForm.clearSaleButton')}
              </Button>
              <Button
                onClick={handleSubmitSale}
                disabled={saleItems.length === 0 || isSubmitting}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                aria-label={t('posForm.submitSaleButton')}
              >
                {isSubmitting ? t('posForm.processingButton') : t('posForm.submitSaleButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {isManualProductModalOpen && (
        <ManualProductModal
          isOpen={isManualProductModalOpen}
          onClose={() => setIsManualProductModalOpen(false)}
          onSave={handleSaveManualProduct}
        />
      )}
    </div>
  );
};
