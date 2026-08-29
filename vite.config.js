import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/* ساخت آیکون‌های PNG برای PWA (بدون وابستگی — فقط Node) — قبل از هر بیلد */
import "./scripts/make-icons.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
