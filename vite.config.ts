
// FIX: Add a triple-slash directive to load Node.js types, which correctly defines `process.cwd()` and resolves the type error.
/// <reference types="node" />

import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// FIX: Removed the explicit import of `process`. In a Node.js environment like a Vite config file, `process` is a global object. Importing it can lead to type conflicts. Using the global `process` resolves the 'Property 'cwd' does not exist' error.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // FIX: Expose Supabase environment variables through process.env via Vite's define plugin.
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2500,
      },
    };
});
