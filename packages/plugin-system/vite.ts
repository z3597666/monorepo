import { glob } from 'glob';
import path, { dirname, join } from 'path';
import type { Plugin } from 'vite';

export interface PluginDiscoveryOptions {
  /**
   * 插件文件名约定
   * @example 'my-feature-plugin'
   */
  pluginFileName: string;
  
  /**
   * 虚拟模块ID
   * @example 'virtual:my-feature-plugins'
   */
  virtualModuleId: string;
  
  /**
   * 搜索目录模式
   * @default '../*'
   */
  searchPattern?: string;
  
  /**
   * 是否显示详细日志
   * @default true
   */
  verbose?: boolean;
}

/**
 * 创建通用插件发现器
 * 
 * @example
 * ```typescript
 * // 在 vite.config.ts 中
 * createPluginDiscovery({
 *   pluginFileName: 'login-provider-plugin',
 *   virtualModuleId: 'virtual:login-provider-plugins'
 * })
 * 
 * // 在代码中使用
 * import { executeAllPlugins } from 'virtual:login-provider-plugins';
 * await executeAllPlugins();
 * ```
 */
export function createPluginDiscovery(options: PluginDiscoveryOptions): Plugin {
  const {
    pluginFileName,
    virtualModuleId,
    searchPattern = join(import.meta.dirname, '../../**/*'),
    verbose = true
  } = options;

  const RESOLVED_ID = '\0' + virtualModuleId;

  return {
    name: `plugin-discovery-${pluginFileName}`,
    
    resolveId(id: string) {
      return id === virtualModuleId ? RESOLVED_ID : null;
    },
    
    load(id: string) {
      if (id !== RESOLVED_ID) return null;

      // 搜索插件文件
      const searchGlob = `${searchPattern}/${pluginFileName}.{ts,js}`;
      let pluginFiles = glob.sync(searchGlob, {
        cwd: process.cwd()
      });
      // 文件夹不以.开头
      pluginFiles = pluginFiles.filter(file => !dirname(file).startsWith('.'));

      if (verbose) {
        console.log(`🔍 搜索插件: ${searchGlob}`);
        console.log(`📦 发现 ${pluginFiles.length} 个插件文件:`);
        pluginFiles.forEach(file => {
          console.log(`   ${file}`);
        });
      }

      if (pluginFiles.length === 0) {
        return `
// 未发现插件
export const hasPlugins = false;
export const pluginCount = 0;
export const pluginNames = [];
export const pluginFiles = [];

export async function executeAllPlugins() {
  ${verbose ? 'console.log("📋 未发现插件，跳过执行");' : ''}
  return [];
}

export async function getPluginResults() {
  return [];
}
        `;
      }

      // 解析插件信息
      const plugins = pluginFiles.map((file) => {
        const absolutePath = path.resolve(process.cwd(), file);
        const packageDir = path.dirname(file);
        const packageName = path.basename(packageDir);
        
        return {
          path: absolutePath,
          name: packageName,
          file: file
        };
      });

      // 生成静态导入和执行代码
      const importStatements = plugins.map((plugin, index) => 
        `import * as plugin${index} from '${plugin.path}';`
      ).join('\n');

      const executeStatements = plugins.map((_, index) => 
        `plugin${index}.execute && await plugin${index}.execute()`
      ).join(',\n    ');

      const resultStatements = plugins.map((_, index) => 
        `plugin${index}.execute ? await plugin${index}.execute() : null`
      ).join(',\n    ');

      const pluginNames = plugins.map(p => `'${p.name}'`).join(', ');
      const pluginFiles_list = plugins.map(p => `'${p.file}'`).join(', ');

      return `${importStatements}

export const hasPlugins = true;
export const pluginCount = ${plugins.length};
export const pluginNames = [${pluginNames}];
export const pluginFiles = [${pluginFiles_list}];

/**
 * 执行所有发现的插件
 * 插件必须导出 execute 函数
 */
export async function executeAllPlugins() {
  ${verbose ? `console.log(\`🎯 执行 \${pluginCount} 个插件:\`);
  pluginNames.forEach((name, index) => {
    console.log(\`   \${index + 1}. \${name} (\${pluginFiles[index]})\`);
  });` : ''}
  
  try {
    const results = await Promise.all([
      ${executeStatements}
    ]);
    
    ${verbose ? 'console.log("✅ 所有插件执行完成");' : ''}
    return results.filter(r => r !== undefined);
  } catch (error) {
    console.error("❌ 插件执行失败:", error);
    throw error;
  }
}

/**
 * 获取所有插件的执行结果
 */
export async function getPluginResults() {
  try {
    const results = await Promise.all([
      ${resultStatements}
    ]);
    
    return results.filter(r => r !== null);
  } catch (error) {
    console.error("❌ 获取插件结果失败:", error);
    return [];
  }
}
      `;
    },

    buildStart() {
      if (verbose) {
        console.log(`🚀 启动插件发现: ${pluginFileName}`);
      }
    }
  };
}
