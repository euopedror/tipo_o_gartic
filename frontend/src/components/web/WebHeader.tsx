import { Check, Copy, LogOut, Volume2, VolumeX } from 'lucide-react';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';
import AvatarIcon from '../common/AvatarIcon';

interface WebHeaderProps {
  gameState: GameState;
  myPlayer?: Player;
  playerName: string;
  playerAvatar: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLeaveRoom: () => void;
  onCopyCode: () => void;
  copied: boolean;
}

/** Header exclusivo desktop — extraído do App.tsx para limpar o shell. */
export default function WebHeader({
  gameState,
  myPlayer,
  playerName,
  playerAvatar,
  soundEnabled,
  onToggleSound,
  onLeaveRoom,
  onCopyCode,
  copied,
}: WebHeaderProps) {
  return (
    <header className="bg-white border-b-2 border-zinc-900 px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-1.5 sm:gap-2.5 font-sketch shrink-0 select-none">
        <span className="text-xl sm:text-2xl md:text-3xl">✏️</span>
        <div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-900 leading-none">
            Desenho Cego
          </h1>
          <div className="text-[10px] sm:text-xs text-zinc-500 font-bold hidden sm:block">
            caderno de rabiscos
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <button
          onClick={() => {
            sounds.playClick();
            onCopyCode();
          }}
          title="Clique para copiar o código da sala"
          className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-amber-50 border-2 border-zinc-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all text-xs md:text-sm font-mono font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <span className="text-zinc-500 hidden xs:inline font-sketch text-sm">SALA:</span>
          <span className="text-blue-700 tracking-wider font-black">{gameState.id}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600 shrink-0 stroke-[2.5]" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-900 shrink-0" />
          )}
        </button>

        {gameState.state !== 'LOBBY' && (
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-100 border-2 border-zinc-900 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-zinc-900 font-sketch shadow-[2px_2px_0px_#18181b]">
            <span>
              Rodada {gameState.currentRound || 1}
              {gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        <button
          onClick={onToggleSound}
          className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-zinc-100 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-zinc-800 min-w-[32px] sm:min-w-[36px] flex items-center justify-center"
          title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-green-700" /> : <VolumeX className="w-4 h-4 text-red-600" />}
        </button>

        <div
          className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]"
          title={playerName || myPlayer?.name}
        >
          <AvatarIcon avatar={myPlayer?.avatar || playerAvatar} className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs md:text-sm font-bold text-zinc-900 max-w-[70px] sm:max-w-[100px] truncate hidden xs:inline font-sketch">
            {playerName || myPlayer?.name}
          </span>
        </div>

        <button
          onClick={onLeaveRoom}
          title="Sair da sala"
          className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-red-50 hover:text-red-600 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-zinc-700 min-w-[32px] sm:min-w-[36px] flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
