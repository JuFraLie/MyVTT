/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL backend produksi (mis. https://myvtt-server.onrender.com). Kosong = pakai proxy Vite saat dev. */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
