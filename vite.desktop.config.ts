import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/integrations/supabase/client': path.resolve(
        __dirname,
        './src/integrations/supabase/client.desktop.ts'
      ),
    },
  },
  build: {
    outDir: 'dist-desktop',
  },
  define: {
    'import.meta.env.VITE_DESKTOP': JSON.stringify('true'),
  },
});
