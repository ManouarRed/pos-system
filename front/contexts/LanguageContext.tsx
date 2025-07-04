import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { FullScreenLoader } from '../components/common/FullScreenLoader'; // Import FullScreenLoader

interface Translations {
  [key: string]: string | Translations;
}

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations; // Expose translations if needed directly
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Function to safely fetch translations
const loadTranslations = async (language: string): Promise<Translations> => {
  try {
    const response = await fetch(`/locales/${language}.json`);
    if (!response.ok) {
      console.error(`Failed to load ${language}.json: ${response.statusText}. Falling back.`);
      // Fallback to English if the requested language file fails to load or doesn't exist
      if (language !== 'en') {
        const enResponse = await fetch(`/locales/en.json`);
        if (enResponse.ok) return await enResponse.json();
      }
      return {}; // Return empty if English also fails (should ideally not happen)
    }
    return await response.json();
  } catch (error) {
    console.error(`Could not load translations for ${language}:`, error);
    if (language !== 'en') {
      try {
        const enResponse = await fetch(`/locales/en.json`);
        if (enResponse.ok) return await enResponse.json();
      } catch (fallbackError) {
        console.error(`Could not load fallback English translations:`, fallbackError);
      }
    }
    return {};
  }
};


export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const storedLang = localStorage.getItem('appLanguage');
    return storedLang && ['en', 'sk'].includes(storedLang) ? storedLang : 'en';
  });
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState<boolean>(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      setIsLoadingTranslations(true);
      const loadedTranslations = await loadTranslations(language);
      setTranslations(loadedTranslations);
      setIsLoadingTranslations(false);
    };
    fetchTranslations();
  }, [language]);

  const setLanguage = (lang: string) => {
    if (['en', 'sk'].includes(lang)) {
      localStorage.setItem('appLanguage', lang);
      setLanguageState(lang);
    } else {
      console.warn(`Attempted to set unsupported language: ${lang}`);
    }
  };

  const translate = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: string | Translations | undefined = translations;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // console.warn(`Translation key "${key}" not found for language "${language}".`);
        return key; // Return the key itself if not found
      }
    }
    
    if (typeof result === 'string') {
      if (params) {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
        }, result);
      }
      return result;
    }
    // console.warn(`Translation key "${key}" did not resolve to a string for language "${language}". Resolved to:`, result);
    return key; // Key resolved to an object, not a string
  }, [translations, language]);


  if (isLoadingTranslations) {
    return <FullScreenLoader />; // Use FullScreenLoader
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
