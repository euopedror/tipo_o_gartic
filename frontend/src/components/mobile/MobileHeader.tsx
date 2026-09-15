import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Copy, Check, Volume2, VolumeX, LogOut } from 'lucide-react';
import AvatarIcon from '../common/AvatarIcon';
import VoiceChat from '../common/VoiceChat';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';

interface MobileHeaderProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  playerName: string;
  playerAvatar: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLeaveRoom: () => void;
}

export default function MobileHeader({
  socket,
  gameState,
  myPlayer,
  playerName,
  playerAvatar,
  soundEnabled,
  onToggleSound,
  onLeaveRoom,
}: MobileHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    sounds.playPop();
    navigator.clipboard.writeText(gameState.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 sm:h-16 bg-white/95 border-b-2 border-zinc-900 px-3 sm:px-4 flex items-center justify-between shadow-[0_2px_6px_rgba(0,0,0,0.06)] shrink-0 z-30 font-sketch">
      {/* Left: Room code & round indicator */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyCode}
          type="button"
          title="Toque para copiar o código da sala"
          className="flex items-center gap-1.5 bg-amber-50 active:bg-amber-100 border-2 border-zinc-900 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <span className="text-zinc-500 text-xs font-sketch">SALA:</span>
          <span className="text-blue-700 font-black tracking-wider">{gameState.id}</span>
          {copied ? (
            <Check className="w-4 h-4 text-green-600 stroke-[2.5]" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {gameState.state !== 'LOBBY' && (
          <span className="bg-amber-200 border-2 border-zinc-900 px-2.5 py-1 rounded-xl text-xs font-black text-zinc-900 shadow-xs">
            R{gameState.currentRound || 1}{gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''}
          </span>
        )}
      </div>

      {/* Right: Voice Chat, Sound, Avatar, Leave */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <VoiceChat
          socket={socket}
          roomId={gameState.id}
          players={gameState.players}
          myPlayer={myPlayer}
          voiceUserIds={gameState.voiceUserIds}
        />

        <button
          onClick={onToggleSound}
          type="button"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white active:bg-zinc-100 border-2 border-zinc-900 shadow-[1.5px_1.5px_0px_#18181b] text-zinc-800 flex items-center justify-center"
          title={soundEnabled ? 'Silenciar' : 'Ativar som'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4.5 h-4.5 text-green-700" />
          ) : (
            <VolumeX className="w-4.5 h-4.5 text-red-600" />
          )}
        </button>

        <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-zinc-900 px-2 py-1 rounded-xl shadow-[1.5px_1.5px_0px_#18181b] max-w-[105px] truncate">
          <AvatarIcon avatar={myPlayer?.avatar || playerAvatar} className="w-6 h-6 shrink-0" />
          <span className="text-xs sm:text-sm font-black text-zinc-900 truncate font-kalam">
            {playerName || myPlayer?.name}
          </span>
        </div>

        <button
          onClick={onLeaveRoom}
          type="button"
          title="Sair"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white active:bg-red-50 text-zinc-700 active:text-red-600 border-2 border-zinc-900 shadow-[1.5px_1.5px_0px_#18181b] flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
