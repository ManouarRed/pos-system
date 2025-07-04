
import React, { useState, useEffect, useMemo } from 'react';
import { SubmittedSale, Product, Category, Manufacturer, User } from '../../types';
import { productService } from '../../services/productService';
import { PAYMENT_METHODS } from '../../constants';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
// import { FilterIcon } from '../icons/FilterIcon'; // Not used
// import { CalendarIcon } from '../icons/CalendarIcon'; // Not used
import { useLanguage } from '../../contexts/LanguageContext';
import { FullScreenLoader } from '../common/FullScreenLoader';

interface SalesAnalyticsPageProps {
  currentUser: User;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, isCurrency }) => (
  <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
    <h3 className="text-sm sm:text-base font-medium text-gray-500 truncate">{title}</h3>
    <p className="mt-1 text-2xl sm:text-3xl font-semibold text-indigo-600">
      {isCurrency ? `€${Number(value).toFixed(2)}` : value}
    </p>
  </div>
);

interface AnalyticsData {
  totalRevenue: number;
  totalSalesCount: number;
  totalItemsSold: number;
  averageSaleValue: number;
  topProductsByQuantity: { id: string, title: string, code: string, quantity: number }[];
  topProductsByRevenue: { id: string, title: string, code: string, revenue: number }[];
  revenueByCategory: { categoryName: string, revenue: number }[];
  revenueByManufacturer: { manufacturerName: string, revenue: number }[];
  paymentMethodDistribution: { method: string, count: number, percentage: string }[];
  dailySales: { date: string, salesCount: number, totalRevenue: number }[];
}

const initialAnalyticsData: AnalyticsData = {
  totalRevenue: 0,
  totalSalesCount: 0,
  totalItemsSold: 0,
  averageSaleValue: 0,
  topProductsByQuantity: [],
  topProductsByRevenue: [],
  revenueByCategory: [],
  revenueByManufacturer: [],
  paymentMethodDistribution: [],
  dailySales: [],
};

export const SalesAnalyticsPage: React.FC<SalesAnalyticsPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [sales, setSales] = useState<SubmittedSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const canViewFullHistory = currentUser.role === 'admin' || !!currentUser.permissions?.viewFullSalesHistory;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedSales, fetchedProductDetails, fetchedCategoriesResponse, fetchedManufacturers] = await Promise.all([
          productService.fetchSubmittedSales(),
          productService.fetchProductsForReporting(), 
          productService.fetchCategories(),
          productService.fetchManufacturers(),
        ]);
        setSales(fetchedSales);
        setProducts(fetchedProductDetails); 
        setCategories(fetchedCategoriesResponse.items);
        setManufacturers(fetchedManufacturers);
      } catch (err) {
        console.error("Error loading analytics data:", err);
        setError(t('errors.failedToLoadData', { entity: t('adminPage.tabAnalytics').toLowerCase() }));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [t]);

  const filteredSales = useMemo(() => {
    const todayString = new Date().toDateString();
    return sales.filter(sale => {
      if (!sale.submissionDate) { 
        console.warn("Sale object missing submissionDate:", sale);
        return false; 
      }
      const saleDate = new Date(sale.submissionDate);
      if (!canViewFullHistory) {
        return saleDate.toDateString() === todayString;
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
      return true;
    });
  }, [sales, filterDateFrom, filterDateTo, canViewFullHistory]);


  const analyticsData = useMemo((): AnalyticsData => {
    if (!filteredSales.length || !products.length) return initialAnalyticsData;

    const data: AnalyticsData = { ...initialAnalyticsData, topProductsByQuantity: [], topProductsByRevenue: [], revenueByCategory: [], revenueByManufacturer: [], paymentMethodDistribution: [], dailySales: [] };

    data.totalSalesCount = filteredSales.length;

    const productSaleDetails: Record<string, { quantity: number, revenue: number, productDetails?: Product }> = {};
    const categoryRevenue: Record<string, number> = {};
    const manufacturerRevenue: Record<string, number> = {};
    const paymentMethodsCount: Record<string, number> = {};
    const dailySalesMap: Record<string, { salesCount: number, totalRevenue: number }> = {};

    for (const sale of filteredSales) {
      data.totalRevenue += sale.totalAmount;
      data.totalItemsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);

      const saleDay = (sale.submissionDate && typeof sale.submissionDate === 'string') 
                      ? sale.submissionDate.split('T')[0] 
                      : 'UnknownDate';

      if (!dailySalesMap[saleDay]) {
        dailySalesMap[saleDay] = { salesCount: 0, totalRevenue: 0 };
      }
      dailySalesMap[saleDay].salesCount++;
      dailySalesMap[saleDay].totalRevenue += sale.totalAmount;

      paymentMethodsCount[sale.paymentMethod] = (paymentMethodsCount[sale.paymentMethod] || 0) + 1;

      for (const item of sale.items) {
        if (!productSaleDetails[item.productId]) {
          productSaleDetails[item.productId] = { quantity: 0, revenue: 0, productDetails: products.find(p => p.id === item.productId) };
        }
        productSaleDetails[item.productId].quantity += item.quantity;
        productSaleDetails[item.productId].revenue += item.finalPrice;

        const productDetail = productSaleDetails[item.productId].productDetails;
        if (productDetail) {
          categoryRevenue[productDetail.categoryId] = (categoryRevenue[productDetail.categoryId] || 0) + item.finalPrice;
          manufacturerRevenue[productDetail.manufacturerId] = (manufacturerRevenue[productDetail.manufacturerId] || 0) + item.finalPrice;
        }
      }
    }

    data.averageSaleValue = data.totalSalesCount > 0 ? data.totalRevenue / data.totalSalesCount : 0;

    data.topProductsByQuantity = Object.entries(productSaleDetails)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(([id, details]) => ({
        id,
        title: details.productDetails?.title || t('placeholders.noData'),
        code: details.productDetails?.code || 'N/A',
        quantity: details.quantity
      }));

    data.topProductsByRevenue = Object.entries(productSaleDetails)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([id, details]) => ({
        id,
        title: details.productDetails?.title || t('placeholders.noData'),
        code: details.productDetails?.code || 'N/A',
        revenue: details.revenue
      }));
    
    data.revenueByCategory = Object.entries(categoryRevenue)
      .map(([catId, revenue]) => ({
        categoryName: categories.find(c => c.id === catId)?.name || catId,
        revenue
      }))
      .sort((a,b) => b.revenue - a.revenue);

    data.revenueByManufacturer = Object.entries(manufacturerRevenue)
      .map(([manId, revenue]) => ({
        manufacturerName: manufacturers.find(m => m.id === manId)?.name || manId,
        revenue
      }))
      .sort((a,b) => b.revenue - a.revenue);
    
    data.paymentMethodDistribution = PAYMENT_METHODS.map(method => {
      const count = paymentMethodsCount[method] || 0;
      return {
        method,
        count,
        percentage: data.totalSalesCount > 0 ? ((count / data.totalSalesCount) * 100).toFixed(1) + '%' : '0.0%'
      };
    });

    data.dailySales = Object.entries(dailySalesMap)
      .map(([date, details]) => ({ date, ...details }))
      .sort((a, b) => {
        if (a.date === 'UnknownDate') return 1; 
        if (b.date === 'UnknownDate') return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }); 

    return data;
  }, [filteredSales, products, categories, manufacturers, t]);

  const handleClearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const renderTable = (title: string, data: any[], columns: { header: string, accessor: string, isCurrency?: boolean, isPercentage?: boolean }[]) => (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      {data.length === 0 ? <p className="text-sm text-gray-500">{t('placeholders.noData')}</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.accessor} className="py-2 px-3 text-left font-medium text-gray-600">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.accessor} className="py-2 px-3 text-gray-700">
                      {col.isCurrency ? `€${Number(row[col.accessor]).toFixed(2)}` : 
                       col.isPercentage ? row[col.accessor] :
                       row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (error) {
    return <p className="text-center text-red-500 py-10 bg-red-50 rounded-md">{error}</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">{t('adminPage.tabAnalytics')}</h2>
            {!canViewFullHistory && (
                <p className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded-md">
                    {t('common.displayingTodaySales')}
                </p>
            )}
        </div>
      

      {canViewFullHistory && (
        <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 space-y-4 sm:space-y-0 sm:flex sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Input
                label={t('common.dateFrom')}
                type="date"
                id="filterDateFromAnalytics"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                containerClassName="w-full sm:w-auto"
            />
            <Input
                label={t('common.dateTo')}
                type="date"
                id="filterDateToAnalytics"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                containerClassName="w-full sm:w-auto"
            />
            </div>
            <Button 
                onClick={handleClearFilters} 
                variant="secondary" 
                size="md" 
                className="w-full sm:w-auto mt-2 sm:mt-0"
                disabled={!filterDateFrom && !filterDateTo}
            >
            {t('common.clearDateFilters')}
            </Button>
        </div>
      )}


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard title={t('analytics.totalRevenue')} value={analyticsData.totalRevenue} isCurrency />
        <MetricCard title={t('analytics.totalSales')} value={analyticsData.totalSalesCount} />
        <MetricCard title={t('analytics.totalItemsSold')} value={analyticsData.totalItemsSold} />
        <MetricCard title={t('analytics.averageSaleValue')} value={analyticsData.averageSaleValue} isCurrency />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable(t('analytics.topProductsByQuantity'), analyticsData.topProductsByQuantity, [
          { header: t('common.productTitle'), accessor: "title" },
          { header: t('common.code'), accessor: "code" },
          { header: t('analytics.quantitySold'), accessor: "quantity" },
        ])}
        {renderTable(t('analytics.topProductsByRevenue'), analyticsData.topProductsByRevenue, [
          { header: t('common.productTitle'), accessor: "title" },
          { header: t('common.code'), accessor: "code" },
          { header: t('common.revenue'), accessor: "revenue", isCurrency: true },
        ])}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {renderTable(t('analytics.revenueByCategory'), analyticsData.revenueByCategory, [
          { header: t('common.category'), accessor: "categoryName" },
          { header: t('common.revenue'), accessor: "revenue", isCurrency: true },
        ])}
        {renderTable(t('analytics.revenueByManufacturer'), analyticsData.revenueByManufacturer, [
          { header: t('common.manufacturer'), accessor: "manufacturerName" },
          { header: t('common.revenue'), accessor: "revenue", isCurrency: true },
        ])}
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable(t('analytics.paymentMethodDistribution'), analyticsData.paymentMethodDistribution, [
          { header: t('common.paymentMethod'), accessor: "method" },
          { header: t('analytics.salesCount'), accessor: "count" },
          { header: t('common.percentage'), accessor: "percentage", isPercentage: true },
        ])}
         {renderTable(t('analytics.dailySalesSummary'), analyticsData.dailySales, [
            { header: t('common.date'), accessor: "date" },
            { header: t('analytics.salesCount'), accessor: "salesCount" },
            { header: t('analytics.totalRevenue'), accessor: "totalRevenue", isCurrency: true },
        ])}
      </div>
    </div>
  );
};
