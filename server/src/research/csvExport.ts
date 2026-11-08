import { scoreSus, scoreUeq, type TelemetryEvent } from '@myvtt/shared';

/** Escape nilai sel CSV: koma, kutip, dan baris baru dikutip ganda. */
function cell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(header: string, rows: (string | number)[][]): string {
  return [header, ...rows.map((row) => row.map(cell).join(','))].join('\r\n');
}

/** CSV mentah seluruh event telemetry (G5). */
export function buildTelemetryCsv(events: TelemetryEvent[]): string {
  const rows = events.map((event) => [
    event.participantId,
    event.sessionId,
    event.type,
    event.at,
    JSON.stringify(event.metadata),
  ]);
  return toCsv('participantId,sessionId,type,at,metadata', rows);
}

interface QuestionnaireAgg {
  participantId: string;
  sessionId: string;
  susAnswers?: string;
  susDurationMs?: number;
  ueqAnswers?: string;
  at?: number;
}

/**
 * CSV kuesioner (G5): satu baris per pasangan sesi–partisipan berisi jawaban
 * mentah SUS & UEQ-S plus skor terhitung (SUS 0–100; UEQ-S PQ & HQI −3..+3).
 */
export function buildQuestionnaireCsv(events: TelemetryEvent[]): string {
  const map = new Map<string, QuestionnaireAgg>();
  for (const event of events) {
    if (event.type !== 'questionnaire') continue;
    const instrument = event.metadata.instrument;
    if (instrument !== 'sus' && instrument !== 'ueqs') continue;
    const key = `${event.participantId}|${event.sessionId}`;
    const agg = map.get(key) ?? { participantId: event.participantId, sessionId: event.sessionId };
    const answers = String(event.metadata.answers ?? '');
    if (instrument === 'sus') {
      agg.susAnswers = answers;
      agg.susDurationMs = Number(event.metadata.durationMs ?? 0);
    } else {
      agg.ueqAnswers = answers;
    }
    agg.at = event.at;
    map.set(key, agg);
  }

  const rows = [...map.values()].map((agg) => {
    const sus = agg.susAnswers ? scoreSus(agg.susAnswers.split(',').map(Number)) : null;
    const ueq = agg.ueqAnswers
      ? scoreUeq(agg.ueqAnswers.split(',').map(Number))
      : { pq: null, hqi: null };
    return [
      agg.participantId,
      agg.sessionId,
      agg.susAnswers ?? '',
      sus ?? '',
      agg.ueqAnswers ?? '',
      ueq.pq ?? '',
      ueq.hqi ?? '',
      agg.susDurationMs ?? '',
      agg.at ?? '',
    ];
  });

  return toCsv(
    'participantId,sessionId,susAnswers,susScore,ueqAnswers,ueqPqMean,ueqHqiMean,durationMs,at',
    rows,
  );
}
