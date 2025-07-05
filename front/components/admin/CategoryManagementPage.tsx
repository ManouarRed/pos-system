
import React, { useState, useEffect, useCallback } from 'react';
import { Category } from '../../types';
import { productService, PaginatedResponse } from '../../services/productService';
import { Button } from '../common/Button';
import { FiPlus } from 'react-icons/fi';
import { CategoryTable } from './CategoryTable';
import { CategoryFormModal } from './CategoryFormModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { Select } from '../common/Select'; // For items per page
import { FullScreenLoader } from '../common/FullScreenLoader';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export const CategoryManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null); 
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[1]); // Default to 10
  const [totalPages, setTotalPages] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);


  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  }

  const loadCategories = useCallback(async (pageToLoad = currentPage, limit = itemsPerPage) => {
    setIsLoading(true);
    clearMessages(); 
    try {
      const response: PaginatedResponse<Category> = await productService.fetchCategories(pageToLoad, limit);
      setCategories(response.items);
      setTotalCategories(response.totalItems);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
      if (response.currentPage > response.totalPages && response.totalPages > 0) {
        setCurrentPage(response.totalPages); // Adjust if current page is out of bounds
      } else if (response.totalPages === 0 && response.totalItems === 0) {
        setCurrentPage(1); // Reset to page 1 if no items
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('common.category', {count: 2}).toLowerCase() }));
    } finally {
      setIsLoading(false);
    }
  }, [t, itemsPerPage]); // currentPage removed from deps here to avoid loop, managed by separate useEffect

  useEffect(() => {
    loadCategories(1, itemsPerPage); // Load first page when itemsPerPage changes or on initial mount
  }, [itemsPerPage, loadCategories]); // loadCategories dependency is fine here

  useEffect(() => {
    // Only call loadCategories if currentPage has actually changed by user interaction
    // (e.g. clicking next/prev), not just as a side effect of other state updates.
    // The loadCategories function itself depends on itemsPerPage, so changes to that are handled above.
    // This effect is specifically for page changes.
    if (!isLoading) { // Avoid re-fetching if a load is already in progress
       loadCategories(currentPage, itemsPerPage);
    }
  }, [currentPage]); // Only re-run if currentPage changes.


  const handleOpenAddModal = () => {
    clearMessages();
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    clearMessages();
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
    clearMessages();
    setIsLoading(true); 
    try {
      let pageToLoadAfterSave = editingCategory ? currentPage : 1;
      if ('id' in categoryData && categoryData.id) { 
        const updatedCategory = await productService.updateCategoryAdmin(categoryData as Category);
        if (updatedCategory) {
          setSuccessMessage(t('common.success') + ": " + t('common.category') + " " + t('common.edit', {count: 1}).toLowerCase() + "!");
        } else {
          throw new Error(t('errors.apiErrorGeneric', { message: "Update operation returned undefined."}));
        }
      } else { 
        await productService.addCategoryAdmin(categoryData as Omit<Category, 'id'>);
        setSuccessMessage(t('common.success') + ": " + t('common.category') + " " + t('common.add', {count: 1}).toLowerCase() + "!");
        // If adding, and not on first page, consider going to first page or last page
        // For simplicity, let's go to first page after add
        pageToLoadAfterSave = 1; 
      }
      await loadCategories(pageToLoadAfterSave, itemsPerPage); 
      handleCloseModal();
    } catch (err) {
      console.error("Error saving category:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: t('common.category').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    clearMessages();
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (window.confirm(t('common.confirm') + ` ${t('common.delete').toLowerCase()} "${categoryToDelete?.name || 'category'}"? ${t('common.cannotBeUndone')}`)) {
      setIsLoading(true);
      try {
        const result = await productService.deleteCategoryAdmin(categoryId);
        if (result.success) {
          setSuccessMessage(result.message || t('common.success') + ": " + t('common.category') + " " + t('common.delete', {count: 1}).toLowerCase() + "!");
           
          const newTotalCategories = totalCategories - 1;
          const newTotalPages = Math.ceil(newTotalCategories / itemsPerPage);
          // If current page becomes empty and it's not the first page, go to previous page.
          // Or if it was the last page and items were deleted from it.
          const pageToLoad = (categories.length === 1 && currentPage > 1) 
                            ? Math.max(1, currentPage -1) 
                            : (currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage);

          await loadCategories(pageToLoad, itemsPerPage);
        } else {
          setActionError(result.message || t('errors.failedToLoadData', { entity: t('common.category').toLowerCase() }));
        }
      } catch (err) {
        console.error("Error deleting category:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('common.category').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
          setIsLoading(false);
      }
    }
  };

  const MessageDisplay = () => {
    if (actionError) return <p className="text-center text-red-500 py-4 bg-red-50 rounded-md my-4">{actionError}</p>;
    if (successMessage) return <p className="text-center text-green-500 py-4 bg-green-50 rounded-md my-4">{successMessage}</p>;
    return null;
  };
  
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-b-lg shadow">
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
                        {t('common.page')} <span className="font-medium">{currentPage}</span> {t('common.of')} <span className="font-medium">{totalPages}</span>. {totalCategories} {t('common.category', {count: totalCategories}).toLowerCase()}.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select
                        label=""
                        id="itemsPerPageCat"
                        options={ITEMS_PER_PAGE_OPTIONS.map(opt => ({value: String(opt), label: `${opt} ${t('common.perPage')}` }))}
                        value={String(itemsPerPage)}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            // loadCategories will be called by useEffect due to itemsPerPage change
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


  if (isLoading && categories.length === 0 && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }


  return (
    <div className="space-y-6">
      <MessageDisplay />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">{t('adminPage.tabCategories')}</h2>
        <Button onClick={handleOpenAddModal} variant="primary" leftIcon={<FiPlus />} disabled={isLoading}>
          {t('common.addNew')} {t('common.category').toLowerCase()}
        </Button>
      </div>
      
      {isLoading && categories.length > 0 && <p className="text-center text-gray-500 py-4">{t('common.loading')} {t('common.category', { count: 2 }).toLowerCase()}...</p>}

      <CategoryTable
        categories={categories}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteCategory}
      />
      {renderPaginationControls()}

      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCategory}
          category={editingCategory}
          key={editingCategory ? editingCategory.id : 'new-category-modal'}
        />
      )}
    </div>
  );
};
