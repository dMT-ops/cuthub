/// <reference types="vitest/config" />
import path from "path"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Só os testes do projeto: os test_*.ts da raiz são scripts manuais
    // contra o stack local, não suites.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
