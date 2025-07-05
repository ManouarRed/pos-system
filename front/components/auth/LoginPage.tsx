
import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useLanguage } from '../../contexts/LanguageContext';
import { productService } from '../../services/productService';
import { User } from '../../types';
import { LanguageSwitcher } from '../common/LanguageSwitcher'; // Import LanguageSwitcher

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await productService.authenticateUser(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError(t('loginPage.errorMessage'));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t('loginPage.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 p-4 selection:bg-red-500 selection:text-white">
      <div className="bg-[#111111] text-white p-8 sm:p-12 rounded-xl shadow-2xl w-full max-w-md relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="flex justify-center mb-8 pt-8 sm:pt-0"> {/* Added padding top for mobile if switcher pushes content */}
          {/* Placeholder for logos - replace with actual img tag if logo is available */}
          <div className="w-40 h-16 bg-gray-700 flex items-center justify-center rounded">
             <img src="https://store.doubleredcars.eu/wp-content/uploads/2025/03/cropped-logo-1-1024x699.png" alt="Logo" className="h-12" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-center text-gray-100 mb-2">{t('loginPage.storeTitle')}</h1>
        <p className="text-sm text-center text-gray-400 font-medium tracking-wider uppercase">{t('loginPage.welcomeBack')}</p>
        <p className="text-center text-gray-300 mb-8">{t('loginPage.instruction')}</p>

        {error && (
          <p className="bg-red-700 bg-opacity-50 text-red-100 p-3 rounded-md text-sm mb-6 text-center" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label={t('loginPage.usernameOrEmailLabel')}
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="" // Placeholder removed as per design
            autoComplete="username"
            disabled={isLoading}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-red-500 focus:border-red-500 rounded-lg px-4 py-3"
            labelClassName="text-gray-400 text-sm"
          />
          <Input
            label={t('loginPage.passwordLabel')}
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="" // Placeholder removed as per design
            autoComplete="current-password"
            disabled={isLoading}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-red-500 focus:border-red-500 rounded-lg px-4 py-3"
            labelClassName="text-gray-400 text-sm"
          />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-red-600 border-gray-600 rounded focus:ring-red-500 bg-gray-700"
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-2 text-gray-400">
                {t('loginPage.rememberMe')}
              </label>
            </div>
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white rounded-lg py-3 font-semibold" 
            disabled={isLoading}
          >
            {isLoading ? t('common.loading') : t('loginPage.loginButton')}
          </Button>
        </form>
        
        <p className="text-xs text-gray-500 mt-8 text-center">
          © {new Date().getFullYear()} Double Red Cars Museum all right reserved
        </p>
      </div>
    </div>
  );
};
