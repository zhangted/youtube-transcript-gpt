import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import preact from "@preact/preset-vite";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

import manifest from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    build: {
      emptyOutDir: true,
      outDir: "build",
      rollupOptions: {
        output: {
          chunkFileNames: "assets/chunk-[hash].js",
        },
      },
    },

    plugins: [crx({ manifest }), preact(), wasm(), topLevelAwait()],
  };
});
