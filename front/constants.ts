
import { Product, Category, PaymentMethod, Manufacturer, SubmittedSale, SizeStock, User } from './types';

export const UNCATEGORIZED_ID = 'cat_uncategorized';
export const UNKNOWN_MANUFACTURER_ID = 'man_unknown';

// Kept PAYMENT_METHODS as it's used directly by the UI and not typically fetched from backend in this manner.
export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Card',
];

// Removed MOCK_PRODUCTS, CATEGORIES_DATA, MANUFACTURERS_DATA, MOCK_SUBMITTED_SALES, MOCK_USERS
// as this data will be managed by the backend and database.
// The setup wizard and backend install process will be responsible for any initial data seeding.