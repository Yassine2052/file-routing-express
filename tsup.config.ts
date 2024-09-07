import { defineConfig } from 'tsup';
import path from "path";
 
export default defineConfig({
    format: ['cjs', 'esm'],
    entry: ['./src/index.ts', './src/types/index.ts'],
    dts: true,
    shims: true,
    skipNodeModulesBundle: true,
    clean: true,
    bundle: false,
    splitting: false,
    sourcemap: true,
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
});