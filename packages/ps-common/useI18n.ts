import { useTranslation } from 'react-i18next'
import type { TranslationKey, TranslationOptions } from './i18n_antd'

// 自定义 hook，提供类型安全的翻译函数
export function useI18n() {
  const { t, i18n } = useTranslation()
  
  const translate = (key: TranslationKey, options?: TranslationOptions): string => {
    const result = t(key, options)
    return typeof result === 'string' ? result : String(result)
  }
  
  const changeLanguage = (lng: string) => {
    return i18n.changeLanguage(lng)
  }
  
  const currentLanguage = i18n.language
  
  return {
    t: translate,
    changeLanguage,
    currentLanguage,
    isZhCN: currentLanguage === 'zh-CN'
  }
}