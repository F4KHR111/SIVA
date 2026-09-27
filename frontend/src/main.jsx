import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";

// Automatically redirect API requests to current domain for Ngrok / LAN sharing
axios.interceptors.request.use((config) => {
  if (config.url) {
    if (config.url.startsWith("http://localhost:3000")) {
      config.url = config.url.replace("http://localhost:3000", window.location.origin);
    } else if (config.url.startsWith("http://127.0.0.1:3000")) {
      config.url = config.url.replace("http://127.0.0.1:3000", window.location.origin);
    }
  }
  return config;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);