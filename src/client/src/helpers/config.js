// src/helpers/config.js
export const API =
  import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:80/api/v1";

export const AUTH_API =
  import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:80/api/v1";

export const WS_URL = import.meta.env.VITE_APP_WS_URL || "ws://localhost:80/ws";
