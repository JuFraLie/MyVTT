import { createHash } from 'node:crypto';
import { Router } from 'express';
import { assetSignatureRequestSchema } from '@myvtt/shared';
import { getRoom } from '../rooms/registry';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? '';
const API_KEY = process.env.CLOUDINARY_API_KEY ?? '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? '';

const router = Router();

// Unggah berlangsung langsung dari klien ke Cloudinary (AGENTS.md §12);
// endpoint ini hanya memberi tanda tangan, secret tidak pernah menyentuh klien.
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

router.post('/api/assets/signature', (req, res) => {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    res.status(503).json({
      code: 'CLOUDINARY_NOT_CONFIGURED',
      message: 'Server belum dikonfigurasi untuk unggah aset (Cloudinary).',
    });
    return;
  }

  const parsed = assetSignatureRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ code: 'INVALID_PAYLOAD', message: 'Permintaan tanda tangan tidak valid.' });
    return;
  }
  if (!getRoom(parsed.data.roomCode)) {
    res.status(404).json({ code: 'ROOM_NOT_FOUND', message: 'Kode ruang tidak ditemukan.' });
    return;
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Folder per ruang (AGENTS.md §12): membatasi tempat aset disimpan.
  const folder = `myvtt/room-${parsed.data.roomCode}/${parsed.data.kind}s`;
  const params = { folder, format: 'webp', timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key as keyof typeof params]}`)
    .join('&');
  const signature = createHash('sha1')
    .update(toSign + API_SECRET)
    .digest('hex');

  res.json({
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    timestamp,
    signature,
    folder,
  });
});

export default router;
