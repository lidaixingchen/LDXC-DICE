import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import { resolve } from 'path';
import { defineConfig, Plugin } from 'vite';

function inlineCssAndInitPlugin(): Plugin {
  return {
    name: 'inline-css-and-init',
    enforce: 'post',
    generateBundle(_, bundle) {
      let cssContent = '';

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.css')) {
          const cssAsset = bundle[fileName];
          if (cssAsset.type === 'asset' && typeof cssAsset.source === 'string') {
            cssContent += cssAsset.source;
            delete bundle[fileName];
          }
        }
      }

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.js')) {
          const jsAsset = bundle[fileName];
          if (jsAsset.type === 'chunk' && typeof jsAsset.code === 'string') {
            const parts: string[] = [];

            if (cssContent) {
              parts.push(`
(function(){
  var style = document.createElement('style');
  style.type = 'text/css';
  style.id = 'acu-dice-styles';
  style.textContent = ${JSON.stringify(cssContent)};
  document.head ? document.head.appendChild(style) : document.addEventListener('DOMContentLoaded', function(){ document.head.appendChild(style); });
})();
`);
            }

            parts.push(jsAsset.code);

            parts.push(`
(function(){
  if (typeof window !== 'undefined') {
    var init = function() {
      if (typeof window.AcuDice !== 'undefined' && window.AcuDice && window.AcuDice.init) {
        window.AcuDice.init();
      } else if (typeof window.AcuDiceInit === 'function') {
        window.AcuDiceInit();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
`);
            jsAsset.code = parts.join('\n');
          }
        }
      }
    },
  };
}

function generateJsonPlugin(): Plugin {
  return {
    name: 'generate-json',
    enforce: 'post',
    closeBundle() {
      const jsPath = resolve(__dirname, '../dist/stable.js');
      const distDir = resolve(__dirname, '../dist');

      if (fs.existsSync(jsPath)) {
        const jsContent = fs.readFileSync(jsPath, 'utf-8');

        // 本地测试版本 - 直接嵌入代码
        const localJsonData = {
          id: 'acu-dice-system-2.0.0-local',
          name: 'AcuDice-骰子系统(本地)',
          content: jsContent,
          info: 'AIDM骰子系统 v2.0.0 (本地测试版)',
          buttons: [],
        };

        fs.writeFileSync(
          resolve(distDir, 'AcuDice-骰子系统-本地.json'),
          JSON.stringify(localJsonData, null, 2),
          'utf-8',
        );

        // 远程部署版本 - 使用 import() 加载
        const remoteJsonData = {
          id: 'acu-dice-system-2.0.0',
          name: 'AcuDice-骰子系统',
          content:
            "import('https://testingcf.jsdelivr.net/gh/jerryzmtz/my-tavern-scripts@v4.04/dist/骰子系统/stable.js');",
          info: 'AIDM骰子系统 v2.0.0 - 支持AIDM标准检定、战斗检定、对抗检定，以及CoC7、DND5e等规则。包含MVU变量面板。',
          buttons: [],
        };

        fs.writeFileSync(resolve(distDir, 'AcuDice-骰子系统.json'), JSON.stringify(remoteJsonData, null, 2), 'utf-8');

        console.log(`\n[generate-json] 已生成:`);
        console.log(`  - 本地测试版: ${resolve(distDir, 'AcuDice-骰子系统-本地.json')}`);
        console.log(`  - 远程部署版: ${resolve(distDir, 'AcuDice-骰子系统.json')}`);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), inlineCssAndInitPlugin(), generateJsonPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AcuDice',
      formats: ['iife'],
      fileName: () => (mode === 'production' ? 'stable.js' : 'nightly.js'),
    },
    rollupOptions: {
      external: ['jquery', 'toastr', 'lodash'],
      output: {
        globals: {
          jquery: '$',
          toastr: 'toastr',
          lodash: '_',
        },
        banner: `// AcuDice v2.0.0 - AIDM骰子系统 - Built at ${new Date().toISOString()}`,
      },
    },
    outDir: resolve(__dirname, '../dist'),
    emptyOutDir: false,
    sourcemap: mode === 'development' ? 'inline' : true,
    minify: mode === 'production' ? 'esbuild' : false,
    cssCodeSplit: false,
    treeshake: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, '../core'),
      '@adapters': resolve(__dirname, '../adapters'),
      '@data': resolve(__dirname, '../data'),
      '@presets': resolve(__dirname, '../presets'),
      '@utils': resolve(__dirname, '../utils'),
      '@map': resolve(__dirname, '../map'),
      '@index': resolve(__dirname, '../index.ts'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },
  css: {
    devSourcemap: true,
  },
}));
