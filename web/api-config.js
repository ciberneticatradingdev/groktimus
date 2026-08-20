// api-config.js — where the frontend finds the backend.
// The backend (Railway) serves the API AND this frontend, so same-origin works
// there and locally. When the landing is served from Vercel (a different origin),
// point it at the Railway backend by setting BACKEND below after the first deploy.
const BACKEND = "https://groktimus-production.up.railway.app";

// same-origin on localhost or when no backend override is set; otherwise the
// override only kicks in when we're NOT already on that backend host.
export const API = (() => {
  if (!BACKEND) return "";
  try { if (location.origin === BACKEND) return ""; } catch {}
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "";
  return BACKEND;
})();

// where "watch live" should send people — the stream HUD. Same-origin until the
// backend is deployed (or a live.* domain is pointed at it).
export const STREAM_URL = "https://live.groktimus.fun";
