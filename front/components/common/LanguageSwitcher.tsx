import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FiGlobe } from 'react-icons/fi';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', Icon: FiGlobe },
    { code: 'sk', label: 'Slovenčina', Icon: FiGlobe },
  ];

  const selectedLanguage = languages.find(lang => lang.code === language) || languages[0];

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectLanguage = (langCode: string) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center items-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
          id="options-menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={toggleDropdown}
        >
          <selectedLanguage.Icon className="w-5 h-5 mr-2" />
          <svg className="-mr-1 ml-1 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1" role="none">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`${
                  language === lang.code ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } group flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                role="menuitem"
              >
                <lang.Icon className="w-5 h-5 mr-3" />
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
