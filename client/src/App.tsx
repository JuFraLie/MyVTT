import { useState } from 'react';
import BottomNav, { type TabId } from './components/BottomNav';
import MapScreen from './features/map/MapScreen';
import DiceScreen from './features/dice/DiceScreen';
import CharacterScreen from './features/character/CharacterScreen';
import LogScreen from './features/log/LogScreen';

/**
 * App shell mobile-first (F1) dengan empat tab: Peta, Dadu, Karakter, Log.
 * Tema gelap default (F2). Layar per fitur diisi pada fase berikutnya.
 */
export default function App() {
  const [tab, setTab] = useState<TabId>('map');

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
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
