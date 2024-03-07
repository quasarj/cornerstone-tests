// FILE: vite.config.js

import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    wasm()
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin", 
      "Cross-Origin-Embedder-Policy": "require-corp", 
    },
    proxy: {
      '/papi': {
		  target: 'http://tcia-posda-rh-1.ad.uams.edu',
		  // target: 'http://localhost:8282',
		  changeOrigin: true,
		  headers: { Authorization: 'Bearer e9a63bc2-bfa5-4299-afb3-c844fb2ef38b' },
	  },
    },
  },
});

