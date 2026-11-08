import { requestSignature, uploadSignedBlob } from '../../lib/cloudinary';

const MAX_MAP_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const WEBP_QUALITY = 0.85;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ProcessedMap {
  blob: Blob;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak dapat dibaca.'));
    };
    image.src = url;
  });
}

/**
 * Kompres peta di klien sesuai AGENTS.md §12: maks 4096 px sisi terpanjang,
 * WebP kualitas 0.85. Isi peta tidak diubah, hanya ditampilkan.
 */
export async function processMapFile(file: File): Promise<ProcessedMap> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Format peta harus JPG, PNG, atau WebP.');
  }
  if (file.size > MAX_MAP_BYTES) {
    throw new Error('Ukuran peta melebihi 15 MB.');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak mendukung kanvas.');
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );
  if (!blob) throw new Error('Kompresi gambar gagal.');
  return { blob, width, height };
}

/** Unggah hasil kompresi peta langsung ke Cloudinary (B1). */
export async function uploadMapBlob(blob: Blob, roomCode: string): Promise<string> {
  const signature = await requestSignature(roomCode, 'map');
  return uploadSignedBlob(blob, 'map.webp', signature);
}
