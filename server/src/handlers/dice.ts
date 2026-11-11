import { randomInt } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  diceRollSchema,
  type DiceRollResult,
  type DiceRolledPayload,
  type DiceType,
  type ErrorPayload,
} from '@myvtt/shared';
import { appendLog, getMembership } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload dice:roll tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };

// Jumlah sisi dadu per tipe; tipe sudah divalidasi zod sehingga selalu ada.
const FACES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 } as const satisfies Record<
  DiceType,
  number
>;

/**
 * Handler D1 (dice roller): klien hanya mengirim NIAT (tipe/jumlah/modifier);
 * angka dadu dan total dihitung di server dengan crypto.randomInt agar adil
 * dan konsisten, lalu disiarkan `dice:rolled` ke seluruh ruang (D3 nanti
 * memasukkani ke log bersama).
 */
export function registerDiceHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.DICE_ROLL, (payload: unknown, ack: (res: DiceRollResult) => void) => {
      const parsed = diceRollSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: NOT_IN_ROOM });
        return;
      }

      const { dice, count, modifier, mode } = parsed.data;
      const faces = FACES[dice];
      // D2: advantage/disadvantage melempar 2d20 lalu ambil tertinggi/terendah.
      const isCheck = mode === 'advantage' || mode === 'disadvantage';
      let rolls: number[];
      let total: number;
      if (isCheck) {
        const pair = [randomInt(1, 21), randomInt(1, 21)];
        const kept = mode === 'advantage' ? Math.max(...pair) : Math.min(...pair);
        rolls = pair;
        total = kept + modifier;
      } else {
        rolls = Array.from({ length: count }, () => randomInt(1, faces + 1));
        total = rolls.reduce((sum, value) => sum + value, 0) + modifier;
      }
      const label = isCheck ? `2d20 ${mode === 'advantage' ? 'adv' : 'dis'}` : `${count}${dice}`;
      const result: DiceRolledPayload = {
        dice,
        count: isCheck ? 2 : count,
        rolls,
        modifier,
        total,
        nickname: membership.nickname,
        ...(isCheck && mode ? { mode } : {}),
      };
      console.log(
        `[dice] ${membership.code} ${membership.nickname}: ${label}${modifier >= 0 ? '+' : ''}${modifier} = ${total}`,
      );

      io.to(membership.code).emit(SERVER_EVENTS.DICE_ROLLED, result);
      // D3: lemparan juga masuk log bersama (riwayat urut di tab Log).
      const entry = appendLog(membership.code, {
        type: 'dice',
        actor: membership.nickname,
        text: `${label}${modifier >= 0 ? '+' : ''}${modifier} = ${total} (${rolls.join(', ')})`,
      });
      if (entry) {
        io.to(membership.code).emit(SERVER_EVENTS.LOG_APPENDED, { entry });
      }
      ack({ ok: true });
    });
  });
}
