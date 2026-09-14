import { defineConfig } from 'vite';

// Keep the editable HTML separate from the compiled index served by branch Pages.
export default defineConfig({ base: '/Bomb-It/', build: { rollupOptions: { input: 'app/index.html' } } });
