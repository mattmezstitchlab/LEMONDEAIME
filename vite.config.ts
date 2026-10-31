import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/* dedupe : la navigation de la convergence vient du studio ; une seule copie de React pour tout le site */
export default defineConfig({ plugins: [react()], resolve: { dedupe: ['react', 'react-dom'] } });
