/**
 * Uji runtime D2 (advantage/disadvantage) terhadap server berjalan di :3001.
 * Aturan: daftarkan listener SEBELUM emit; watchdog agar tidak menggantung.
 */
import { io, type Socket } from 'socket.io-client';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type DiceRolledPayload,
  type DiceRollResult,
  type ErrorPayload,
  type LogAppendedPayload,
  type RoomCreateAck,
  type RoomJoinResult,
} from '@myvtt/shared';

const URL = 'http://localhost:3001';

function ack<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (err: Error | null, res?: T) => {
      if (err || !res) reject(err ?? new Error('tanpa acknowledgment'));
      else resolve(res);
    });
  });
}

function waitEvent<T>(
  socket: Socket,
  event: string,
  predicate: (data: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve) => {
    const handler = (data: T) => {
      if (!predicate(data)) return;
      socket.off(event, handler);
      resolve(data);
    };
    socket.on(event, handler);
  });
}

const watchdog = setTimeout(() => {
  console.error('WATCHDOG: uji tidak selesai dalam 45 detik');
  process.exit(1);
}, 45000);

async function main() {
  const dm = io(URL, { transports: ['websocket'] });
  const { code } = await ack<RoomCreateAck>(dm, CLIENT_EVENTS.ROOM_CREATE, {});
  const joined = await ack<RoomJoinResult>(dm, CLIENT_EVENTS.ROOM_JOIN, {
    code,
    nickname: 'Dewi',
    role: 'dm',
  });
  if (!joined.ok) throw new Error('join DM gagal');
  console.log(`ruang ${code}: ✓`);

  // 1) Lemparan normal d20+5 — regresi D1 (tanpa field mode).
  const normalWait = waitEvent<DiceRolledPayload>(dm, SERVER_EVENTS.DICE_ROLLED);
  const normal = await ack<DiceRollResult>(dm, CLIENT_EVENTS.DICE_ROLL, {
    dice: 'd20',
    count: 1,
    modifier: 5,
  });
  if (!normal.ok) throw new Error('roll normal gagal');
  const normalRoll = await normalWait;
  const normalOk =
    normalRoll.rolls.length === 1 &&
    normalRoll.mode === undefined &&
    normalRoll.total === (normalRoll.rolls[0] ?? 0) + 5;
  console.log(`normal 1d20+5: ${normalOk ? '✓' : `SALAH ${JSON.stringify(normalRoll)}`}`);

  // 2) Advantage: 2d20, total = tertinggi + modifier.
  const advWait = waitEvent<DiceRolledPayload>(
    dm,
    SERVER_EVENTS.DICE_ROLLED,
    (payload) => payload.mode === 'advantage',
  );
  const adv = await ack<DiceRollResult>(dm, CLIENT_EVENTS.DICE_ROLL, {
    dice: 'd20',
    count: 1,
    modifier: 3,
    mode: 'advantage',
  });
  if (!adv.ok) throw new Error(`roll advantage gagal: ${adv.error.code}`);
  const advRoll = await advWait;
  const advOk =
    advRoll.rolls.length === 2 &&
    advRoll.count === 2 &&
    advRoll.total === Math.max(...advRoll.rolls) + 3;
  console.log(
    `advantage 1d20+3: ${advOk ? '✓' : `SALAH ${JSON.stringify(advRoll)}`}`,
  );

  // 3) Disadvantage: total = terendah + modifier.
  const disWait = waitEvent<DiceRolledPayload>(
    dm,
    SERVER_EVENTS.DICE_ROLLED,
    (payload) => payload.mode === 'disadvantage',
  );
  const dis = await ack<DiceRollResult>(dm, CLIENT_EVENTS.DICE_ROLL, {
    dice: 'd20',
    count: 1,
    modifier: -2,
    mode: 'disadvantage',
  });
  if (!dis.ok) throw new Error(`roll disadvantage gagal: ${dis.error.code}`);
  const disRoll = await disWait;
  const disOk =
    disRoll.rolls.length === 2 && disRoll.total === Math.min(...disRoll.rolls) - 2;
  console.log(`disadvantage 1d20-2: ${disOk ? '✓' : `SALAH ${JSON.stringify(disRoll)}`}`);

  // 4) Log bersama memuat label mode (D3).
  const logWait = waitEvent<LogAppendedPayload>(
    dm,
    SERVER_EVENTS.LOG_APPENDED,
    (payload) => payload.entry.type === 'dice' && payload.entry.text.includes('2d20 adv'),
  );
  await logWait;
  console.log('log "2d20 adv": ✓');

  // 5) advantage + d6 → INVALID_PAYLOAD (tanpa ack; server hanya mengirim error).
  const errAdvD6 = waitEvent<ErrorPayload>(
    dm,
    SERVER_EVENTS.ERROR,
    (error) => error.code === 'INVALID_PAYLOAD' && error.message.includes('dice:roll'),
  );
  dm.emit(CLIENT_EVENTS.DICE_ROLL, { dice: 'd6', count: 1, modifier: 0, mode: 'advantage' });
  await errAdvD6;
  console.log('advantage d6: INVALID_PAYLOAD ✓');

  // 6) advantage + count 2 → INVALID_PAYLOAD.
  const errAdvCount = waitEvent<ErrorPayload>(
    dm,
    SERVER_EVENTS.ERROR,
    (error) => error.code === 'INVALID_PAYLOAD' && error.message.includes('dice:roll'),
  );
  dm.emit(CLIENT_EVENTS.DICE_ROLL, { dice: 'd20', count: 2, modifier: 0, mode: 'advantage' });
  await errAdvCount;
  console.log('advantage count=2: INVALID_PAYLOAD ✓');

  // 7) Regresi: d6 biasa count 2 tetap jalan tanpa mode.
  const d6Wait = waitEvent<DiceRolledPayload>(
    dm,
    SERVER_EVENTS.DICE_ROLLED,
    (payload) => payload.dice === 'd6',
  );
  const d6 = await ack<DiceRollResult>(dm, CLIENT_EVENTS.DICE_ROLL, {
    dice: 'd6',
    count: 2,
    modifier: 1,
  });
  if (!d6.ok) throw new Error('roll d6 gagal');
  const d6Roll = await d6Wait;
  const d6Ok =
    d6Roll.rolls.length === 2 &&
    d6Roll.mode === undefined &&
    d6Roll.total === d6Roll.rolls.reduce((sum, value) => sum + value, 0) + 1;
  console.log(`normal 2d6+1: ${d6Ok ? '✓' : `SALAH ${JSON.stringify(d6Roll)}`}`);

  dm.close();
  console.log('SEMUA LULUS');
  clearTimeout(watchdog);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
