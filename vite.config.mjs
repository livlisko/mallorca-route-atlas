import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ command }) => ({
  base: process.env.GITHUB_ACTIONS ? "/mallorca-route-atlas/" : "/",
  build: {
    outDir: "dist/client",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        packing: fileURLToPath(new URL("./packing/index.html", import.meta.url)),
        itinerary: fileURLToPath(new URL("./itinerary/index.html", import.meta.url)),
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx", "./src/packing-main.jsx"],
    },
  },
  plugins: [
    react(),
    {
      name: "private-itinerary-dev-csp",
      transformIndexHtml(html, context) {
        if (command !== "serve" || !context.filename.endsWith("itinerary/index.html")) return html;
        return html.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';");
      },
    },
  ],
}));
