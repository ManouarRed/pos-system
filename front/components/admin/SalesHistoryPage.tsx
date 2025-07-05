
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SubmittedSale, Product, User } from '../../types';
import { productService } from '../../services/productService';
import { SalesHistoryTable } from './SalesHistoryTable';
import { SaleEditModal } from './SaleEditModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { FiPrinter, FiEdit, FiTrash2 } from 'react-icons/fi';
import { FullScreenLoader } from '../common/FullScreenLoader';


interface SalesHistoryPageProps {
  currentUser: User;
}

export const SalesHistoryPage: React.FC<SalesHistoryPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [sales, setSales] = useState<SubmittedSale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null); 
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<SubmittedSale | null>(null);
  
  const [allProducts, setAllProducts] = useState<Product[]>([]); 

  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');

  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [salesForPrinting, setSalesForPrinting] = useState<SubmittedSale[]>([]);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

  const canViewFullHistory = currentUser.role === 'admin' || !!currentUser.permissions?.viewFullSalesHistory;
  const canEditSales = currentUser.role === 'admin'; 
  const isAdminUser = currentUser.role === 'admin';


  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  };

  const loadSalesAndProducts = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const [fetchedSales, fetchedProductDetails] = await Promise.all([ 
        productService.fetchSubmittedSales(),
        productService.fetchProductsForReporting() 
      ]);
      setSales(fetchedSales);
      setAllProducts(fetchedProductDetails); 
    } catch (err) {
      console.error("Failed to load sales history or product data:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('adminPage.tabSalesHistory').toLowerCase() }));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSalesAndProducts();
  }, [loadSalesAndProducts]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.submissionDate);
      if (!canViewFullHistory) {
        // Backend handles filtering for non-admin/non-full-history employees
      }
      if (filterDateFrom && saleDate < new Date(filterDateFrom)) {
        return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); 
        if (saleDate > toDate) {
          return false;
        }
      }
      if (filterPaymentMethod && sale.paymentMethod !== filterPaymentMethod) {
        return false;
      }
      return true;
    }).sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [sales, filterDateFrom, filterDateTo, filterPaymentMethod, canViewFullHistory]);

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleSelectSale = (saleId: string, isSelected: boolean) => {
    setSelectedSaleIds(prev =>
      isSelected ? [...prev, saleId] : prev.filter(id => id !== saleId)
    );
  };

  const handleSelectAllSales = (isSelected: boolean) => {
    setSelectedSaleIds(isSelected ? filteredSales.map(sale => sale.id) : []);
  };

  const handleOpenEditModal = (sale: SubmittedSale) => {
    if (!canEditSales) return;
    clearMessages();
    setEditingSale(sale);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingSale(null);
  };

  const handleSaveSale = async (updatedSaleData: SubmittedSale) => {
    if (!canEditSales) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    if (!editingSale) return;
    setIsLoading(true); 

    try {
      const updatedSale = await productService.updateSubmittedSale(updatedSaleData);
      if (updatedSale) {
        setSuccessMessage(`Sale ${updatedSale.id.substring(updatedSale.id.length - 8)} ${t('common.edit', {count: 1}).toLowerCase()} ${t('common.success')}!`);
        await loadSalesAndProducts(); 
      } else {
        throw new Error(t('errors.apiErrorGeneric', { message: "Update operation returned undefined."}));
      }
      handleCloseEditModal();
    } catch (err) {
      console.error("Error updating sale:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: 'sale' })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handlePrintSales = (salesToPrint: SubmittedSale[]) => {
    setSalesForPrinting(salesToPrint);
    setIsPrinting(true);
  };

  useEffect(() => {
    if (isPrinting) {
      // Use a timeout to ensure the DOM is updated with the printable content before printing.
      const timer = setTimeout(() => {
        window.print();
        // Reset state after printing dialog is closed
        setIsPrinting(false);
        setSalesForPrinting([]);
      }, 100); 

      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

  const handleDeleteSelectedSales = async () => {
    if (!canEditSales) {
      setActionError(t('errors.unauthorizedAccessMessage'));
      return;
    }
    clearMessages();
    if (selectedSaleIds.length === 0) {
      setActionError(t('placeholders.noData') + " selected for deletion.");
      return;
    }
    if (window.confirm(t('common.confirm') + ` ${t('common.delete').toLowerCase()} ${selectedSaleIds.length} selected sale(s)? ${t('common.cannotBeUndone')}`)) {
      setIsLoading(true);
      try {
        // Assuming a new backend endpoint for bulk delete sales
        await productService.deleteSalesAdmin(selectedSaleIds);
        setSuccessMessage(t('common.success') + `: ${selectedSaleIds.length} sale(s) deleted.`);
        setSelectedSaleIds([]);
        await loadSalesAndProducts();
      } catch (err) {
        console.error("Error deleting sales:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: 'sales' })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteAllSales = async () => {
    if (!canEditSales) {
      setActionError(t('errors.unauthorizedAccessMessage'));
      return;
    }
    clearMessages();
    if (window.confirm(t('common.confirm') + ` ${t('common.delete').toLowerCase()} ALL sales? ${t('common.cannotBeUndone')}`)) {
      setIsLoading(true);
      try {
        const allSaleIds = sales.map(sale => sale.id);
        await productService.deleteSalesAdmin(allSaleIds);
        setSuccessMessage(t('common.success') + `: All sales have been deleted.`);
        setSelectedSaleIds([]);
        await loadSalesAndProducts();
      } catch (err) {
        console.error("Error deleting all sales:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: 'sales' })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkEditSales = () => {
    if (!canEditSales) {
      setActionError(t('errors.unauthorizedAccessMessage'));
      return;
    }
    clearMessages();
    if (selectedSaleIds.length === 0) {
      setActionError(t('placeholders.noData') + " selected for bulk editing.");
      return;
    }
    alert("Bulk Edit Sales - Not yet implemented. Selected IDs: " + selectedSaleIds.join(', '));
    // TODO: Implement a bulk edit modal for sales
  };

  const MessageDisplay = () => {
    if (actionError) return <p className="text-center text-red-500 py-4 bg-red-50 rounded-md my-4 print:hidden">{actionError}</p>;
    if (successMessage) return <p className="text-center text-green-500 py-4 bg-green-50 rounded-md my-4 print:hidden">{successMessage}</p>;
    return null;
  };

  if (isLoading && sales.length === 0 && !isPrinting && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }


  return (
    <div className="space-y-6">
      {/* Print-only content */}
      <div className={`print-only-content ${isPrinting ? 'block' : 'hidden'} p-4`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('salesHistory.reportTitleDaily')}</h2>
        <p className="text-gray-600 mb-6">{t('common.date')}: {new Date().toLocaleDateString()}</p>
        <SalesHistoryTable
          sales={salesForPrinting}
          onEdit={handleOpenEditModal}
          canEditSales={canEditSales}
          isPrinting={true}
          selectedSaleIds={selectedSaleIds}
          onSelectSale={handleSelectSale}
          onSelectAllSales={handleSelectAllSales}
        />
      </div>

      {/* Main UI content, hidden during print */}
      <div className={`main-ui-content ${isPrinting ? 'hidden' : 'block'} space-y-6`}>
        <MessageDisplay />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          <h2 className="text-2xl font-semibold text-gray-800">{t('adminPage.tabSalesHistory')}</h2>
          <div className="flex items-center gap-2">
              {!canViewFullHistory && (
                  <p className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded-md">
                      {t('common.displayingTodaySales')} 
                  </p>
              )}
              {isAdminUser && (
                <>
                  <Button onClick={() => handlePrintSales(filteredSales)} variant="secondary" leftIcon={<FiPrinter />} disabled={isLoading || filteredSales.length === 0}>
                      {t('salesHistory.printAllSales')}
                  </Button>
                  <Button onClick={handleDeleteAllSales} variant="danger" leftIcon={<FiTrash2 />} disabled={isLoading || sales.length === 0}>
                      {t('salesHistory.deleteAllSales')}
                  </Button>
                </>
              )}
          </div>
        </div>

        {canViewFullHistory && ( 
          <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <Input
                  label={t('common.dateFrom')}
                  type="date"
                  id="filterDateFromSales"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  containerClassName="w-full"
                  />
                  <Input
                  label={t('common.dateTo')}
                  type="date"
                  id="filterDateToSales"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  containerClassName="w-full"
                  />
                  <Button 
                      onClick={handleClearFilters} 
                      variant="secondary" 
                      size="md" 
                      className="w-full md:self-end"
                      disabled={!filterDateFrom && !filterDateTo && !filterPaymentMethod}
                  >
                  {t('common.clearDateFilters')}
                  </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4">
                  <Select
                      label={t('common.paymentMethod')}
                      id="filterPaymentMethodSales"
                      value={filterPaymentMethod}
                      onChange={(e) => setFilterPaymentMethod(e.target.value)}
                      options={[
                          { value: '', label: t('common.all') },
                          { value: 'Cash', label: t('common.cash') },
                          { value: 'Credit Card', label: t('common.creditCard') },
                          { value: 'Bank Transfer', label: t('common.bankTransfer') }
                      ]}
                      containerClassName="w-full"
                  />
              </div>
          </div>
        )}

        {isAdminUser && selectedSaleIds.length > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm font-medium text-indigo-700">
              {selectedSaleIds.length} sale(s) selected.
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => handlePrintSales(filteredSales.filter(sale => selectedSaleIds.includes(sale.id)))} variant="secondary" size="sm" leftIcon={<FiPrinter />}>
                {t('salesHistory.printSelectedSales')}
              </Button>
              <Button onClick={handleBulkEditSales} variant="secondary" size="sm" leftIcon={<FiEdit />}>
                {t('common.bulkEdit')}
              </Button>
              <Button onClick={handleDeleteSelectedSales} variant="danger" size="sm" leftIcon={<FiTrash2 />}>
                {t('common.deleteSelected')}
              </Button>
            </div>
          </div>
        )}


        {isLoading && sales.length > 0 && !isPrinting && <p className="text-center text-gray-500 py-4 print:hidden">{t('common.loading')}...</p>}
        
        <div className="printable-content">
          {!isLoading && actionError && (isPrinting ? salesForPrinting : filteredSales).length === 0 && (
            <p className="text-center text-red-500 py-8 border-2 border-dashed border-red-300 rounded-md print:hidden">
              {actionError}
            </p>
          )}

          {!isLoading && !actionError && (isPrinting ? salesForPrinting : filteredSales).length === 0 && (
            <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md print:border-none print:shadow-none">
              {isPrinting 
                  ? t('placeholders.noSalesFound') + " " + t('common.forToday').toLowerCase()
                  : canViewFullHistory && (filterDateFrom || filterDateTo) 
                      ? t('placeholders.noSalesMatchFilters') 
                      : t('placeholders.noSalesFound')}
            </p>
          )}

          {!actionError && (isPrinting ? salesForPrinting : filteredSales).length > 0 && (
            <SalesHistoryTable
              sales={isPrinting ? salesForPrinting : filteredSales}
              onEdit={handleOpenEditModal}
              canEditSales={canEditSales}
              isPrinting={isPrinting}
              selectedSaleIds={selectedSaleIds}
              onSelectSale={handleSelectSale}
              onSelectAllSales={handleSelectAllSales}
            />
          )}
        </div>


        {isEditModalOpen && editingSale && canEditSales && (
          <SaleEditModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            onSave={handleSaveSale}
            sale={editingSale}
            allProducts={allProducts} 
            key={editingSale.id}
          />
        )}
      </div>
    </div>
  );
};
