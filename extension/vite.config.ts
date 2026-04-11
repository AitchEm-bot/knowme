import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content/index': resolve(__dirname, 'src/content/index.ts'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: '../manifest.json', dest: '.' },
        { src: 'assets/icons/*', dest: 'icons' },
        { src: 'assets/brain-model/brain.glb', dest: 'assets' },
      ],
    }),
  ],
});
