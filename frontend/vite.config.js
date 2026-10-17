import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // El backend corre en el puerto 3000 (npm start en backend/)
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.js',
    include: ['test/**/*.test.jsx'],
  },
});
