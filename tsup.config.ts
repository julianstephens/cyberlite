import { defineConfig } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['./src/main.ts'],
  dts: true,
  minify: isProd,
  outDir: 'build',
  format: ['cjs', 'esm'],
  config: './tsconfig.json',
});
