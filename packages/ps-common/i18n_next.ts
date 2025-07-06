import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

//@ts-ignore
const require_ = typeof require != 'undefined' ? require : undefined
let locale = 'en'
if (typeof navigator !== 'undefined' && navigator.language) {
    locale = navigator.language == "zh-CN" ? 'zh' : 'en'
} else if (require_) {
    locale = require_('uxp').host.uiLocale.startsWith("zh") ? 'zh' : 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en }
    },
    lng: locale, // 默认语言
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export { t } from 'i18next'
export { locale };

