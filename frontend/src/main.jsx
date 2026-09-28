import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";

// Ambil URL backend dari Environment Variable Vercel (jika ada)
const rawApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const backendHost = rawApiUrl.endsWith("/api")
  ? rawApiUrl.slice(0, -4)
  : rawApiUrl;

// Interceptor agar semua panggilan API mengarah ke backend yang tepat
axios.interceptors.request.use((config) => {
  if (config.url) {
    if (backendHost) {
      // Jika VITE_API_URL di-set, arahkan semua request localhost/relative ke server backend tersebut
      if (config.url.startsWith("http://localhost:3000")) {
        config.url = config.url.replace("http://localhost:3000", backendHost);
      } else if (config.url.startsWith("http://127.0.0.1:3000")) {
        config.url = config.url.replace("http://127.0.0.1:3000", backendHost);
      } else if (config.url.startsWith("/api")) {
        config.url = backendHost + config.url;
      }
    } else {
      // Fallback jika tidak ada VITE_API_URL dan diakses bukan dari localhost (misal LAN/Ngrok/Monorepo)
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        if (config.url.startsWith("http://localhost:3000")) {
          config.url = config.url.replace("http://localhost:3000", window.location.origin);
        } else if (config.url.startsWith("http://127.0.0.1:3000")) {
          config.url = config.url.replace("http://127.0.0.1:3000", window.location.origin);
        }
      }
    }
  }
  return config;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);