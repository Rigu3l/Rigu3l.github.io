import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'copy-classic-lang-script',
        buildStart() {
          const srcLang = path.resolve(__dirname, 'src/lang.js');
          const pubSrcDir = path.resolve(__dirname, 'public/src');
          if (fs.existsSync(srcLang)) {
            fs.mkdirSync(pubSrcDir, { recursive: true });
            fs.copyFileSync(srcLang, path.resolve(pubSrcDir, 'lang.js'));
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
