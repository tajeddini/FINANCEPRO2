import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* ثبت Service Worker برای PWA (آفلاین + اعلان‌های پس‌زمینه) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* در محیط توسعه یا در صورت نبود sw.js، بی‌صدا رد شو */
    });
  });
}
