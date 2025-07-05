
export interface SizeStock {
  size: string;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Manufacturer {
  id: string;
  name: string;
}

export type UserRole = 'admin' | 'employee';

export interface UserPermissions {
  editProducts?: boolean;
  accessInventory?: boolean;
  viewFullSalesHistory?: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Password will be plain text for this mock. Optional for listing.
  role: UserRole;
  permissions?: UserPermissions;
  // Simulating a hashed password for new/updated ones in mock service
  hashedPassword?: string; // Only used internally in mock service
}


export interface Product {
  id: string;
  title: string;
  price: number;
  image: string; // URL of the thumbnail image
  fullSizeImage: string; // URL of the full-size image
  code: string;
  sizes: SizeStock[]; // Array of objects, each with size name and stock quantity
  categoryId: string;
  manufacturerId: string; 
  isVisible: boolean;
  // For convenience, services might populate these
  categoryName?: string;
  manufacturerName?: string;
  totalStock?: number; // Calculated total stock
}

export type ProductFormData = Omit<Product, 'id' | 'sizes' | 'categoryName' | 'manufacturerName' | 'totalStock'> & {
  id?: string; 
  sizes: string; // JSON string of SizeStock[] e.g., '[{"size":"S", "stock":10}, {"size":"M", "stock":20}]'
  manufacturerId: string;
};


export interface SaleItem {
  id: string; 
  product?: Product; // Optional: will be undefined for manual products
  isManual?: boolean; // True if this is a manually added item
  manualTitle?: string;
  manualPrice?: number;
  manualDiscount?: number;
  manualQuantity?: number;
  manualCode?: string; // New: Code for manual product
  manualSelectedSize?: string; // New: Size for manual product
  selectedSize: string; 
  quantity: number;
  discount: number; 
  note: string;
}

export interface SaleItemWithFinalPrice extends SaleItem {
  finalPrice: number;
}

export type PaymentMethod = string;

export interface SaleItemRecord {
  productId?: string; // Made optional for manual products
  title: string;
  code: string;
  image: string;
  fullSizeImage: string; // Added fullSizeImage
  selectedSize: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  finalPrice: number;
}

export interface SubmittedSale {
  id: string;
  items: SaleItemRecord[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  submissionDate: string; // ISO string date
  notes?: string;
  submitted_by_username?: string; // Added to store who submitted the sale
}