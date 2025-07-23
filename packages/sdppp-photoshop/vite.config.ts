import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 自定义插件来处理 sdpppX.js 文件
function sdpppXPlugin() {
  const sdpppXPath = resolve(import.meta.dirname, './plugin/sdpppX.js');
  
  return {
    name: 'sdppp-x-plugin',
    configResolved(config) {
      const isDev = config.command === 'serve';
      
      try {
        let content = readFileSync(sdpppXPath, 'utf-8');
        
        if (isDev) {
          // 开发模式：添加 __CWURL__ 配置
          if (!content.includes('__CWURL__')) {
            content = content.replace(
              'global.sdpppX = {',
              `global.sdpppX = {
  __CWURL__: 'http://localhost:19920/content.html',`
            );
            writeFileSync(sdpppXPath, content, 'utf-8');
            console.log('✅ Added __CWURL__ to sdpppX.js for development');
          }
        } else {
          // 构建模式：移除 __CWURL__ 配置
          if (content.includes('__CWURL__')) {
            content = content.replace(/,\s*__CWURL__:\s*'[^']*'/g, '');
            content = content.replace(/__CWURL__:\s*'[^']*',?\s*/g, '');
            writeFileSync(sdpppXPath, content, 'utf-8');
            console.log('✅ Removed __CWURL__ from sdpppX.js for build');
          }
        }
      } catch (error) {
        console.error('❌ Error modifying sdpppX.js:', error);
      }
    }
  };
}

function sdkPlugin() {
  return {
    name: 'sdk-plugin',
    writeBundle(options) {
      const outDir = options.dir || './plugin/webview';
      const sdkChunkPath = resolve(import.meta.dirname, './src/sdk/sdppp-ps-sdk-chunk.js');
      const targetPath = resolve(import.meta.dirname, outDir, 'sdppp-ps-sdk-chunk.js');
      
      // 复制 SDK chunk 文件到输出目录
      if (existsSync(sdkChunkPath)) {
        try {
          copyFileSync(sdkChunkPath, targetPath);
          console.log('✅ Copied sdppp-ps-sdk-chunk.js to output directory');
          
          // 更新 HTML 文件中的引用路径
          const htmlPath = resolve(import.meta.dirname, outDir, 'content.html');
          if (existsSync(htmlPath)) {
            let htmlContent = readFileSync(htmlPath, 'utf-8');
            htmlContent = htmlContent.replace(
              './src/sdk/sdppp-ps-sdk-chunk.js',
              './sdppp-ps-sdk-chunk.js'
            );
            writeFileSync(htmlPath, htmlContent, 'utf-8');
            console.log('✅ Updated HTML reference to sdppp-ps-sdk-chunk.js');
          }
        } catch (error) {
          console.error('❌ Error processing SDK chunk:', error);
        }
      } else {
        console.warn('⚠️  SDK chunk file not found:', sdkChunkPath);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), sdpppXPlugin(), sdkPlugin(), viteSingleFile()],
  resolve: {
  },
  define: {
    SDPPP_VERSION: readFileSync(resolve(import.meta.dirname, '../../release-repos/sd-ppp/sdppp_python/version2.txt'), 'utf-8').trim(),
  },
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, './plugin/webview'),
    rollupOptions: {
      input: {
        content: resolve(import.meta.dirname, './content.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  server: {
    port: 19920,
  } 
}); 
