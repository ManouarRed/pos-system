
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { POSForm } from './POSForm';
import { AdminPage } from './admin/AdminPage';
import { ProductManagementPage } from './admin/ProductManagementPage';
import { CategoryManagementPage } from './admin/CategoryManagementPage';
import { ManufacturerManagementPage } from './admin/ManufacturerManagementPage';
import { InventoryOverviewPage } from './admin/InventoryOverviewPage';
import { Dashboard } from './admin/Dashboard';
import { SalesHistoryPage } from './admin/SalesHistoryPage';
import { UserManagementPage } from './admin/UserManagementPage';
import { MySalesHistoryPage } from './MySalesHistoryPage';
import { AppSettingsPage } from './admin/AppSettingsPage';
import { LoginPage } from './auth/LoginPage';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './common/LanguageSwitcher';
import { User } from '../../types';
import { productService } from '../services/productService';
import { FiUser, FiLogOut, FiSettings, FiShoppingCart } from 'react-icons/fi';
import { FaReceipt } from 'react-icons/fa';
import { FullScreenLoader } from './common/FullScreenLoader';

export const AppRoutes: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const { t } = useLanguage();
  const navigate = useNavigate();

  console.log("AppRoutes: currentUser", currentUser);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const userFromApi = await productService.fetchCurrentUser();
          if (userFromApi) {
            setCurrentUser(userFromApi);
            if (userFromApi.role === 'admin') {
              navigate('/admin');
            } else {
              navigate('/pos');
            }
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error("Session validation error:", error);
          handleLogout();
        }
      }
      setIsLoadingSession(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/pos');
    }
  };

  if (isLoadingSession) {
    return <FullScreenLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {currentUser && (
        <nav className="bg-indigo-700 text-white shadow-md print:hidden">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <img src="https://cdn.myshoptet.com/usr/www.doublered.eu/user/logos/logo_new--header-1.svg" alt="DOUBLE RED Logo" className="h-8 mr-3" />
              <h1 className="text-xl sm:text-2xl font-bold">{t('app.titlePOS')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <FiUser className="w-5 h-5 mr-2" />
                <span>{currentUser.username}</span>
              </div>
              <LanguageSwitcher />
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center text-sm hover:bg-indigo-600 px-3 py-2 rounded-md"
                >
                  <FiSettings className="w-5 h-5 mr-2" />
                  <span>{t('app.navDashboard')}</span>
                </button>
              )}
              <button
                onClick={() => navigate('/pos')}
                className="flex items-center text-sm hover:bg-indigo-600 px-3 py-2 rounded-md"
              >
                <FiShoppingCart className="w-5 h-5 mr-2" />
                <span>{t('app.navPOS')}</span>
              </button>
              {currentUser.role === 'employee' && (
                <button
                  onClick={() => navigate('/my-sales')}
                  className="flex items-center text-sm hover:bg-indigo-600 px-3 py-2 rounded-md"
                >
                  <FaReceipt className="w-5 h-5 mr-2" />
                  <span>{t('app.navMySales')}</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center text-sm hover:bg-indigo-600 px-3 py-2 rounded-md"
              >
                <FiLogOut className="w-5 h-5 mr-2" />
                <span>{t('app.navLogout')}</span>
              </button>
            </div>
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/pos" element={currentUser ? <POSForm /> : <Navigate to="/login" />} />
        <Route path="/my-sales" element={currentUser && currentUser.role === 'employee' ? <MySalesHistoryPage currentUser={currentUser} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={currentUser ? <AdminPage currentUser={currentUser} /> : <Navigate to="/login" />}>
          <Route path="inventory" element={<InventoryOverviewPage currentUser={currentUser} />} />
          <Route path="products" element={<ProductManagementPage currentUser={currentUser} />} />
          <Route path="categories" element={<CategoryManagementPage />} />
          <Route path="manufacturers" element={<ManufacturerManagementPage />} />
          <Route path="users" element={<UserManagementPage currentUser={currentUser} />} />
          <Route path="sales-history" element={<SalesHistoryPage currentUser={currentUser} />} />
          <Route path="analytics" element={<Dashboard />} />
          <Route path="settings" element={<AppSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={currentUser ? "/pos" : "/login"} />} />
      </Routes>
      <footer className="bg-gray-200 text-gray-600 text-center p-4 text-sm print:hidden">
       
        <p>© {new Date().getFullYear()} Double Red Cars Museum all right reserved, made with passion by Manouar ❤️</p>
      </footer>
    </div>
  );
};
