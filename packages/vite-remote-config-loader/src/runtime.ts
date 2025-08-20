import type { LoadRemoteConfigOptions, ConfigMetaMap, FallbackDataMap } from './types';

// 缓存配置元数据和降级数据
let cachedConfigMeta: ConfigMetaMap | null = null;
let cachedFallbackData: FallbackDataMap | null = null;

// 正在更新的配置ID，避免重复请求
const updatingConfigs = new Set<string>();

// 配置最后更新时间缓存，每小时最多更新一次
const lastUpdateTimes = new Map<string, number>();

// 获取配置元数据 - 同步函数
function getConfigMeta(): ConfigMetaMap {
  if (cachedConfigMeta) {
    return cachedConfigMeta;
  }

  // 尝试从全局变量获取
  if (typeof window !== 'undefined' && (window as any).__VITE_REMOTE_CONFIG_META__) {
    cachedConfigMeta = (window as any).__VITE_REMOTE_CONFIG_META__;
    return cachedConfigMeta!;
  }

  console.warn('[vite-remote-config-loader] Config meta not available. Make sure the plugin is configured in vite.config.ts');
  return {};
}

// 获取降级数据 - 同步函数
function getFallbackData(): FallbackDataMap {
  if (cachedFallbackData) {
    return cachedFallbackData;
  }

  // 尝试从全局变量获取
  if (typeof window !== 'undefined' && (window as any).__VITE_REMOTE_CONFIG_FALLBACK__) {
    cachedFallbackData = (window as any).__VITE_REMOTE_CONFIG_FALLBACK__;
    return cachedFallbackData!;
  }

  console.warn('[vite-remote-config-loader] Fallback data not available. Make sure the plugin is configured in vite.config.ts');
  return {};
}

// 从 localStorage 获取缓存数据
function getCachedData(key: string): any | null {
  try {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('[vite-remote-config-loader] Failed to parse cached data:', error);
    return null;
  }
}

// 保存数据到 localStorage
function setCachedData(key: string, data: any): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('[vite-remote-config-loader] Failed to cache data:', error);
  }
}

// 后台异步更新配置数据
async function updateConfigInBackground(id: string, url: string, localStorageKey: string): Promise<void> {
  if (updatingConfigs.has(id)) {
    return; // 避免重复请求
  }

  // 检查是否在一小时内已经更新过
  const now = Date.now();
  const lastUpdateTime = lastUpdateTimes.get(id);
  const oneHour = 60 * 60 * 1000; // 1小时的毫秒数
  
  if (lastUpdateTime && (now - lastUpdateTime) < oneHour) {
    console.log(`[vite-remote-config-loader] Config "${id}" was updated recently, skipping remote fetch`);
    return;
  }

  updatingConfigs.add(id);

  try {
    console.log(`[vite-remote-config-loader] Background updating config: ${id} from ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    setCachedData(localStorageKey, data);
    
    // 更新最后更新时间
    lastUpdateTimes.set(id, now);
    
    console.log(`[vite-remote-config-loader] Successfully updated config: ${id}`);
  } catch (error) {
    console.warn(`[vite-remote-config-loader] Failed to update config: ${id}`, error);
  } finally {
    updatingConfigs.delete(id);
  }
}

/**
 * 加载远程配置数据（同步函数）
 * 立即返回 localStorage 或构建时的数据，同时在后台异步更新 localStorage
 * 
 * @param id 配置ID
 * @param options 选项
 * @returns 配置数据
 */
export function loadRemoteConfig<T = any>(
  id: string, 
  options: LoadRemoteConfigOptions = {}
): T {
  // 获取配置元数据
  const configMeta = getConfigMeta();
  const meta = configMeta[id];
  
  if (!meta) {
    console.warn(`[vite-remote-config-loader] Configuration "${id}" not found. Available configs:`, Object.keys(configMeta));
    throw new Error(`Configuration with id "${id}" not found. Make sure it's defined in your Vite config.`);
  }

  // 使用选项覆盖默认配置
  const localStorageKey = options.localStorageKey ?? meta.localStorageKey;

  // 1. 优先返回 localStorage 中的缓存数据
  const cachedData = getCachedData(localStorageKey);
  if (cachedData !== null) {
    console.log(`[vite-remote-config-loader] Using cached data for config: ${id}`);
    
    // 后台异步更新数据
    updateConfigInBackground(id, meta.url, localStorageKey);
    
    return cachedData;
  }
  
  // 2. 如果没有缓存，使用构建时的降级数据
  const fallbackData = getFallbackData();
  const fallback = fallbackData[id];
  
  if (fallback !== undefined) {
    console.log(`[vite-remote-config-loader] Using fallback data for config: ${id}`);
    
    // 后台异步更新数据
    updateConfigInBackground(id, meta.url, localStorageKey);
    
    return fallback;
  }
  
  // 3. 如果都没有，抛出错误
  throw new Error(`No data available for config: ${id}`);
}