import { zhCN, enUS, type TranslationKey, type TranslationOptions } from './locales'

// 当前语言 - 需要外部设置
let currentLanguage: 'zh-CN' | 'en-US' | null = null

// 获取当前翻译资源
function getTranslations() {
  if (currentLanguage === null) {
    throw new Error('Language not initialized. Call changeLanguage() first.')
  }
  return currentLanguage === 'zh-CN' ? zhCN : enUS
}

/**
 * 纯 JavaScript 环境的翻译函数
 * @param key 翻译键
 * @param options 参数对象，用于替换模板中的变量
 * @returns 翻译后的文本
 */
export function t(key: TranslationKey, options: TranslationOptions = {}): string {
  const translations = getTranslations()
  let value = translations[key]
  
  if (!value) return key
  
  // 支持参数替换 {{paramName}}
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramName) => 
      options[paramName] !== undefined ? String(options[paramName]) : match
    )
  }
  
  return value as string
}

/**
 * 切换语言 (支持初始化和动态切换)
 * @param language 目标语言
 */
export function changeLanguage(language: 'zh-CN' | 'en-US'): void {
  currentLanguage = language
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): 'zh-CN' | 'en-US' {
  if (currentLanguage === null) {
    throw new Error('Language not initialized. Call changeLanguage() first.')
  }
  return currentLanguage
}

/**
 * 检查是否为中文
 */
export function isZhCN(): boolean {
  if (currentLanguage === null) {
    throw new Error('Language not initialized. Call changeLanguage() first.')
  }
  return currentLanguage === 'zh-CN'
}

