// FILE: vite.config.js

import { defineConfig } from "vite";

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin", 
      "Cross-Origin-Embedder-Policy": "require-corp", 
    },
    proxy: {
      '/papi': {
		  target: 'http://tcia-posda-rh-1.ad.uams.edu',
		  changeOrigin: true,
		  headers: { Authorization: 'Bearer e9a63bc2-bfa5-4299-afb3-c844fb2ef38b' },
	  },
    },
  },
});

