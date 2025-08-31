// 统一导出所有 i18n 功能
export * from './locales'
export * as vanilla from './vanilla'
export * as react from './react'

// 默认导出 vanilla 版本（向后兼容）
export { t, getCurrentLanguage, changeLanguage, isZhCN } from './vanilla'

// React 相关导出
export { useTranslation, changeLanguage as changeReactLanguage, getCurrentLanguage as getCurrentReactLanguage, isZhCN as isReactZhCN, t as reactT } from './react'

// 导出 react-i18next 组件，避免其他包直接依赖
export { I18nextProvider } from 'react-i18next'
export { default as i18n } from './react'