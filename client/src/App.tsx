import { useState } from 'react';
import BottomNav, { type TabId } from './components/BottomNav';
import CreateRoomScreen from './features/room/CreateRoomScreen';
import { useRoomStore } from './features/room/store';
import MapScreen from './features/map/MapScreen';
import DiceScreen from './features/dice/DiceScreen';
import CharacterScreen from './features/character/CharacterScreen';
import LogScreen from './features/log/LogScreen';

/**
 * App shell mobile-first (F1) dengan empat tab: Peta, Dadu, Karakter, Log.
 * Tema gelap default (F2). Sebelum ada ruang (A1) tampil layar Buat Ruang.
 */
export default function App() {
  const [tab, setTab] = useState<TabId>('map');
  const code = useRoomStore((state) => state.code);

  if (code === null) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <CreateRoomScreen />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="border-b border-slate-800 px-4 py-2 text-center">
        <span className="text-xs text-slate-400">Kode ruang </span>
        <span className="font-mono text-sm font-semibold tracking-widest text-indigo-300">
          {code}
        </span>
      </header>
      <main className="flex-1 overflow-hidden">
        {tab === 'map' && <MapScreen />}
        {tab === 'dice' && <DiceScreen />}
        {tab === 'character' && <CharacterScreen />}
        {tab === 'log' && <LogScreen />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
