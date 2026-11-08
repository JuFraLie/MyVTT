import { requestSignature, uploadSignedBlob } from '../../lib/cloudinary';

/**
 * Unggah hasil crop lingkaran token (256x256 WebP) ke Cloudinary (C7).
 * Batas jumlah gambar per ruang (40) divalidasi server saat `token:add/update`.
 */
export async function uploadTokenBlob(blob: Blob, roomCode: string): Promise<string> {
  const signature = await requestSignature(roomCode, 'token');
  return uploadSignedBlob(blob, 'token.webp', signature);
}
