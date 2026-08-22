import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* ثبت Service Worker برای PWA (نصب‌پذیری + کش آفلاین + اعلان پس‌زمینه) */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* محیط‌های بدون SW — بی‌صدا رد شو */
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
