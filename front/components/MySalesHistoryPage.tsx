import React, { useState, useEffect } from 'react';
import { SubmittedSale, User } from '../types';
import { productService } from '../services/productService';
import { SalesHistoryTable } from './admin/SalesHistoryTable';
import { FullScreenLoader } from './common/FullScreenLoader';
import { useLanguage } from '../contexts/LanguageContext';
import { MySalesAnalyticsPage } from './MySalesAnalyticsPage';

interface MySalesHistoryPageProps {
  currentUser: User;
}

export const MySalesHistoryPage: React.FC<MySalesHistoryPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [sales, setSales] = useState<SubmittedSale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');

  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedSales = await productService.fetchSubmittedSales();
        setSales(fetchedSales);
      } catch (err) {
        console.error("Failed to fetch sales:", err);
        setError(t('errors.failedToLoadData', { entity: t('common.sales') }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSales();
  }, [t]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-8">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('mySalesHistory.title')}</h1>

      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => setActiveTab('history')}
              type="button"
              role="tab"
              aria-controls="sales-history-tab-panel"
              aria-selected={activeTab === 'history'}
            >
              {t('mySalesHistory.historyTab')}
            </button>
          </li>
          <li className="me-2" role="presentation">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => setActiveTab('analytics')}
              type="button"
              role="tab"
              aria-controls="sales-analytics-tab-panel"
              aria-selected={activeTab === 'analytics'}
            >
              {t('mySalesHistory.analyticsTab')}
            </button>
          </li>
        </ul>
      </div>

      <div id="sales-history-tab-panel" role="tabpanel" aria-labelledby="sales-history-tab" className={`${activeTab === 'history' ? 'block' : 'hidden'}`}>
        <SalesHistoryTable
          sales={sales}
          onEdit={() => {}} // No edit functionality for employees on this page
          canEditSales={false}
          selectedSaleIds={[]}
          onSelectSale={() => {}} // No selection functionality
          onSelectAllSales={() => {}} // No selection functionality
        />
      </div>

      <div id="sales-analytics-tab-panel" role="tabpanel" aria-labelledby="sales-analytics-tab" className={`${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
        <MySalesAnalyticsPage currentUser={currentUser} />
      </div>
    </div>
  );
};