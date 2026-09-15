import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Check, Copy, Play } from 'lucide-react';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';
import PartyChat from '../common/PartyChat';
import InviteBar from '../common/InviteBar';
import HostSettings from '../common/HostSettings';
import PlayerList from '../common/PlayerList';

interface WebWaitingRoomProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  isHost: boolean;
  onStartGame: () => void;
  onUpdateSettings: (roundTime?: number, maxRounds?: number, voiceEnabled?: boolean, reactionsEnabled?: boolean) => void;
}

/** Sala de espera exclusiva desktop — usa InviteBar + HostSettings + PlayerList compartilhados. */
export default function WebWaitingRoom({
  socket,
  gameState,
  myPlayer,
  isHost,
  onStartGame,
  onUpdateSettings,
}: WebWaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(gameState.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 bg-white border-2 border-zinc-900 rounded-2xl p-5 sm:p-7 shadow-[4px_5px_0px_#18181b] relative overflow-hidden text-center sketch-tape">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">🎪</span>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 font-sketch">Sala de Espera</h2>
          </div>
          <p className="text-zinc-600 text-sm font-sketch">
            Jogue com <strong className="text-zinc-900">2 a 12+ amigos</strong>! Mínimo de 2 para começar.
          </p>

          <div className="inline-flex items-center gap-2.5 bg-amber-50 border-2 border-zinc-900 px-5 py-2 rounded-xl my-4 shadow-[2px_2px_0px_#18181b]">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-sketch">Código da Sala:</span>
            <span className="text-2xl font-mono font-black text-blue-700 tracking-widest">{gameState.id}</span>
            <button
              onClick={handleCopyCode}
              title="Copiar código da sala"
              className="p-1.5 rounded-lg bg-white hover:bg-amber-100 text-zinc-900 border border-zinc-900 transition-all ml-1"
            >
              {copied ? <Check className="w-4 h-4 text-green-700 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="mb-5 text-left">
            <InviteBar roomId={gameState.id} layout="row" />
          </div>

          <div className="mb-5">
            <HostSettings
              gameState={gameState}
              isHost={isHost}
              onUpdateSettings={onUpdateSettings}
            />
          </div>

          <div className="mb-6 text-left">
            <PlayerList gameState={gameState} socket={socket} />
          </div>

          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={gameState.players.length < 2}
              className="w-full btn-arcade-gold py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xl tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Play className="w-5 h-5 fill-current" />
              {gameState.players.length < 2
                ? 'Aguardando mais 1 jogador (Mín. 2)'
                : `Começar Partida! (${gameState.players.length} jogadores)`}
            </button>
          ) : (
            <div className="w-full bg-amber-50 border-2 border-zinc-900 p-4 rounded-xl flex items-center justify-center gap-2.5 text-center text-base font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b] font-sketch">
              <span className="text-xl animate-bounce">👑</span>
              <span>
                Aguardando o Host ({gameState.players.find((p) => p.isHost || p.id === gameState.hostId)?.name || 'Host'}) iniciar a partida...
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-[4px_5px_0px_#18181b] h-[360px] sm:h-[460px] lg:h-[600px] flex flex-col">
          <PartyChat
            socket={socket}
            roomId={gameState.id}
            messages={gameState.messages}
            myPlayer={myPlayer}
            isMaster={false}
            isHost={isHost}
            isChatMuted={Boolean(gameState.isChatMuted)}
          />
        </div>
      </div>
    </div>
  );
}
