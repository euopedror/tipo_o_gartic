import { Sliders } from 'lucide-react';
import type { GameState } from '../../types';
import { sounds } from '../../utils/audioFx';

interface HostSettingsProps {
  gameState: GameState;
  isHost: boolean;
  onUpdateSettings: (roundTime?: number, maxRounds?: number, voiceEnabled?: boolean, reactionsEnabled?: boolean) => void;
  compact?: boolean;
}

const ROUND_TIMES = [
  { label: '♾️ Livre', short: 'Livre', val: 0 },
  { label: '60s', short: '60s', val: 60 },
  { label: '90s', short: '90s', val: 90 },
  { label: '120s', short: '120s', val: 120 },
];

const TOURNAMENTS = [
  { label: '3 Rod.', short: '3 Rodadas', val: 3 },
  { label: '5 Rod.', short: '5 Rodadas', val: 5 },
  { label: 'Sem Fim', short: 'Sem Fim', val: 0 },
];

/** Regras da partida — mesmo componente no web e no mobile (mobile usa accordion fora). */
export default function HostSettings({ gameState, isHost, onUpdateSettings, compact }: HostSettingsProps) {
  if (!isHost) {
    return (
      <div className="py-2 px-4 bg-zinc-50 rounded-xl border-2 border-zinc-900 flex items-center justify-around text-xs shadow-[2px_2px_0px_#18181b] font-sketch">
        <div className="flex items-center gap-1.5 text-zinc-600">
          <span>⏱️ Tempo:</span>
          <span className="font-bold text-zinc-900">
            {(gameState.settings?.roundTime ?? 0) === 0 ? 'Sem Limite (♾️)' : `${gameState.settings?.roundTime}s`}
          </span>
        </div>
        <div className="w-px h-4 bg-zinc-300" />
        <div className="flex items-center gap-1.5 text-zinc-600">
          <span>🏁 Torneio:</span>
          <span className="font-bold text-zinc-900">
            {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Limite'}
          </span>
        </div>
        <div className="w-px h-4 bg-zinc-300" />
        <div className="flex items-center gap-1.5 text-zinc-600">
          <span>🎙️ Voz:</span>
          <span className={`font-bold ${gameState.settings?.voiceEnabled === true ? 'text-emerald-700' : 'text-red-600'}`}>
            {gameState.settings?.voiceEnabled === true ? 'Ativada' : 'Desativada'}
          </span>
        </div>
        <div className="w-px h-4 bg-zinc-300" />
        <div className="flex items-center gap-1.5 text-zinc-600">
          <span>🎭 Reações:</span>
          <span className={`font-bold ${gameState.settings?.reactionsEnabled === false ? 'text-red-600' : 'text-emerald-700'}`}>
            {gameState.settings?.reactionsEnabled === false ? 'Mutadas' : 'Ligadas'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-zinc-50 rounded-xl border-2 border-zinc-900 text-left shadow-[2px_2px_0px_#18181b]">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 mb-2.5 font-sketch">
        <Sliders className="w-3.5 h-3.5" />
        <span>Regras da Partida (Host)</span>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div>
          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">⏱️ Tempo por Rodada:</span>
          <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900">
            {ROUND_TIMES.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateSettings(opt.val, undefined);
                }}
                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                  (gameState.settings?.roundTime ?? 0) === opt.val
                    ? 'bg-zinc-900 text-white shadow-sm font-black'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {compact ? opt.short : opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">🏁 Duração do Torneio:</span>
          <div className={`grid gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900 ${compact ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {TOURNAMENTS.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateSettings(undefined, opt.val);
                }}
                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                  (gameState.settings?.maxRounds ?? 3) === opt.val
                    ? 'bg-amber-300 text-zinc-900 shadow-sm font-black'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {compact ? opt.short : opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">🎙️ Chat de Voz:</span>
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900">
            {[
              { label: '🟢 Ligado', short: '🟢 On', val: true },
              { label: '🔴 Mudo', short: '🔴 Off', val: false },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateSettings(undefined, undefined, opt.val);
                }}
                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                  (gameState.settings?.voiceEnabled === true) === opt.val
                    ? 'bg-emerald-300 text-zinc-900 shadow-sm font-black'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {compact ? opt.short : opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">🎭 Reações Flutuantes:</span>
          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900">
            {[
              { label: '🎉 Ligadas', short: '🎉 On', val: true },
              { label: '🔇 Mutadas', short: '🔇 Off', val: false },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateSettings(undefined, undefined, undefined, opt.val);
                }}
                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                  (gameState.settings?.reactionsEnabled !== false) === opt.val
                    ? 'bg-rose-200 text-zinc-900 shadow-sm font-black'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {compact ? opt.short : opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
