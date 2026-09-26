import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createTranscriptionHandler } from './api/transcribe.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'local-gemini-transcription-api',
        configureServer(server) {
          const handler = createTranscriptionHandler(env.GEMINI_API_KEY);
          server.middlewares.use('/api/transcribe', (request, response) => {
            void handler(request, response);
          });
        },
      },
    ],
  };
});