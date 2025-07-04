
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url'; // Import for ES module __dirname equivalent

// ES module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load .env files from the project root
    const env = loadEnv(mode, '.', ''); 
    console.log('VITE_API_BASE_URL from .env.local:', env.VITE_API_BASE_URL); // Added for debugging
    return {
      define: {
        // Ensure these are still needed for your Gemini API integration
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'), // Or './src' if that's your source root
        }
      },
      server: {
        proxy: {
          // Proxy API requests
          '/api': {
            target: 'http://localhost:3001', // Your backend server
            changeOrigin: true, // Recommended for virtual hosted sites
            // secure: false, // Uncomment if your backend is HTTPS with a self-signed certificate
            // rewrite: (path) => path.replace(/^\/api/, '/api') // Usually not needed if target is base URL
                                                              // and backend routes already include /api
          }
        }
      }
    };
});
