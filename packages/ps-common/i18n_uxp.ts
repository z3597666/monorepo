// UXP 环境中使用的简单国际化函数
// 不依赖 React 或其他现代库

import { zhCN } from './locales/zh-CN'
import { enUS } from './locales/en-US'

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

const currentLocale = detectLanguage()
const translations = currentLocale === 'zh-CN' ? zhCN : enUS

// 简单的翻译函数
export function tUXP(key: string, options: Record<string, any> = {}): string {
  let value = translations[key as keyof typeof translations]
  
  if (!value) return key
  
  // 支持参数替换 {paramName}
  if (typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (match, paramName) => 
      options[paramName] !== undefined ? options[paramName] : match
    )
  }
  
  return value as string
}

export function getCurrentLocaleUXP(): string {
  return currentLocale
}

export function isZhCNUXP(): boolean {
  return currentLocale === 'zh-CN'
}