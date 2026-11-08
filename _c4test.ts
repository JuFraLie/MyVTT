// Uji manual C4 (dihapus setelah lulus): ikon kondisi token + izin + validasi.
import { io, type Socket } from 'socket.io-client';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type RoomCreateAck,
  type RoomFullState,
  type RoomJoinResult,
  type TokenAddResult,
  type TokenUpdateResult,
  type TokenUpdatedPayload,
} from '@myvtt/shared';

const URL = 'http://localhost:3001';
const MAP_URL = 'https://res.cloudinary.com/demo/image/upload/v1/maps/room.webp';

// Pengaman: jangan sampai menggantung bila ada balapan listener.
setTimeout(() => {
  console.error('TIMEOUT uji C4');
  process.exit(1);
}, 30000).unref();

function ack<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(3000).emit(event, payload, (err: Error | null, res?: T) => {
      if (err || !res) reject(err ?? new Error('tanpa acknowledgment'));
      else resolve(res);
    });
  });
}

/** Tunggu `state:full` berikutnya (token:add menyiar state penuh). */
function waitState(socket: Socket): Promise<RoomFullState> {
  return new Promise((resolve) => socket.once(SERVER_EVENTS.STATE_FULL, resolve));
}

/** Tunggu `token:updated` yang memenuhi predikat — aman dari balapan broadcast. */
function waitUpdated(
  socket: Socket,
  predicate: (payload: TokenUpdatedPayload) => boolean,
): Promise<TokenUpdatedPayload> {
  return new Promise((resolve) => {
    const handler = (payload: TokenUpdatedPayload) => {
      if (!predicate(payload)) return;
      socket.off(SERVER_EVENTS.TOKEN_UPDATED, handler);
      resolve(payload);
    };
    socket.on(SERVER_EVENTS.TOKEN_UPDATED, handler);
  });
}

async function expectError(socket: Socket, payload: unknown): Promise<string> {
  const error = new Promise<{ code: string }>((resolve) =>
    socket.once(SERVER_EVENTS.ERROR, resolve),
  );
  socket.emit(CLIENT_EVENTS.TOKEN_UPDATE, payload);
  return (await error).code;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Setup: DM + Budi + peta + dua token. ---
const dm = io(URL);
const created = await ack<RoomCreateAck>(dm, CLIENT_EVENTS.ROOM_CREATE, {});
const code = created.code;
await ack<RoomJoinResult>(dm, CLIENT_EVENTS.ROOM_JOIN, { code, nickname: 'Dun', role: 'dm' });
const mapSet = await ack<{ ok: true } | { ok: false }>(dm, CLIENT_EVENTS.MAP_SET, {
  url: MAP_URL,
  width: 1024,
  height: 768,
});
if (!mapSet.ok) throw new Error('map:set gagal');

const budi = io(URL);
await ack<RoomJoinResult>(budi, CLIENT_EVENTS.ROOM_JOIN, {
  code,
  nickname: 'Budi',
  role: 'player',
});

// Listener dipasang SEBELUM emit: state:full tiba lebih dulu daripada ack.
const goblinState = waitState(dm);
const addGoblin = await ack<TokenAddResult>(dm, CLIENT_EVENTS.TOKEN_ADD, {
  name: 'Goblin',
  color: '#22c55e',
});
if (!addGoblin.ok) throw new Error('token:add gagal');
const afterGoblin = await goblinState;
const goblinId =
  afterGoblin.tokens.find((token) => token.name === 'Goblin')?.id ?? '';
const swordState = waitState(dm);
const addSword = await ack<TokenAddResult>(dm, CLIENT_EVENTS.TOKEN_ADD, {
  name: 'Pedang',
  color: '#ef4444',
  owner: 'Budi',
});
if (!addSword.ok) throw new Error('token:add owner gagal');
const afterSword = await swordState;
const swordId = afterSword.tokens.find((token) => token.name === 'Pedang')?.id ?? '';
if (!goblinId || !swordId) throw new Error('id token tidak ditemukan di state:full');

// --- 1) DM memasang kondisi → broadcast berisi conditions. ---
const forDm = waitUpdated(dm, (p) => p.conditions !== undefined);
const forBudi = waitUpdated(budi, (p) => p.conditions !== undefined);
const set1 = await ack<TokenUpdateResult>(dm, CLIENT_EVENTS.TOKEN_UPDATE, {
  id: goblinId,
  conditions: ['poisoned', 'prone'],
});
console.log('DM set kondisi:', set1.ok ? 'ok' : set1.error.code);
const [u1, u2] = await Promise.all([forDm, forBudi]);
console.log(
  `broadcast identik & benar: ${
    JSON.stringify(u1) === JSON.stringify(u2) &&
    u1.id === goblinId &&
    u1.conditions?.join('+') === 'poisoned+prone'
      ? '✓'
      : `SALAH ${JSON.stringify(u1)}`
  }`,
);

// --- 2) Pemain memasang kondisi token miliknya sendiri → ok. ---
const forBudi2 = waitUpdated(budi, (p) => p.id === swordId);
const set2 = await ack<TokenUpdateResult>(budi, CLIENT_EVENTS.TOKEN_UPDATE, {
  id: swordId,
  conditions: ['stunned'],
});
console.log('pemain set kondisi sendiri:', set2.ok ? 'ok' : set2.error.code);
const u3 = await forBudi2;
console.log(`kondisi token pemain: ${u3.conditions?.join('+') === 'stunned' ? '✓' : 'SALAH'}`);

// --- 3) Pemain menyentuh kondisi token DM → FORBIDDEN. ---
const set3 = await ack<TokenUpdateResult>(budi, CLIENT_EVENTS.TOKEN_UPDATE, {
  id: goblinId,
  conditions: ['blinded'],
});
console.log('pemain set token DM:', set3.ok ? 'ok (SALAH)' : set3.error.code);

// --- 4) Id di luar preset → INVALID_PAYLOAD. ---
console.log('id asing:', await expectError(dm, { id: goblinId, conditions: ['burning'] }));

// --- 5) Lebih dari 6 kondisi → INVALID_PAYLOAD. ---
console.log(
  '7 kondisi:',
  await expectError(dm, {
    id: goblinId,
    conditions: ['poisoned', 'stunned', 'prone', 'blinded', 'frightened', 'concentration', 'poisoned'],
  }),
);

// --- 6) Regresi: update HP tetap jalan & conditions tidak ikut terkirim. ---
const forHp = waitUpdated(budi, (p) => p.hp !== undefined);
const setHp = await ack<TokenUpdateResult>(dm, CLIENT_EVENTS.TOKEN_UPDATE, {
  id: goblinId,
  hp: 8,
});
console.log('update HP:', setHp.ok ? 'ok' : setHp.error.code);
const uHp = await forHp;
console.log(
  `HP 8 & tanpa conditions: ${uHp.hp === 8 && uHp.conditions === undefined ? '✓' : `SALAH ${JSON.stringify(uHp)}`}`,
);

// --- 7) join ulang membawa kondisi terkini dari server (state:full). ---
const rejoiner = io(URL);
const rejoined = await ack<RoomJoinResult>(rejoiner, CLIENT_EVENTS.ROOM_JOIN, {
  code,
  nickname: 'Citra',
  role: 'player',
});
const rejoinedGoblin =
  'state' in rejoined ? rejoined.state.tokens.find((t) => t.id === goblinId) : undefined;
console.log(
  `join ulang bawa kondisi: ${rejoinedGoblin?.conditions?.join('+') === 'poisoned+prone' ? '✓' : `SALAH ${JSON.stringify(rejoinedGoblin?.conditions)}`}`,
);

dm.close();
budi.close();
rejoiner.close();
setTimeout(() => process.exit(0), 200);
