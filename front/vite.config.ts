import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

// ES module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env variables from root directory (one level above 'front' folder)
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');

  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'), // adjust if your source root is different
      }
    },
    server: {
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          // secure: false,
        }
      } : undefined
    }
  };
});
