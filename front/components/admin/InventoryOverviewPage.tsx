
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, SizeStock, User } from '../../types';
import { productService } from '../../services/productService';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { FiSearch, FiEdit, FiPrinter } from 'react-icons/fi';
import { InventoryStockEditModal } from './InventoryStockEditModal';
import { ZoomModal } from '../common/ZoomModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { Select } from '../common/Select'; // For items per page
import { FullScreenLoader } from '../common/FullScreenLoader';

interface InventoryOverviewPageProps {
  currentUser: User;
}

const LOW_STOCK_THRESHOLD = 10;
type StockFilterType = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
const ITEMS_PER_PAGE_OPTIONS_INV = [10, 20, 50, 100];


export const InventoryOverviewPage: React.FC<InventoryOverviewPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [allFetchedProducts, setAllFetchedProducts] = useState<Product[]>([]); // Store all products from API
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null); 
  const [searchTermInventory, setSearchTermInventory] = useState<string>('');
  const [activeStockFilter, setActiveStockFilter] = useState<StockFilterType>('all');

  const [isStockEditModalOpen, setIsStockEditModalOpen] = useState<boolean>(false);
  const [productForStockEdit, setProductForStockEdit] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canEditStock = currentUser.role === 'admin' || !!currentUser.permissions?.accessInventory;
  const isAdminUser = currentUser.role === 'admin';

  // Pagination state (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS_INV[1]);


  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  };

  const loadAllProducts = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const adminProductsResponse = await productService.fetchAllProductsAdmin(1, 100000); 
      setAllFetchedProducts(adminProductsResponse.items);
    } catch (err) {
      console.error("Failed to load products for inventory:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('common.inventory') }));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAllProducts();
  }, [loadAllProducts]);

  const searchedProducts = useMemo(() => {
    if (!searchTermInventory) {
      return allFetchedProducts;
    }
    const lowerSearchTerm = searchTermInventory.toLowerCase();
    return allFetchedProducts.filter(product =>
      product.title.toLowerCase().includes(lowerSearchTerm) ||
      product.code.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allFetchedProducts, searchTermInventory]);

  const filteredInventoryProducts = useMemo(() => {
    setCurrentPage(1); // Reset to first page whenever filters change
    let productsToFilter = [...searchedProducts];
    switch (activeStockFilter) {
      case 'inStock':
        return productsToFilter.filter(p => (p.totalStock ?? 0) > 0);
      case 'lowStock':
        return productsToFilter.filter(p => (p.totalStock ?? 0) > 0 && (p.totalStock ?? 0) <= LOW_STOCK_THRESHOLD);
      case 'outOfStock':
        return productsToFilter.filter(p => (p.totalStock ?? 0) === 0);
      case 'all':
      default:
        return productsToFilter;
    }
  }, [searchedProducts, activeStockFilter]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventoryProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventoryProducts, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredInventoryProducts.length / itemsPerPage);
  }, [filteredInventoryProducts, itemsPerPage]);


  const inventorySummary = useMemo(() => {
    const currentProductList = searchedProducts; 
    const totalProducts = currentProductList.length;
    const productsInStockCount = currentProductList.filter(p => (p.totalStock ?? 0) > 0).length;
    const outOfStockCount = currentProductList.filter(p => (p.totalStock ?? 0) === 0).length;
    const lowStockCount = currentProductList.filter(p => (p.totalStock ?? 0) > 0 && (p.totalStock ?? 0) <= LOW_STOCK_THRESHOLD).length;
    return { totalProducts, productsInStockCount, outOfStockCount, lowStockCount };
  }, [searchedProducts]);

  const getStockLevelClass = (totalStock: number): string => {
    if (totalStock === 0) return 'text-red-600 font-semibold';
    if (totalStock <= LOW_STOCK_THRESHOLD) return 'text-orange-600 font-semibold';
    return 'text-green-600';
  };

  const handleOpenStockEditModal = (product: Product) => {
    if (!canEditStock) return;
    clearMessages();
    setProductForStockEdit(product);
    setIsStockEditModalOpen(true);
  };

  const handleCloseStockEditModal = () => {
    setProductForStockEdit(null);
    setIsStockEditModalOpen(false);
  };

  const handleSaveStockChangesFromModal = async (productId: string, updatedSizeStocks: SizeStock[]) => {
    if(!canEditStock) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    try {
        const updatedProduct = await productService.updateProductStockAdmin(productId, null, null, updatedSizeStocks);
        if (updatedProduct) {
            setSuccessMessage(t('inventory.stockUpdateSuccessPlural', { count: updatedSizeStocks.length }));
            await loadAllProducts(); 
        } else {
            throw new Error("Stock update operation returned no product data.");
        }
    } catch (err) {
        console.error(`Error updating stock for ${productId}:`, err);
        setActionError(t('inventory.stockUpdateError', { errorCount: updatedSizeStocks.length, successCount: 0 }));
    } finally {
        handleCloseStockEditModal();
    }
  };


  const handleClearSearchAndFilters = () => {
    setSearchTermInventory('');
    setActiveStockFilter('all');
    setCurrentPage(1); 
    clearMessages();
  };

  const handlePrintInventory = () => {
    window.print();
  };

  const renderFilterCard = (titleKey: string, count: number, filterType: StockFilterType, colorScheme: string) => {
    const isActive = activeStockFilter === filterType;
    return (
      <div
        onClick={() => setActiveStockFilter(filterType)}
        className={`p-4 rounded-lg shadow cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105
                    ${isActive ? `ring-2 ring-offset-2 ${colorScheme}-ring border-2 ${colorScheme}-border bg-opacity-100 ${colorScheme}-bg-active` 
                               : `bg-opacity-80 hover:bg-opacity-100 ${colorScheme}-bg`}
                   `}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setActiveStockFilter(filterType)}
        aria-pressed={isActive}
        aria-label={`${t(titleKey)}, ${count} products`}
      >
        <p className={`text-sm font-medium ${colorScheme}-text`}>{t(titleKey)}</p>
        <p className={`text-2xl font-bold ${colorScheme}-text-dark`}>{count}</p>
      </div>
    );
  }

  const MessageDisplay = () => {
    if (actionError) return <p className="text-center text-red-500 py-4 bg-red-50 rounded-md my-4 print:hidden">{actionError}</p>;
    if (successMessage) return <p className="text-center text-green-500 py-4 bg-green-50 rounded-md my-4 print:hidden">{successMessage}</p>;
    return null;
  };
  
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-b-lg shadow print:hidden">
            <div className="flex-1 flex justify-between sm:hidden">
                 <Button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isLoading} variant="secondary">
                    {t('common.previous')}
                </Button>
                <Button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || isLoading} variant="secondary">
                    {t('common.next')}
                </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        {t('common.page')} <span className="font-medium">{currentPage}</span> {t('common.of')} <span className="font-medium">{totalPages}</span>. {filteredInventoryProducts.length} {t('adminPage.tabProducts').toLowerCase()} {t('common.inventory').toLowerCase()}.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select
                        label=""
                        id="itemsPerPageInv"
                        options={ITEMS_PER_PAGE_OPTIONS_INV.map(opt => ({value: String(opt), label: `${opt} ${t('common.perPage')}` }))}
                        value={String(itemsPerPage)}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1); 
                        }}
                        containerClassName="inline-block"
                        className="text-xs"
                    />
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            variant="secondary"
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                            <span className="sr-only">{t('common.previous')}</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </Button>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || isLoading}
                            variant="secondary"
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                            <span className="sr-only">{t('common.next')}</span>
                           <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        </Button>
                    </nav>
                </div>
            </div>
        </div>
    );
  };






  if (isLoading && allFetchedProducts.length === 0 && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }
  
  return (
    <div className="space-y-6">
      <div className="print-header hidden print:block">
        <h2>{t('inventory.reportTitle')}</h2>
        <p>{t('common.date')}: {new Date().toLocaleDateString()}</p>
      </div>
      <MessageDisplay />
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <h2 className="text-2xl font-semibold text-gray-800">{t('adminPage.tabInventory')}</h2>
        {isAdminUser && (
            <Button onClick={handlePrintInventory} variant="secondary" leftIcon={<FiPrinter />} disabled={isLoading || filteredInventoryProducts.length === 0}>
                {t('inventory.printInventory')}
            </Button>
        )}
      </div>


      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label={t('inventory.searchLabel')}
            id="inventorySearch"
            placeholder={t('inventory.searchPlaceholder')}
            value={searchTermInventory}
            onChange={(e) => setSearchTermInventory(e.target.value)}
            containerClassName="w-full md:col-span-2"
            leftIcon={<FiSearch className="w-4 h-4 text-gray-400" />}
          />
          <Button
            onClick={handleClearSearchAndFilters}
            variant="secondary"
            size="md"
            disabled={!searchTermInventory && activeStockFilter === 'all'}
            className="w-full md:w-auto"
          >
            {t('inventory.clearSearchAndFilters')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center print:hidden">
        {renderFilterCard('inventory.totalProductsCard', inventorySummary.totalProducts, 'all', 'indigo')}
        {renderFilterCard('inventory.inStockCard', inventorySummary.productsInStockCount, 'inStock', 'green')}
        {renderFilterCard('inventory.lowStockCard', inventorySummary.lowStockCount, 'lowStock', 'orange')}
        {renderFilterCard('inventory.outOfStockCard', inventorySummary.outOfStockCount, 'outOfStock', 'red')}
      </div>
      
      <style>{`
        .indigo-bg { background-color: #eef2ff; } .indigo-bg-active { background-color: #c7d2fe; } .indigo-text { color: #4338ca; } .indigo-text-dark { color: #3730a3; } .indigo-ring { ring-color: #4f46e5; } .indigo-border { border-color: #6366f1; }
        .green-bg { background-color: #f0fdf4; } .green-bg-active { background-color: #dcfce7; } .green-text { color: #166534; } .green-text-dark { color: #15803d; } .green-ring { ring-color: #22c55e; } .green-border { border-color: #4ade80; }
        .orange-bg { background-color: #fff7ed; } .orange-bg-active { background-color: #ffedd5; } .orange-text { color: #c2410c; } .orange-text-dark { color: #ea580c; } .orange-ring { ring-color: #f97316; } .orange-border { border-color: #fb923c; }
        .red-bg { background-color: #fef2f2; } .red-bg-active { background-color: #fee2e2; } .red-text { color: #b91c1c; } .red-text-dark { color: #dc2626; } .red-ring { ring-color: #ef4444; } .red-border { border-color: #f87171; }
      `}</style>

      {isLoading && allFetchedProducts.length > 0 && <p className="text-center text-gray-500 py-4 print:hidden">{t('common.loading')}...</p>}

      {actionError && allFetchedProducts.length === 0 && <p className="text-center text-red-500 py-8 border-2 border-dashed border-red-300 rounded-md print:hidden">{actionError}</p>}
      
      <div className="printable-content">
        {paginatedProducts.length === 0 && !isLoading && !actionError ? (
          <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md print:hidden">
            {searchTermInventory || activeStockFilter !== 'all' ? t('inventory.noProductsMatchFilters') : t('inventory.noProducts')}
          </p>
        ) : !actionError && ( 
          <div className="flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 print:mx-0 print:my-0 print:overflow-visible">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8 print:px-0 print:py-0">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg print:shadow-none print:ring-0">
                  <table className="min-w-full divide-y divide-gray-300 print:divide-gray-500" aria-label={t('inventory.tableAriaLabel')}>
                    <thead className="bg-gray-50 print:bg-gray-100">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">{t('common.image')}</th>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">{t('common.productTitle')}</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.code')}</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.category')}</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.manufacturer')}</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('inventory.totalStock')}</th>
                        {canEditStock && <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 print:hidden">{t('common.actions')}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white print:divide-gray-400">
                      {paginatedProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
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
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{product.title}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.code}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.categoryName}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.manufacturerName}</td>
                          <td className={`whitespace-nowrap px-3 py-4 text-sm ${getStockLevelClass(product.totalStock ?? 0)}`}>
                            {product.totalStock ?? 0}
                          </td>
                          {canEditStock && (
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-center print:hidden">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenStockEditModal(product)}
                                  leftIcon={<FiEdit className="w-4 h-4" />}
                                  disabled={product.sizes.length === 0}
                                  title={product.sizes.length === 0 ? t('inventory.noSizesDefined') : t('inventory.editStockForAllSizes')}
                              >
                                  {t('inventory.editStockButton')}
                              </Button>
                              </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div> {/* End printable-content */}
      {renderPaginationControls()}
      {isStockEditModalOpen && productForStockEdit && canEditStock && (
        <InventoryStockEditModal
          isOpen={isStockEditModalOpen}
          onClose={handleCloseStockEditModal}
          onSave={handleSaveStockChangesFromModal}
          product={productForStockEdit}
        />
      )}
      {showZoom && hoveredImage && (
          <ZoomModal
              isOpen={showZoom}
              onClose={() => setShowZoom(false)}
              imageUrl={hoveredImage}
              position={zoomPosition}
          />
      )}
    </div>
  );
};
