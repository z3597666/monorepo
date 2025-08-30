import i18nAntd from './i18n_antd'
import type { TranslationKey, TranslationOptions } from './i18n_antd'

// 非组件中使用的翻译函数
export function t(key: TranslationKey, options?: TranslationOptions): string {
  const result = i18nAntd.t(key, options)
  return typeof result === 'string' ? result : String(result)
}

// 获取当前语言
export function getCurrentLanguage(): string {
  return i18nAntd.language
}

// 检查是否为中文
export function isZhCN(): boolean {
  return i18nAntd.language === 'zh-CN'
}