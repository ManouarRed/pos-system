import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SubmittedSale, Product, Category, Manufacturer } from '../../../types';
import { salesService } from '../../../services/salesStorage';
import { productService } from '../../../services/productService';
import { PAYMENT_METHODS } from '../../../constants';
import { SummaryCard } from './SummaryCard';
import { SalesChart } from './SalesChart';
import { AnalyticsTable } from './AnalyticsTable';
import { RecentPurchases } from './RecentPurchases';
import { FullScreenLoader } from '../../common/FullScreenLoader';

export const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<SubmittedSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('Today');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedSales, fetchedProducts, fetchedCategoriesResponse, fetchedManufacturers] = await Promise.all([
          salesService.getSalesHistory(),
          productService.fetchProductsForReporting(),
          productService.fetchCategories(),
          productService.fetchManufacturers(),
        ]);
        setSales(fetchedSales);
        setProducts(fetchedProducts);
        setCategories(fetchedCategoriesResponse.items);
        setManufacturers(fetchedManufacturers);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getSalesForTimeRange = useCallback((range: 'Today' | '24 hours' | 'Week' | 'Month' | 'Year') => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'Today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '24 hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'Week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return sales; // Should not happen with defined ranges
    }

    return sales.filter(sale => new Date(sale.submissionDate) >= startDate);
  }, [sales]);

  const salesForSelectedTimeRange = useMemo(() => getSalesForTimeRange(timeRange), [getSalesForTimeRange, timeRange]);

  const todaySales = useMemo(() => getSalesForTimeRange('Today'), [getSalesForTimeRange]);
  const last24HoursSales = useMemo(() => getSalesForTimeRange('24 hours'), [getSalesForTimeRange]);
  const weekSales = useMemo(() => getSalesForTimeRange('Week'), [getSalesForTimeRange]);
  const monthSales = useMemo(() => getSalesForTimeRange('Month'), [getSalesForTimeRange]);
  const yearSales = useMemo(() => getSalesForTimeRange('Year'), [getSalesForTimeRange]);

  const chartData = useMemo(() => {
    const data: { name: string; Sales: number; Orders: number }[] = [];
    if (salesForSelectedTimeRange.length === 0) return data;

    const salesByHour: { [key: number]: { sales: number; orders: number } } = {};

    for (let i = 0; i < 24; i++) {
      salesByHour[i] = { sales: 0, orders: 0 };
    }

    salesForSelectedTimeRange.forEach(sale => {
      const hour = new Date(sale.submissionDate).getHours();
      salesByHour[hour].sales += sale.totalAmount;
      salesByHour[hour].orders += 1;
    });

    for (let i = 0; i < 24; i++) {
      data.push({
        name: `${i}:00`,
        Sales: salesByHour[i].sales,
        Orders: salesByHour[i].orders,
      });
    }

    return data;
  }, [salesForSelectedTimeRange]);

  const analyticsData = useMemo(() => {
    const data = {
      topProductsByQuantity: [],
      revenueByCategory: [],
      paymentMethodDistribution: [],
    };

    if (!salesForSelectedTimeRange.length || !products.length) return data;

    const productSaleDetails = {};
    const categoryRevenue = {};
    const paymentMethodsCount = {};

    for (const sale of salesForSelectedTimeRange) {
      paymentMethodsCount[sale.paymentMethod] = (paymentMethodsCount[sale.paymentMethod] || 0) + 1;

      for (const item of sale.items) {
        if (!productSaleDetails[item.productId]) {
          productSaleDetails[item.productId] = { quantity: 0, productDetails: products.find(p => p.id === item.productId) };
        }
        productSaleDetails[item.productId].quantity += item.quantity;

        const productDetail = productSaleDetails[item.productId].productDetails;
        if (productDetail) {
          categoryRevenue[productDetail.categoryId] = (categoryRevenue[productDetail.categoryId] || 0) + item.finalPrice;
        }
      }
    }

    data.topProductsByQuantity = Object.entries(productSaleDetails)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(([id, details]) => ({
        id,
        title: details.productDetails?.title || 'N/A',
        code: details.productDetails?.code || 'N/A',
        quantity: details.quantity
      }));

    data.revenueByCategory = Object.entries(categoryRevenue)
      .map(([catId, revenue]) => ({
        categoryName: categories.find(c => c.id === catId)?.name || catId,
        revenue
      }))
      .sort((a,b) => b.revenue - a.revenue);
    
    const totalSalesCount = salesForSelectedTimeRange.length;
    data.paymentMethodDistribution = PAYMENT_METHODS.map(method => {
      const count = paymentMethodsCount[method] || 0;
      return {
        method,
        count,
        percentage: totalSalesCount > 0 ? ((count / totalSalesCount) * 100).toFixed(1) + '%' : '0.0%'
      };
    });

    return data;
  }, [salesForSelectedTimeRange, products, categories]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (error) {
    return <p className="text-center text-red-500 py-10 bg-red-50 rounded-md">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <SummaryCard title="Today" value={`€${todaySales.reduce((acc, sale) => acc + sale.totalAmount, 0).toLocaleString()}`} subValue={`${todaySales.length} orders`} isActive={timeRange === 'Today'} onClick={() => setTimeRange('Today')} />
        <SummaryCard title="24 hours" value={`€${last24HoursSales.reduce((acc, sale) => acc + sale.totalAmount, 0).toLocaleString()}`} subValue={`${last24HoursSales.length} orders`} isActive={timeRange === '24 hours'} onClick={() => setTimeRange('24 hours')} />
        <SummaryCard title="Week" value={`€${weekSales.reduce((acc, sale) => acc + sale.totalAmount, 0).toLocaleString()}`} subValue={`${weekSales.length} orders`} isActive={timeRange === 'Week'} onClick={() => setTimeRange('Week')} />
        <SummaryCard title="Month" value={`€${monthSales.reduce((acc, sale) => acc + sale.totalAmount, 0).toLocaleString()}`} subValue={`${monthSales.length} orders`} isActive={timeRange === 'Month'} onClick={() => setTimeRange('Month')} />
        <SummaryCard title="Year" value={`€${yearSales.reduce((acc, sale) => acc + sale.totalAmount, 0).toLocaleString()}`} subValue={`${yearSales.length} orders`} isActive={timeRange === 'Year'} onClick={() => setTimeRange('Year')} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SalesChart data={chartData} title="Sales for today" line1Key="Sales" />
        <SalesChart data={chartData} title="Orders for today" line1Key="Orders" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsTable
          title="Top Products (by Quantity Sold)"
          data={analyticsData.topProductsByQuantity}
          columns={[
            { header: "Product Title", accessor: "title" },
            { header: "Code", accessor: "code" },
            { header: "Quantity Sold", accessor: "quantity" },
          ]}
        />
        <AnalyticsTable
          title="Revenue by Category"
          data={analyticsData.revenueByCategory}
          columns={[
            { header: "Category", accessor: "categoryName" },
            { header: "Revenue", accessor: "revenue", isCurrency: true },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsTable
          title="Payment Method Distribution"
          data={analyticsData.paymentMethodDistribution}
          columns={[
            { header: "Payment Method", accessor: "method" },
            { header: "Count", accessor: "count" },
            { header: "Percentage", accessor: "percentage", isPercentage: true },
          ]}
        />
      </div>
      <RecentPurchases purchases={salesForSelectedTimeRange.slice(0, 5)} />
    </div>
  );
};