import { defineConfig } from "vite";

export default defineConfig({
  base: "/stack/",
  server: {
    host: true,
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
