/**
 * Nama event Socket.io — satu-satunya sumber kebenaran (AGENTS.md §6).
 * Klien dan server hanya boleh memakai konstanta dari sini, bukan string literal.
 */

export const CLIENT_EVENTS = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  MAP_SET: 'map:set',
  GRID_SET: 'grid:set',
  ASSET_ADD: 'asset:add',
  ASSET_REMOVE: 'asset:remove',
  TOKEN_ADD: 'token:add',
  TOKEN_MOVE: 'token:move',
  TOKEN_UPDATE: 'token:update',
  TOKEN_REMOVE: 'token:remove',
  FOG_SET: 'fog:set',
  DICE_ROLL: 'dice:roll',
  INITIATIVE_UPDATE: 'initiative:update',
  UNDO_REQUEST: 'undo:request',
  TELEMETRY_EVENT: 'telemetry:event',
} as const;

export const SERVER_EVENTS = {
  STATE_FULL: 'state:full',
  ASSET_ADDED: 'asset:added',
  TOKEN_MOVED: 'token:moved',
  TOKEN_UPDATED: 'token:updated',
  FOG_UPDATED: 'fog:updated',
  LOG_APPENDED: 'log:appended',
  INITIATIVE_UPDATED: 'initiative:updated',
  ERROR: 'error',
} as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEvent = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
