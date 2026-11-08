import type { Token } from '@myvtt/shared';
import { useRoomStore } from '../room/store';
import SizeChoiceRow from './SizeChoiceRow';

interface TokenSizeRowProps {
  token: Token;
}

/**
 * Pemilih ukuran token (C9) di sheet: DM atau pemilik token (izin sama
 * dengan ganti gambar). Mengirim `token:update` {size}; snap menyesuaikan.
 */
export default function TokenSizeRow({ token }: TokenSizeRowProps) {
  const role = useRoomStore((state) => state.role);
  const nickname = useRoomStore((state) => state.nickname);
  const setTokenSize = useRoomStore((state) => state.setTokenSize);

  const canChange = role === 'dm' || (token.owner !== null && token.owner === nickname);
  if (!canChange) return null;

  const current = token.size ?? 1;

  return (
    <SizeChoiceRow
      value={current}
      onChange={(size) => {
        if (current !== size) void setTokenSize(token.id, size);
      }}
    />
  );
}
