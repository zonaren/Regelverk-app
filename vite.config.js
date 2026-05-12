import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  root: 'src',
  base: mode === 'dev-env' ? '/dev/' : '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        edit: resolve(__dirname, 'src/edit.html'),
      },
    },
  },
}))
