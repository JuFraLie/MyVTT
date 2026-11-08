import { useEffect, useState } from 'react';
import BottomNav, { type TabId } from './components/BottomNav';
import RoomGateScreen from './features/room/RoomGateScreen';
import { useRoomStore } from './features/room/store';
import MapScreen from './features/map/MapScreen';
import DiceScreen from './features/dice/DiceScreen';
import CharacterScreen from './features/character/CharacterScreen';
import LogScreen from './features/log/LogScreen';
import ResearchFlow from './features/research/ResearchFlow';
import QuestionnaireScreen from './features/research/QuestionnaireScreen';
import ResearcherExport from './features/research/ResearcherExport';
import TaskBar from './features/research/TaskBar';
import { questionnaireDone } from './features/research/questionnaire';
import { initTaskWatcher, tasksFinished, useTaskStore } from './features/research/taskStore';
import { initTelemetry } from './lib/telemetry';
import { loadParticipant } from './lib/participant';

/**
 * App shell mobile-first (F1) dengan empat tab: Peta, Dadu, Karakter, Log.
 * Tema gelap default (F2). Gerbang riset (G1) tampil pertama kali bila
 * partisipan belum setuju; baru gerbang sesi (A1/A2). Telemetry (G2) aktif
 * otomatis — pencatatannya tetap diblokir tanpa record consent.
 */
export default function App() {
  const [tab, setTab] = useState<TabId>('map');
  const [agreed, setAgreed] = useState(() => loadParticipant() !== null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(
    () => loadParticipant() !== null && tasksFinished() && !questionnaireDone(),
  );
  const taskActive = useTaskStore((state) => state.active);
  // Gerbang peneliti (G5): hanya hash URL khusus; tanpa data partisipan.
  const [researcherView, setResearcherView] = useState(() => window.location.hash === '#/peneliti');
  const { code, nickname, role, members, isConnected } = useRoomStore();

  useEffect(() => {
    initTelemetry();
    initTaskWatcher();
  }, []);

  // Mode tugas (G3): mulai setelah consent, kecuali sudah pernah selesai.
  useEffect(() => {
    if (agreed && !tasksFinished()) useTaskStore.getState().begin();
  }, [agreed]);

  // Kuesioner (G4): muncul begitu tugas selesai & belum pernah diisi.
  useEffect(() => {
    if (!agreed) return;
    const check = () => setShowQuestionnaire(tasksFinished() && !questionnaireDone());
    check();
    return useTaskStore.subscribe(check);
  }, [agreed]);

  useEffect(() => {
    const onHash = () => setResearcherView(window.location.hash === '#/peneliti');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (researcherView) {
    return <ResearcherExport />;
  }

  if (!agreed) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <ResearchFlow onComplete={() => setAgreed(true)} />
      </div>
    );
  }

  if (code === null || nickname === null) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        {taskActive && <TaskBar />}
        {showQuestionnaire && <QuestionnaireScreen onDone={() => setShowQuestionnaire(false)} />}
        <RoomGateScreen />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col md:flex-row">
      {taskActive && <TaskBar />}
      {showQuestionnaire && <QuestionnaireScreen onDone={() => setShowQuestionnaire(false)} />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-center gap-2 border-b border-slate-800 px-4 py-2 md:px-6">
          <span className="font-mono text-sm font-semibold tracking-widest text-indigo-300">
            {code}
          </span>
          <span className="truncate text-xs text-slate-400">
            {nickname} · {role === 'dm' ? 'DM' : 'Pemain'} · {members.length} anggota
          </span>
          {!isConnected && (
            <span className="shrink-0 text-xs text-amber-400">· terputus, menyambung ulang…</span>
          )}
        </header>
        <main className="flex-1 overflow-hidden">
          {tab === 'map' && <MapScreen />}
          {tab === 'dice' && <DiceScreen />}
          {tab === 'character' && <CharacterScreen />}
          {tab === 'log' && <LogScreen />}
        </main>
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
