import { Clock } from 'lucide-react';

interface TimerPillProps {
  timer: number;
  submittedCount?: number;
  totalArtists?: number;
  compact?: boolean;
}

/** Pílula única de timer — evita os 3 timers diferentes que existiam em App/Game/Mobile. */
export default function TimerPill({ timer, submittedCount, totalArtists, compact }: TimerPillProps) {
  const urgent = timer > 0 && timer <= 20;
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold border-2 border-zinc-900 shadow-[1px_1px_0px_#18181b] ${
          compact ? 'text-xs' : 'text-sm'
        } ${urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-zinc-900'}`}
      >
        <Clock className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{timer > 0 ? `${timer}s` : '♾️'}</span>
      </div>
      {typeof submittedCount === 'number' && typeof totalArtists === 'number' && (
        <div className="text-xs font-bold text-zinc-900 bg-white px-2 py-1 rounded-lg border-2 border-zinc-900 shadow-[1px_1px_0px_#18181b]">
          🎨 {submittedCount}/{totalArtists}
        </div>
      )}
    </div>
  );
}
