import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" TypeScript error
  const env = loadEnv(mode, (process as any).cwd(), '');
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