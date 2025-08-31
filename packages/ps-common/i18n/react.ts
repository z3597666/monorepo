import i18n from 'i18next'
import { initReactI18next, useTranslation as useI18nextTranslation } from 'react-i18next'
import { zhCN, enUS, type TranslationKey, type TranslationOptions } from './locales'

// 语言检测函数，与 vanilla.ts 保持一致
function detectLanguage(): 'zh-CN' | 'en-US' {
  // 1. 优先检测 navigator.language (浏览器环境)
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language === "zh-CN" ? 'zh-CN' : 'en-US'
  }
  
  // 2. 检测 UXP 环境
  try {
    //@ts-ignore
    const require_ = typeof require !== 'undefined' ? require : undefined
    if (require_) {
      const uxp = require_('uxp')
      return uxp.host.uiLocale.startsWith("zh") ? 'zh-CN' : 'en-US'
    }
  } catch {}
  
  // 3. 默认英文
  return 'en-US'
}

// 初始化 i18next
if (!i18n.isInitialized) {
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
}

/**
 * React Hook for translations
 * @returns Translation utilities
 */
export function useTranslation() {
  const { t: i18nT, i18n: i18nInstance } = useI18nextTranslation()
  
  const t = (key: TranslationKey, options?: TranslationOptions): string => {
    return i18nT(key, options)
  }
  
  return {
    t,
    changeLanguage: (lng: 'zh-CN' | 'en-US') => i18nInstance.changeLanguage(lng),
    language: i18nInstance.language as 'zh-CN' | 'en-US',
    isZhCN: () => i18nInstance.language === 'zh-CN'
  }
}

/**
 * 非组件中使用的翻译函数
 * @param key 翻译键
 * @param options 参数对象
 * @returns 翻译后的文本
 */
export function t(key: TranslationKey, options?: TranslationOptions): string {
  return i18n.t(key, options)
}

/**
 * 切换语言
 * @param language 目标语言
 */
export function changeLanguage(language: 'zh-CN' | 'en-US'): Promise<any> {
  return i18n.changeLanguage(language)
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): 'zh-CN' | 'en-US' {
  return i18n.language as 'zh-CN' | 'en-US'
}

/**
 * 检查是否为中文
 */
export function isZhCN(): boolean {
  return i18n.language === 'zh-CN'
}

export default i18n