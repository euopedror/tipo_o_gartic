import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { GameState } from '../../types';
import AvatarIcon from './AvatarIcon';

interface PlayerListProps {
  gameState: GameState;
  socket: Socket;
  compact?: boolean;
}

/** Lista única de jogadores — usada na espera web e mobile. */
export default function PlayerList({ gameState, socket, compact }: PlayerListProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 px-1 font-sketch">
        <span>{compact ? 'Amigos na Sala:' : 'Amigos Conectados'}</span>
        <span className="bg-amber-100 border border-zinc-900 text-zinc-900 px-2.5 py-0.5 rounded-full font-bold">
          {gameState.players.length} {gameState.players.length === 1 ? 'amigo' : 'amigos'}
        </span>
      </div>

      <div className={`grid gap-2 overflow-y-auto pr-0.5 ${compact ? 'grid-cols-1 max-h-56' : 'grid-cols-1 sm:grid-cols-2 max-h-48'}`}>
        {gameState.players.map((p) => {
          const isMe = p.id === socket.id;
          const isPlayerHost = Boolean(p.isHost || (gameState.hostId ? p.id === gameState.hostId : false));
          const isDown = p.connected === false;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 font-sketch shadow-[2px_2px_0px_#18181b] ${
                isMe ? 'bg-amber-100' : 'bg-white'
              } ${isDown ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AvatarIcon avatar={p.avatar} className="w-8 h-8 sm:w-9 sm:h-9" />
                <span className="font-bold text-base text-zinc-900 truncate font-kalam">
                  {p.name} {isMe && <span className="text-blue-700 text-xs font-sketch">(Você)</span>}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isDown && (
                  <span title="Fechou sem sair — volta em até 25s ou sai da lista" className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-400">
                    🔌 caiu
                  </span>
                )}
                {isPlayerHost && (
                  <span title="Criador da sala" className="flex items-center gap-1 text-xs font-bold text-zinc-900 bg-amber-300 px-2 py-0.5 rounded-lg border border-zinc-900">
                    <Crown className="w-3 h-3" /> Host
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {gameState.players.length < 2 && (
          <div className="flex items-center justify-center p-3 rounded-xl border-2 border-dashed border-zinc-400 text-zinc-500 text-xs font-semibold gap-2 font-sketch">
            <span className="animate-pulse">⏳</span>
            <span>Esperando mais 1 amigo entrar...</span>
          </div>
        )}
      </div>
    </div>
  );
}
