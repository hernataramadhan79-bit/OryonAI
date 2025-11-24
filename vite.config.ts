import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Robust definition to avoid syntax errors in replacement
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env': JSON.stringify({}), 
    },
    server: {
      port: 3000,
    }
  };
});