import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (asset) => asset.names?.includes("troyanov-cv.pdf")
          ? "assets/cv/troyanov-cv.pdf"
          : "assets/[name]-[hash][extname]",
      },
      input: {
        home: fileURLToPath(new URL("./index.html", import.meta.url)),
        artifact: fileURLToPath(new URL("./artifact.html", import.meta.url)),
        aiProducer: fileURLToPath(new URL("./ai-producer.html", import.meta.url)),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
  },
});
