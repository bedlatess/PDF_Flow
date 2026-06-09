import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env': 'import.meta.env',
  },
  optimizeDeps: {
    exclude: ['pdf-lib'], // WASM 懒加载优化
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdf-lib', 'pdfjs-dist', 'jspdf'], // PDF 库单独打包
          'vue-vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n'], // Vue 生态
        },
      },
    },
    // 分块大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
  worker: {
    format: 'es', // 使用 ES 模块格式
    plugins: () => [],
  },
  server: {
    port: 3000,
    open: true,
    // 优化开发服务器
    hmr: {
      overlay: true,
    },
  },
})
