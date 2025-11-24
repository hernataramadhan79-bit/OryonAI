import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Prevents "process is not defined" error in browser
      'process.env': {},
      // Maps the specific API key safely. If missing, defaults to empty string to prevent build crash.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
    },
    server: {
      port: 3000,
    }
  };
});