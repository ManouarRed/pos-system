
import { Product, ProductFormData, Category, Manufacturer, SubmittedSale, SaleItem, SaleItemRecord, PaymentMethod, User, UserRole, SizeStock } from '../types';
// Constants like UNCATEGORIZED_ID are still useful for frontend default logic if backend doesn't provide them or for specific UI cases.
// However, the backend will be the source of truth for IDs when creating/assigning.
import { UNCATEGORIZED_ID, UNKNOWN_MANUFACTURER_ID } from '../constants';

// For local development, this will now be proxied by Vite's dev server.
// For production, ensure your reverse proxy (e.g., Nginx, Caddy) handles this correctly.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; 

interface ApiError {
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}


const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status} ${response.statusText}` }));
    console.error('API Error:', errorData);
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) { // No Content
    return null as T; // Or an appropriate empty value depending on T
  }
  return response.json() as Promise<T>;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken'); // Assuming token is stored after login
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const productService = {
  // --- User Authentication & Management ---
  authenticateUser: async (username: string, passwordInput: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordInput }),
      });
      const data = await handleApiResponse<{ token: string; user: User }>(response);
      if (data && data.token && data.user) {
        localStorage.setItem('authToken', data.token); // Store the token
        // The user object returned from backend should not include password/hashedPassword
        return data.user;
      }
      return null;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error; // Re-throw to be caught by UI
    }
  },

  fetchCurrentUser: async (): Promise<User | null> => {
    // This would be called at app start if a token exists to validate session
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders(),
        });
        return await handleApiResponse<User | null>(response);
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        localStorage.removeItem('authToken'); // Clear invalid token
        localStorage.removeItem('currentUser');
        return null;
    }
  },

  fetchUsersAdmin: async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    return handleApiResponse<User[]>(response);
  },

  addUserAdmin: async (userData: Omit<User, 'id' | 'hashedPassword'>): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleApiResponse<User>(response);
  },

  updateUserAdmin: async (userId: string, updates: Partial<Pick<User, 'username' | 'password' | 'role' | 'permissions'>>): Promise<User | undefined> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleApiResponse<User | undefined>(response);
  },

  deleteUserAdmin: async (userIdToDelete: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/users/${userIdToDelete}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    // Assuming backend returns { success: true } or similar on successful delete
    const data = await handleApiResponse<{ success: boolean }>(response);
    return data.success;
  },

  // --- Categories ---
  fetchCategories: async (page: number = 1, limit: number = 10): Promise<PaginatedResponse<Category>> => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    const response = await fetch(`${API_BASE_URL}/categories?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<Category>>(response);
  },
  // New method to fetch all categories without pagination
  fetchAllCategories: async (): Promise<Category[]> => {
    const response = await fetch(`${API_BASE_URL}/categories?limit=9999`); // Fetch a very large number to get all
    const paginatedResponse = await handleApiResponse<PaginatedResponse<Category>>(response);
    return paginatedResponse.items;
  },
  addCategoryAdmin: async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    return handleApiResponse<Category>(response);
  },
  // New method to find or create a category by name
  findOrCreateCategoryByName: async (name: string): Promise<Category> => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleApiResponse<Category>(response);
  },
  updateCategoryAdmin: async (categoryData: Category): Promise<Category | undefined> => {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryData.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    return handleApiResponse<Category | undefined>(response);
  },
  deleteCategoryAdmin: async (categoryId: string): Promise<{ success: boolean, message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<{ success: boolean, message?: string }>(response);
  },

  // --- Manufacturers ---
  fetchManufacturers: async (): Promise<Manufacturer[]> => { // Pagination can be added similarly if needed
    const response = await fetch(`${API_BASE_URL}/manufacturers`);
    return handleApiResponse<Manufacturer[]>(response);
  },
  addManufacturerAdmin: async (data: Omit<Manufacturer, 'id'>): Promise<Manufacturer> => {
     const response = await fetch(`${API_BASE_URL}/manufacturers`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleApiResponse<Manufacturer>(response);
  },
  // New method to find or create a manufacturer by name
  findOrCreateManufacturerByName: async (name: string): Promise<Manufacturer> => {
    const response = await fetch(`${API_BASE_URL}/manufacturers`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleApiResponse<Manufacturer>(response);
  },
  updateManufacturerAdmin: async (data: Manufacturer): Promise<Manufacturer | undefined> => {
    const response = await fetch(`${API_BASE_URL}/manufacturers/${data.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleApiResponse<Manufacturer | undefined>(response);
  },
  deleteManufacturerAdmin: async (id: string): Promise<{ success: boolean, message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/manufacturers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<{ success: boolean, message?: string }>(response);
  },

  // --- Products ---
  // For POS view (filters by isVisible=true, category, search term)
  fetchProducts: async (query?: string, categoryId?: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (categoryId && categoryId !== "All Categories") params.append('categoryId', categoryId);
    
    const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`); // No auth for public product listing
    return handleApiResponse<Product[]>(response);
  },

  fetchProductById: async (id: string): Promise<Product | undefined> => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`); // No auth for public product detail
    return handleApiResponse<Product | undefined>(response);
  },

  fetchProductsForReporting: async (): Promise<Product[]> => {
    const response = await fetch(`${API_BASE_URL}/products/details-for-reporting`, { headers: getAuthHeaders() });
    return handleApiResponse<Product[]>(response);
  },

  // For Admin view (fetches all products regardless of visibility, with pagination, filtering, sorting)
  fetchAllProductsAdmin: async (
    page: number = 1,
    limit: number = 20,
    searchTerm?: string,
    categoryId?: string, // category UUID
    manufacturerId?: string, // manufacturer UUID
    sortKey?: keyof Product | 'totalStock',
    sortDirection?: 'ascending' | 'descending'
  ): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (categoryId && categoryId !== "ALL") params.append('categoryId', categoryId);
    if (manufacturerId && manufacturerId !== "ALL") params.append('manufacturerId', manufacturerId);
    if (sortKey) params.append('sortKey', sortKey);
    if (sortDirection) params.append('sortDirection', sortDirection);

    const response = await fetch(`${API_BASE_URL}/products/admin?${params.toString()}`, { headers: getAuthHeaders() });
    return handleApiResponse<PaginatedResponse<Product>>(response);
  },

  addProductAdmin: async (productData: ProductFormData): Promise<Product> => {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(productData), // ProductFormData is compatible, sizes is string
    });
    return handleApiResponse<Product>(response);
  },

  updateProductAdmin: async (productData: ProductFormData): Promise<Product | undefined> => {
    if (!productData.id) throw new Error("Product ID is required for update via API.");
    const response = await fetch(`${API_BASE_URL}/products/${productData.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(productData), // ProductFormData is compatible
    });
    return handleApiResponse<Product | undefined>(response);
  },

  deleteProductAdmin: async (productId: string): Promise<boolean> => {
     const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await handleApiResponse<{ success: boolean }>(response);
    return data.success;
  },

  deleteProductsAdmin: async (productIds: string[]): Promise<{ success: boolean, message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/products/bulk-delete`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    });
    return handleApiResponse<{ success: boolean, message?: string }>(response);
  },

  toggleProductVisibilityAdmin: async (productId: string): Promise<Product | undefined> => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/toggle-visibility`, {
      method: 'PATCH', // Or PUT if you prefer for this kind of toggle
      headers: getAuthHeaders(),
    });
    return handleApiResponse<Product | undefined>(response);
  },
  
  // Used from POSForm after a sale to reduce stock
  updateStock: async (productId: string, sizeSold: string, quantitySold: number): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/stock`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizeName: sizeSold, newStock: -quantitySold, action: 'sell' }), 
    });
    const data = await handleApiResponse<{ success?: boolean, product?: Product }>(response);
    return data.success ?? (!!data.product);
  },

  updateProductStockAdmin: async (productId: string, sizeName: string | null, newStockValue: number | null, updatedSizesArray?: SizeStock[]): Promise<Product | undefined> => {
    let payload;
    if (updatedSizesArray) {
        payload = { updatedSizesArray }; 
    } else if (sizeName !== null && newStockValue !== null) {
        payload = { sizeName: sizeName, newStock: newStockValue }; 
    } else {
        throw new Error("Invalid parameters for updateProductStockAdmin");
    }

    const response = await fetch(`${API_BASE_URL}/products/${productId}/stock`, {
        method: 'PUT', 
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleApiResponse<Product | undefined>(response);
},


  duplicateProductAdmin: async (productId: string): Promise<Product | undefined> => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<Product | undefined>(response);
  },

  // --- Sales ---
  submitSaleToHistory: async (saleItems: SaleItem[], totalAmount: number, paymentMethod: PaymentMethod, saleNotes?: string): Promise<SubmittedSale> => {
    const saleData = {
      items: saleItems.map(item => {
        console.log("DEBUG: Processing sale item:", item);
        if (item.isManual) {
          return {
            productId: null, // Explicitly null for manual products
            title: item.manualTitle || 'Manual Item',
            code: item.manualCode || 'N/A',
            image: '',
            fullSizeImage: '',
            selectedSize: item.manualSelectedSize || 'N/A',
            quantity: item.manualQuantity || 0,
            unitPrice: item.manualPrice || 0,
            discount: item.manualDiscount || 0,
            finalPrice: (item.manualPrice || 0) * (item.manualQuantity || 0) - (item.manualDiscount || 0),
            isManual: true, // Explicitly set isManual to true
          };
        } else {
          return {
            productId: item.product?.id,
            title: item.product?.title || '',
            code: item.product?.code || '',
            image: item.product?.image || '',
            fullSizeImage: item.product?.fullSizeImage || '',
            selectedSize: item.selectedSize,
            quantity: item.quantity,
            unitPrice: item.product?.price || 0,
            discount: item.discount,
            finalPrice: (item.product?.price || 0) * item.quantity - item.discount,
            isManual: false, // Explicitly set isManual to false
          };
        }
      }),
      totalAmount,
      paymentMethod,
      submissionDate: new Date().toISOString(), 
      notes: saleNotes,
    };
    const response = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    });
    return handleApiResponse<SubmittedSale>(response);
  },

  fetchSubmittedSales: async (): Promise<SubmittedSale[]> => {
    const response = await fetch(`${API_BASE_URL}/sales`, { headers: getAuthHeaders() });
    return handleApiResponse<SubmittedSale[]>(response);
  },

  updateSubmittedSale: async (updatedSaleData: SubmittedSale): Promise<SubmittedSale | undefined> => {
    const response = await fetch(`${API_BASE_URL}/sales/${updatedSaleData.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSaleData),
    });
    return handleApiResponse<SubmittedSale | undefined>(response);
  },

  deleteSalesAdmin: async (saleIds: string[]): Promise<{ success: boolean, message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/sales/bulk-delete`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleIds }),
    });
    return handleApiResponse<{ success: boolean, message?: string }>(response);
  },

  adjustProductStockAdmin: async (productId: string, size: string, quantityChange: number): Promise<Product | undefined> => {
     console.warn("adjustProductStockAdmin: Consider using updateProductStockAdmin with the new absolute stock value or ensuring backend supports delta changes.");
    return Promise.resolve(undefined); 
  },

  // --- Data Management (Backup/Restore) ---
  createBackup: async (): Promise<{ message: string; filename: string }> => {
    const response = await fetch(`${API_BASE_URL}/data/backup`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleApiResponse<{ message: string; filename: string }>(response);
  },

  listBackups: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/data/backups`, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse<string[]>(response);
  },

  restoreBackup: async (filename: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/data/restore`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    return handleApiResponse<{ message: string }>(response);
  },

  // --- Image Upload ---
  uploadImageFromUrl: async (imageUrl: string): Promise<{ imageUrl: string, fullSizeImageUrl: string }> => {
    const response = await fetch(`${API_BASE_URL}/images/upload-from-url`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    return handleApiResponse<{ imageUrl: string, fullSizeImageUrl: string }>(response);
  },
};
