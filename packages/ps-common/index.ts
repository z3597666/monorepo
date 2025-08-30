// 导出原有的 i18n 相关
export { default as i18n, getI18nLocale } from './i18n'
export type { I18nKey } from './i18n'

// 导出新的 Antd 风格 i18n
export { default as i18nAntd } from './i18n_antd'
export type { TranslationKey, TranslationFunction } from './i18n_antd'
export { useI18n } from './useI18n'

// 导出 react-i18next 组件，避免其他包直接依赖
export { I18nextProvider } from 'react-i18next'

// 导出工具函数
export { t, getCurrentLanguage, isZhCN } from './i18n_utils'

// 导出语言资源
export { zhCN, enUS } from './locales'