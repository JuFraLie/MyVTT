export type AssetKind = 'map' | 'token';

export interface SignatureResponse {
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/**
 * Minta tanda tangan unggah ke server (AGENTS.md §12) — API secret tidak
 * pernah menyentuh klien. Endpoint yang sama dipakai peta (B1) dan token (C7).
 */
export async function requestSignature(
  roomCode: string,
  kind: AssetKind,
): Promise<SignatureResponse> {
  const response = await fetch('/api/assets/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, kind }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Gagal meminta tanda tangan unggah.');
  }
  return (await response.json()) as SignatureResponse;
}

/** Unggah blob ke Cloudinary memakai tanda tangan; mengembalikan URL CDN. */
export async function uploadSignedBlob(
  blob: Blob,
  filename: string,
  signature: SignatureResponse,
): Promise<string> {
  const form = new FormData();
  form.append('file', new File([blob], filename, { type: blob.type || 'image/webp' }));
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('format', 'webp');

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  const data = (await response.json().catch(() => null)) as {
    secure_url?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message ?? 'Unggah ke Cloudinary gagal.');
  }
  return data.secure_url;
}
