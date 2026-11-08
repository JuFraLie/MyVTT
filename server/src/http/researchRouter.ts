import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { loadTelemetry } from '../db';
import { buildQuestionnaireCsv, buildTelemetryCsv } from '../research/csvExport';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const PASSCODE = process.env.RESEARCH_PASSCODE ?? '';

const router = Router();

router.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.header('Access-Control-Allow-Headers', 'X-Research-Passcode');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

/** Bandingkan passcode lewat hash SHA-256 agar panjang sama (timing-safe). */
function passcodeMatches(provided: string): boolean {
  if (!PASSCODE) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(PASSCODE).digest();
  return timingSafeEqual(a, b);
}

/**
 * G5: ekspor CSV data riset. Dilindungi passcode `RESEARCH_PASSCODE` dari
 * env server — bila belum di-set, endpoint menolak semua permintaan.
 * `?format=telemetry` (mentah) atau `?format=questionnaire` (skor).
 */
router.get('/api/research/export', async (req, res) => {
  if (!PASSCODE) {
    res
      .status(503)
      .json({ code: 'RESEARCH_PASSCODE_NOT_SET', message: 'Set RESEARCH_PASSCODE di server.' });
    return;
  }
  if (!passcodeMatches(req.get('x-research-passcode') ?? '')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Passcode salah.' });
    return;
  }

  const events = await loadTelemetry();
  const questionnaire = req.query.format === 'questionnaire';
  const csv = questionnaire ? buildQuestionnaireCsv(events) : buildTelemetryCsv(events);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${questionnaire ? 'questionnaire' : 'telemetry'}.csv"`,
  );
  res.send(csv);
});

export default router;
