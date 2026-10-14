import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// Ekstraksi variabel Supabase dari lingkungan runtime Node (Google AI Studio Secrets / Vercel / CI)
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

// Ekstraksi URL publik aplikasi saat ini (Google AI Studio Development URL / Vercel Production)
const appUrl =
  process.env.APP_URL ||
  process.env.VITE_APP_URL ||
  process.env.VITE_SITE_URL ||
  '';

// Menjamin Vite dev-server dan build selalu membaca variabel dari process.env melalui .env.local
if (supabaseUrl && supabaseAnonKey) {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    const content = `# Auto-generated from Google AI Studio / runtime environment secrets\nVITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${supabaseAnonKey}\nVITE_SUPABASE_PUBLISHABLE_KEY=${supabaseAnonKey}\nVITE_APP_URL=${appUrl}\n`;
    if (!fs.existsSync(envLocalPath) || fs.readFileSync(envLocalPath, 'utf8') !== content) {
      fs.writeFileSync(envLocalPath, content, { encoding: 'utf8', mode: 0o600 });
    }
  } catch {
    // Abaikan jika filesystem bersifat read-only
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_APP_URL': JSON.stringify(appUrl),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
