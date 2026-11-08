import { useRef, useState } from 'react';
import type { Demographics } from '@myvtt/shared';
import { createParticipantId, saveParticipant } from '../../lib/participant';
import { logTelemetry } from '../../lib/telemetry';
import ConsentScreen from './ConsentScreen';
import DemographicsScreen from './DemographicsScreen';

interface ResearchFlowProps {
  onComplete: () => void;
}

/**
 * Gerbang riset (G1): persetujuan → demografi → aplikasi. Record disimpan
 * lokal lebih dulu; pengiriman telemetry ke server menyusul di G2 dan hanya
 * boleh aktif setelah record ini ada (AGENTS §8).
 */
export default function ResearchFlow({ onComplete }: ResearchFlowProps) {
  const [step, setStep] = useState<'consent' | 'demographics'>('consent');
  const participantIdRef = useRef(createParticipantId());

  function handleDemographics(demographics: Demographics) {
    saveParticipant({
      participantId: participantIdRef.current,
      consent: true,
      demographics,
      agreedAt: Date.now(),
    });
    // Data demografi ikut ke server sebagai event telemetry (G2) agar G5 bisa
    // mengekspornya bersama log — terkirim otomatis saat koneksi terbuka.
    logTelemetry('demographics', {
      dndExperience: demographics.dndExperience,
      device: demographics.device,
      screenInches: demographics.screenInches,
    });
    onComplete();
  }

  if (step === 'consent') {
    return <ConsentScreen onNext={() => setStep('demographics')} />;
  }
  return <DemographicsScreen onDone={handleDemographics} />;
}
