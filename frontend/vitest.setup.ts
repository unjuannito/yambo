import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './app/i18n/locales/es.json';

void i18n.use(initReactI18next).init({
    resources: { es: { translation: es } },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
});

afterEach(() => {
    cleanup();
});
