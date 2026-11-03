import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { env } from "node:process";

export default defineConfig({
  base: env.GITHUB_PAGES ? "/onlycars/" : "/",
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
