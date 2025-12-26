import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
