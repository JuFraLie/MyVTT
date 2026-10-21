import { useState } from 'react';
import CreateRoomScreen from './CreateRoomScreen';
import JoinRoomScreen from './JoinRoomScreen';

type GateView = 'home' | 'join';

/** Gerbang sesi (A1 + A2): pilih buat ruang baru atau gabung dengan kode. */
export default function RoomGateScreen() {
  const [view, setView] = useState<GateView>('home');

  if (view === 'join') return <JoinRoomScreen onBack={() => setView('home')} />;
  return <CreateRoomScreen onOpenJoin={() => setView('join')} />;
}
