import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      // Dev: Socket.io lewat proxy Vite sehingga klien cukup memanggil io() tanpa URL khusus.
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
