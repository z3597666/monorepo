import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { zhCN, enUS } from './locales'

// 语言检测函数，复用原有逻辑
function detectLanguage(): string {
  //@ts-ignore
  const require_ = typeof require != 'undefined' ? require : undefined
  
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language === "zh-CN" ? 'zh-CN' : 'en-US'
  } else if (require_) {
    return require_('uxp').host.uiLocale.startsWith("zh") ? 'zh-CN' : 'en-US'
  }
  return 'en-US'
}

// 初始化 i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN
      },
      'en-US': {
        translation: enUS
      }
    },
    lng: detectLanguage(),
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false // React 已经默认转义
    }
  })

export default i18n

// 导出类型定义
export type TranslationKey = keyof typeof zhCN
export type TranslationFunction = (key: TranslationKey, options?: any) => string
export type TranslationOptions = Record<string, string | number>