import zhcn from "./zh-cn.ts";
import en from "./en.ts";

//@ts-ignore
const require_ = typeof require != 'undefined' ? require : undefined
let locale = 'en'
if (typeof navigator !== 'undefined' && navigator.language) {
    locale = navigator.language == "zh-CN" ? 'zhcn' : 'en'
} else if (require_) {
    locale = require_('uxp').host.uiLocale.startsWith("zh") ? 'zhcn' : 'en';
}

export type I18nKey = keyof typeof zhcn;

export function getI18nLocale() {
    return locale;
}

// 简单的本地化函数，替代原有 i18n，仅处理本文件内的几句提示
const i18n = (key: string, ...args: any[]) => {
    const locale = getI18nLocale();
    const maps: Record<string, Record<string, any>> = {
        zhcn,
        en,
    };
    const map = maps[locale] || maps['en'];
    let value = map[key];
    if (!value) return key;
    // 支持带参数的字符串替换，如 {0}
    if (typeof value === 'string') {
        value = value.replace(/\{(\d+)\}/g, (match, number) =>
            typeof args[number] !== 'undefined' ? args[number] : match
        );
        return value;
    }
    // 兼容函数型（如果有）
    if (typeof value === 'function') return value(...args);
    return value;
};

export default i18n;