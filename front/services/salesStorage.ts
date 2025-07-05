import { SubmittedSale, SaleItemRecord, PaymentMethod } from '../types';
import { productService } from './productService';

export const salesService = {
  submitSale: async (
    items: SaleItemRecord[], 
    total: number, 
    paymentMethod: PaymentMethod, 
    notes?: string
  ): Promise<SubmittedSale> => {
    return await productService.submitSaleToHistory(items, total, paymentMethod, notes);
  },

  getSalesHistory: async (): Promise<SubmittedSale[]> => {
    return await productService.fetchSubmittedSales();
  },

  updateSale: async (updatedSale: SubmittedSale): Promise<SubmittedSale | undefined> => {
    return await productService.updateSubmittedSale(updatedSale);
  },

  deleteSales: async (saleIds: string[]): Promise<{ success: boolean, message?: string }> => {
    return await productService.deleteSalesAdmin(saleIds);
  },

  getSalesByDateRange: async (startDate: Date, endDate: Date): Promise<SubmittedSale[]> => {
    const allSales = await productService.fetchSubmittedSales();
    const startTime = startDate.getTime();
    const endTime = new Date(endDate.setHours(23, 59, 59, 999)).getTime();

    return allSales.filter(sale => {
      const saleTime = new Date(sale.submissionDate).getTime();
      return saleTime >= startTime && saleTime <= endTime;
    });
  },
};