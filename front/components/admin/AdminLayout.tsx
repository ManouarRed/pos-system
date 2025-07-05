
import React from 'react';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Dashboard } from './Dashboard'; // Import the Dashboard component

const AdminLayout: React.FC<{ children: React.ReactNode, currentUser: User }> = ({ children, currentUser }) => {
  const { t } = useLanguage();
  const location = useLocation();

  const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/';

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Hello 👋 {currentUser.username}</h2>
        {isDashboard ? (
          <Dashboard />
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <p className="text-gray-600">{t('adminDashboard.welcomeMessage')}</p>
            <p className="text-gray-600 mt-2">{t('adminDashboard.onlineShopInfo')}</p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
