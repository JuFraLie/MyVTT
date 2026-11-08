import type { Role, Token } from '@myvtt/shared';

/** Pelaku aksi di ruang: hasil getMembership(). */
export interface Actor {
  role: Role;
  nickname: string;
}

/** A6: hanya DM yang boleh mengubah state ruang (peta, grid, fog, token). */
export function canEditRoom(actor: Actor): boolean {
  return actor.role === 'dm';
}

/**
 * A6: kelola token (gerakkan, ubah HP) — DM boleh semua token;
 * pemain HANYA token yang `owner`-nya sama dengan namanya.
 */
export function canManageToken(actor: Actor, token: Token): boolean {
  return canEditRoom(actor) || (token.owner !== null && token.owner === actor.nickname);
}
