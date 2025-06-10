import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationTE from './locales/te/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  te: {
    translation: translationTE
  }
};

// Language detector with AsyncStorage persistence
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // Check if user has previously selected a language
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
      
      // Fall back to device language
      const deviceLanguage = RNLocalize.getLocales()[0].languageCode;
      callback(deviceLanguage);
    } catch (error) {
      console.log('Error reading language from AsyncStorage', error);
      callback('en'); // Default fallback
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Error saving language to AsyncStorage', error);
    }
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3', // Important for React Native
    resources,
    fallbackLng: 'en',
    debug: __DEV__, // Enable debug in development
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Important for React Native
    }
  });

export default i18n;
