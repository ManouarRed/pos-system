import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, ProductFormData, Category, Manufacturer, SizeStock, User } from '../../types';
import { productService, PaginatedResponse } from '../../services/productService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { ProductTable } from './ProductTable';
import { ProductFormModal } from './ProductFormModal';
import { ProductBulkEditModal } from './ProductBulkEditModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { FullScreenLoader } from '../common/FullScreenLoader';
import { FiPlus, FiUpload, FiDownload, FiSearch, FiFilter, FiX } from 'react-icons/fi';

interface ProductManagementPageProps {
  currentUser: User;
}

const ALL_FILTER_VALUE = "ALL";
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export const ProductManagementPage: React.FC<ProductManagementPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState(ALL_FILTER_VALUE);
  const [filterManufacturerId, setFilterManufacturerId] = useState(ALL_FILTER_VALUE);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'totalStock'; direction: 'ascending' | 'descending' } | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState<boolean>(true);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[1]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const canEditProducts = currentUser.role === 'admin' || !!currentUser.permissions?.editProducts;

  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  }

  const loadProducts = useCallback(async (calledByAction?: boolean, pageToLoad = currentPage) => {
    setIsLoading(true);
    if(!calledByAction) clearMessages();

    try {
      const response: PaginatedResponse<Product> = await productService.fetchAllProductsAdmin(
        pageToLoad,
        itemsPerPage,
        searchTerm,
        filterCategoryId === ALL_FILTER_VALUE ? undefined : filterCategoryId,
        filterManufacturerId === ALL_FILTER_VALUE ? undefined : filterManufacturerId,
        sortConfig?.key,
        sortConfig?.direction
      );
      setProducts(response.items);
      setTotalProducts(response.totalItems);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
       if (response.currentPage > response.totalPages && response.totalPages > 0) {
        setCurrentPage(response.totalPages);
      } else if (response.totalPages === 0) {
        setCurrentPage(1);
      }

    } catch (err) {
      console.error("Failed to load products:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('adminPage.tabProducts').toLowerCase() }));
    } finally {
      setIsLoading(false);
    }
  }, [t, currentPage, itemsPerPage, searchTerm, filterCategoryId, filterManufacturerId, sortConfig]);

  const loadFilterData = useCallback(async () => {
    setIsLoadingFilters(true);
    try {
      const [fetchedCategories, fetchedManufacturers] = await Promise.all([
        productService.fetchAllCategories(),
        productService.fetchManufacturers()
      ]);
      setCategories(fetchedCategories);
      setManufacturers(fetchedManufacturers);
    } catch (err) {
      console.error("Failed to load categories or manufacturers for filtering:", err);
      const filterError = t('errors.failedToLoadData', { entity: "filter options" });
      setActionError(prevError => prevError ? `${prevError} ${filterError}` : filterError);
    } finally {
      setIsLoadingFilters(false);
    }
  }, [t]);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  useEffect(() => {
    setSelectedProductIds([]);
    loadProducts(false, 1);
  }, [searchTerm, filterCategoryId, filterManufacturerId, sortConfig, itemsPerPage]);

  useEffect(() => {
    setSelectedProductIds([]);
    loadProducts(false, currentPage);
  }, [currentPage]);

  const handleOpenAddModal = () => {
    if (!canEditProducts) return;
    clearMessages();
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    if (!canEditProducts) return;
    clearMessages();
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      if (editingProduct && formData.id) {
        await productService.updateProductAdmin(formData as Required<ProductFormData>);
        setSuccessMessage(t('common.success'));
      } else {
        await productService.addProductAdmin(formData);
        setSuccessMessage(t('common.success'));
      }
      await loadProducts(true, editingProduct ? currentPage : 1);
      handleCloseModal();
    } catch (err) {
      console.error("Error saving product:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: t('common.productTitle').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    if (window.confirm(t('common.confirm'))) {
      setIsLoading(true);
      try {
        await productService.deleteProductAdmin(productId);
        setSuccessMessage(t('common.success'));
        const newTotalProducts = totalProducts - 1;
        const newTotalPages = Math.ceil(newTotalProducts / itemsPerPage);
        const pageToLoad = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
        await loadProducts(true, pageToLoad);
      } catch (err) {
        console.error("Error deleting product:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('common.productTitle').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
          setIsLoading(false);
          await loadProducts(true, currentPage); // Force reload after deletion attempt
      }
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      await productService.toggleProductVisibilityAdmin(product.id);
      setSuccessMessage(t('common.success'));
      await loadProducts(true, currentPage);
    } catch (err) {
      console.error("Error toggling visibility:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: `${t('common.productTitle').toLowerCase()} ${t('common.visibility').toLowerCase()}` })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDuplicateProduct = async (productToDuplicate: Product) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    if (window.confirm(t('common.confirm'))) {
      setIsLoading(true);
      try {
        await productService.duplicateProductAdmin(productToDuplicate.id);
        setSuccessMessage(t('common.success'));
        await loadProducts(true, 1);
      } catch (err) {
        console.error("Error duplicating product:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('common.productTitle').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
          setIsLoading(false);
      }
    }
  };

  const handleExportProducts = async () => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      const allMatchingProductsResponse = await productService.fetchAllProductsAdmin(
          1,
          totalProducts > 0 ? totalProducts : 1000,
          searchTerm,
          filterCategoryId === ALL_FILTER_VALUE ? undefined : filterCategoryId,
          filterManufacturerId === ALL_FILTER_VALUE ? undefined : filterManufacturerId,
          sortConfig?.key,
          sortConfig?.direction
      );
      const productsToExport = allMatchingProductsResponse.items;
      
      if(productsToExport.length === 0) {
        setActionError(t('placeholders.noProductsFound'));
        setIsLoading(false);
        return;
      }
      const worksheetData = productsToExport.map(p => ({
        ID: p.code,
        Title: p.title,
        Code: p.code,
        Category: p.categoryName || p.categoryId,
        Manufacturer: p.manufacturerName || p.manufacturerId,
        Price: p.price,
        TotalStock: p.totalStock ?? 0,
        SizesStockJSON: JSON.stringify(p.sizes),
        'Image URL': p.image,
        'Is Visible': p.isVisible ? t('common.yes') : t('common.no'),
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      XLSX.writeFile(workbook, `ProductsExport_${new Date().toISOString().slice(0,10)}.xlsx`);
      setSuccessMessage(t('common.success'));
    } catch (err) {
      console.error("Error exporting products:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: t('adminPage.tabProducts').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportProductsClick = () => {
    if (!canEditProducts) return;
    clearMessages();
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }
    clearMessages();
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setIsImporting(true);
    setImportProgress(0);
    setImportLog([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        if (!data) throw new Error("File data could not be read.");
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          setActionError(t('errors.apiErrorGeneric', {message: "The imported file is empty or not formatted correctly."}));
          setIsLoading(false);
          setIsImporting(false);
          if(fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        
        // Helper to find or create category/manufacturer by name
        const findOrCreateCategory = async (categoryName: string) => {
            try {
                const response = await productService.findOrCreateCategoryByName(categoryName);
                return response.id;
            } catch (error) {
                throw new Error(`Failed to find or create category "${categoryName}": ${error.message}`);
            }
        };

        const findOrCreateManufacturer = async (manufacturerName: string) => {
            try {
                const response = await productService.findOrCreateManufacturerByName(manufacturerName);
                return response.id;
            } catch (error) {
                throw new Error(`Failed to find or create manufacturer "${manufacturerName}": ${error.message}`);
            }
        };

        const allSystemProductsResponse = await productService.fetchAllProductsAdmin(1, Math.max(1000, totalProducts));
        const existingSystemProducts = allSystemProductsResponse.items;

        const productCodeMap = new Map(existingSystemProducts.map(p => [p.code.toLowerCase(), p]));

        let importedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];
        const newImportLog: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowIndex = i + 2;
          const productCode = String(row.Code || 'N/A');
          const productTitle = String(row.Title || 'N/A');

          setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          newImportLog.push(`Processing row ${rowIndex} (Code: ${productCode}, Title: ${productTitle})...`);
          setImportLog([...newImportLog]);

          if (!row.Title || !row.Code || row.Price == null || !row.Category || !row.Manufacturer || !row['Image URL']) {
            const msg = `Row ${rowIndex}: Missing required fields (Title, Code, Price, Category, Manufacturer, Image URL).`;
            errors.push(msg);
            newImportLog.push(`  Error: ${msg}`);
            setImportLog([...newImportLog]);
            continue;
          }

          let categoryId: string;
          try {
            categoryId = await findOrCreateCategory(String(row.Category));
          } catch (e) {
            const msg = `Row ${rowIndex}: ${e.message}`;
            errors.push(msg);
            newImportLog.push(`  Error: ${msg}`);
            setImportLog([...newImportLog]);
            continue;
          }

          let manufacturerId: string;
          try {
            manufacturerId = await findOrCreateManufacturer(String(row.Manufacturer));
          } catch (e) {
            const msg = `Row ${rowIndex}: ${e.message}`;
            errors.push(msg);
            newImportLog.push(`  Error: ${msg}`);
            setImportLog([...newImportLog]);
            continue;
          }

          const price = parseFloat(row.Price);
          if (isNaN(price) || price <= 0) {
            const msg = `Row ${rowIndex}: Invalid Price "${row.Price}". Must be a positive number.`;
            errors.push(msg);
            newImportLog.push(`  Error: ${msg}`);
            setImportLog([...newImportLog]);
            continue;
          }
          
          let sizesString: string;
          const sizesStockJSONFromRow = row.SizesStockJSON ? String(row.SizesStockJSON).trim() : '';
          const sizesListFromRow = row.Sizes ? String(row.Sizes).trim() : '';
          const stocksListFromRow = row.Stocks ? String(row.Stocks).trim() : '';

          if (sizesStockJSONFromRow) {
              sizesString = sizesStockJSONFromRow;
          } else if (sizesListFromRow && stocksListFromRow) {
              const sizeNamesArray = sizesListFromRow.split(',').map(s => s.trim());
              const stockValuesArray = stocksListFromRow.split(',').map(s => parseInt(s.trim(), 10));

              console.log(`DEBUG: Row ${rowIndex} - Sizes:`, sizeNamesArray, `Stocks:`, stockValuesArray);

              if (sizeNamesArray.length !== stockValuesArray.length) {
                  const msg = `Row ${rowIndex}: Mismatch between number of sizes and stock values.`;
                  errors.push(msg);
                  newImportLog.push(`  Error: ${msg}`);
                  setImportLog([...newImportLog]);
                  continue;
              }

              const sizeStockArray: SizeStock[] = [];
              let parsingError = false;
              for (let j = 0; j < sizeNamesArray.length; j++) {
                  const sizeName = sizeNamesArray[j];
                  const stockValue = stockValuesArray[j];
                  if (!sizeName || isNaN(stockValue)) {
                      parsingError = true;
                      const msg = `Row ${rowIndex}: Invalid size or stock value.`;
                      errors.push(msg);
                      newImportLog.push(`  Error: ${msg}`);
                      setImportLog([...newImportLog]);
                      break;
                  }
                  const effectiveStockValue = Math.max(0, stockValue); // Treat negative stock as 0
                  sizeStockArray.push({ size: sizeName, stock: effectiveStockValue });
              }

              if (parsingError) {
                  continue;
              }
              sizesString = JSON.stringify(sizeStockArray);
          } else {
              const totalStockFromRow = row.TotalStock !== undefined ? parseInt(String(row.TotalStock), 10) : (row.Stock !== undefined ? parseInt(String(row.Stock), 10) : undefined);
              if (totalStockFromRow !== undefined && !isNaN(totalStockFromRow)) {
                  const effectiveTotalStock = Math.max(0, totalStockFromRow); // Treat negative total stock as 0
                  sizesString = JSON.stringify([{ size: 'One Size', stock: effectiveTotalStock }]);
              } else {
                  sizesString = '[]';
              }
          }

          const productData: ProductFormData = {
            title: String(row.Title),
            code: String(row.Code),
            price: price,
            categoryId: categoryId,
            manufacturerId: manufacturerId,
            sizes: sizesString,
            image: '', // Temporarily set to empty, will be updated after image upload
            fullSizeImage: '', // Temporarily set to empty, will be updated after image upload
            isVisible: row['Is Visible'] ? String(row['Is Visible']).toLowerCase() === 'yes' || String(row['Is Visible']).toLowerCase() === 'true' : true,
          };

          // Handle image upload
          let imageUrl = String(row['Image URL']);
          if (imageUrl) {
            try {
              const uploadedImage = await productService.uploadImageFromUrl(imageUrl);
              productData.image = uploadedImage.imageUrl; // Use the URL returned from the backend
              productData.fullSizeImage = uploadedImage.fullSizeImageUrl; // Set full size image URL
              newImportLog.push(`  Image for ${productCode} uploaded successfully.`);
              setImportLog([...newImportLog]);
            } catch (imageUploadError) {
              const msg = `Row ${rowIndex} (Code: ${productData.code}): Image upload failed - ${imageUploadError instanceof Error ? imageUploadError.message : String(imageUploadError)}`;
              errors.push(msg);
              newImportLog.push(`  Error: ${msg}`);
              setImportLog([...newImportLog]);
              productData.image = ''; // Set to empty if upload fails
            }
          }
          
          const existingProductByCode = productCodeMap.get(productData.code.toLowerCase());
          
          try {
            if (existingProductByCode) {
              await productService.updateProductAdmin({ ...productData, id: existingProductByCode.id });
              updatedCount++;
              newImportLog.push(`  Product ${productCode} updated.`);
              setImportLog([...newImportLog]);
            } else {
              await productService.addProductAdmin(productData);
              importedCount++;
              newImportLog.push(`  Product ${productCode} imported.`);
              setImportLog([...newImportLog]);
            }
          } catch (prodServiceError) {
             const msg = `Row ${rowIndex} (Code: ${productData.code}): Error processing - ${prodServiceError instanceof Error ? prodServiceError.message : String(prodServiceError)}`;
             errors.push(msg);
             newImportLog.push(`  Error: ${msg}`);
             setImportLog([...newImportLog]);
          }
        }
        
        let summaryMessage = "";
        if (importedCount > 0) summaryMessage += `${importedCount} products imported. `;
        if (updatedCount > 0) summaryMessage += `${updatedCount} products updated. `;
        
        if (errors.length > 0) {
          setActionError(`Import completed with errors. ${summaryMessage} See details below:\n- ${errors.join('\n- ')}`);
          newImportLog.push(`Import completed with errors. ${summaryMessage}`);
        } else if (summaryMessage) {
          setSuccessMessage(`Import successful! ${summaryMessage}`);
          newImportLog.push(`Import successful! ${summaryMessage}`);
        } else {
          setActionError("No products were imported or updated. Check file format or content.");
          newImportLog.push("No products were imported or updated. Check file format or content.");
        }
        setImportLog([...newImportLog]);

      } catch (err) {
        console.error("Error importing products:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('adminPage.tabProducts').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
        setImportLog(prev => [...prev, `Fatal Error: ${err instanceof Error ? err.message : String(err)}`]);
      } finally {
        setIsLoading(false);
        setIsImporting(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
        await loadProducts(true, 1);
        setSelectedProductIds([]); // Clear selected products after import
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const requestSort = (key: keyof Product | 'totalStock') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleClearFilters = () => {
    clearMessages();
    setSearchTerm('');
    setFilterCategoryId(ALL_FILTER_VALUE);
    setFilterManufacturerId(ALL_FILTER_VALUE);
    setSortConfig(null);
    setCurrentPage(1);
  };

  const categoryOptions = [{ value: ALL_FILTER_VALUE, label: t('common.all') }, ...categories.map(c => ({ value: c.id, label: c.name }))];
  const manufacturerOptions = [{ value: ALL_FILTER_VALUE, label: t('common.all') }, ...manufacturers.map(m => ({ value: m.id, label: m.name }))];

  const handleSelectProduct = (productId: string, isSelected: boolean) => {
    setSelectedProductIds(prev =>
      isSelected ? [...prev, productId] : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAllProductsOnPage = (isSelected: boolean) => {
    setSelectedProductIds(isSelected ? products.map(p => p.id) : []);
  };

  const handleBulkDeleteSelected = async () => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    if (selectedProductIds.length === 0) {
      setActionError(t('placeholders.noData'));
      return;
    }
    if (window.confirm(t('common.confirm'))) {
      setIsLoading(true);
      try {
        await productService.deleteProductsAdmin(selectedProductIds);
        setSuccessMessage(t('common.success'));
        const newTotalProducts = totalProducts - selectedProductIds.length;
        const newTotalPages = Math.ceil(newTotalProducts / itemsPerPage);
        const pageToLoadAfterDelete = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
        await loadProducts(true, pageToLoadAfterDelete);
        setSelectedProductIds([]);
      } catch (err) {
        console.error("Error deleting products:", err);
        setActionError(`${t('errors.failedToLoadData', { entity: t('adminPage.tabProducts').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
        await loadProducts(true, currentPage); // Force reload after deletion attempt
      }
    }
  };

  const handleOpenBulkEditModal = () => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    if (selectedProductIds.length === 0) {
      setActionError(t('placeholders.noData'));
      return;
    }
    setIsBulkEditModalOpen(true);
  };

  const handleCloseBulkEditModal = () => {
    setIsBulkEditModalOpen(false);
  };

  const handleBulkEditSave = async (updates: {
    categoryId?: string;
    manufacturerId?: string;
    isVisible?: boolean;
  }) => {
    if (!canEditProducts) {
        setActionError(t('errors.unauthorizedAccessMessage'));
        return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      await productService.bulkUpdateProductsAdmin(selectedProductIds, updates);
      setSuccessMessage(t('common.success'));
      await loadProducts(true, currentPage);
      setSelectedProductIds([]);
      setIsBulkEditModalOpen(false);
    } catch (err) {
      console.error("Error bulk editing products:", err);
      setActionError(`${t('errors.failedToLoadData', { entity: t('adminPage.tabProducts').toLowerCase() })}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && products.length === 0 && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('adminPage.tabProducts')}</h2>
        {canEditProducts && (
          <div className="flex items-center space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
            <Button onClick={handleImportProductsClick} variant="outline" leftIcon={<FiUpload />}>{t('common.import')}</Button>
            <Button onClick={handleExportProducts} variant="outline" leftIcon={<FiDownload />}>{t('common.export')}</Button>
            <Button onClick={handleOpenAddModal} variant="primary" leftIcon={<FiPlus />}>{t('common.addNew')}</Button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label={t('common.search')}
            id="productSearch"
            placeholder={t('common.search') + "..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<FiSearch />}
          />
          <Select
            label={t('common.category')}
            id="categoryFilter"
            options={categoryOptions}
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            disabled={isLoadingFilters}
          />
          <Select
            label={t('common.manufacturer')}
            id="manufacturerFilter"
            options={manufacturerOptions}
            value={filterManufacturerId}
            onChange={(e) => setFilterManufacturerId(e.target.value)}
            disabled={isLoadingFilters}
          />
          <div className="flex items-end">
            <Button onClick={handleClearFilters} variant="ghost" leftIcon={<FiX />}>{t('common.clearFiltersAndSort')}</Button>
          </div>
        </div>
      </div>

      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between bg-blue-100 p-4 rounded-lg">
          <p>{selectedProductIds.length} {t('common.productsSelected', { count: selectedProductIds.length })}</p>
          <div>
            <Button onClick={handleOpenBulkEditModal} variant="outline" className="mr-2">{t('common.bulkEdit')}</Button>
            <Button onClick={handleBulkDeleteSelected} variant="danger">{t('common.deleteSelected')}</Button>
          </div>
        </div>
      )}

      {isImporting && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">Import Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full text-xs flex justify-center items-center text-white"
              style={{ width: `${importProgress}%` }}
            >
              {importProgress}%
            </div>
          </div>
          <div className="bg-gray-100 p-3 rounded-md h-32 overflow-y-auto text-sm">
            {importLog.map((log, index) => (
              <p key={index} className={log.startsWith('  Error:') ? 'text-red-600' : ''}>{log}</p>
            ))}
          </div>
        </div>
      )}

      <ProductTable
        products={products}
        selectedProductIds={selectedProductIds}
        onSelectProduct={handleSelectProduct}
        onSelectAllProducts={handleSelectAllProductsOnPage}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteProduct}
        onToggleVisibility={handleToggleVisibility}
        onDuplicate={handleDuplicateProduct}
        readOnly={!canEditProducts}
        currentPageProducts={products}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-700">
          Showing {products.length} of {totalProducts} products
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || isLoading}
            variant="outline"
          >
            Next
          </Button>
          <Select
            id="itemsPerPage"
            name="itemsPerPage"
            options={ITEMS_PER_PAGE_OPTIONS.map(num => ({ value: String(num), label: String(num) }))}
            value={String(itemsPerPage)}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            disabled={isLoading}
            className="w-24"
          />
        </div>
      </div>

      {isModalOpen && canEditProducts && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          product={editingProduct}
          key={editingProduct ? editingProduct.id : 'new-product-modal'}
        />
      )}
      {isBulkEditModalOpen && canEditProducts && (
        <ProductBulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={handleCloseBulkEditModal}
          onSave={handleBulkEditSave}
          categories={categories}
          manufacturers={manufacturers}
          productsCount={selectedProductIds.length}
        />
      )}
    </div>
  );
};