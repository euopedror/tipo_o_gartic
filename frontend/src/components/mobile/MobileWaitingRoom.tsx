import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Copy, Check, Sliders, Play,
  MessageCircle, X
} from 'lucide-react';
import PartyChat from '../common/PartyChat';
import InviteBar from '../common/InviteBar';
import HostSettings from '../common/HostSettings';
import PlayerList from '../common/PlayerList';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';

interface MobileWaitingRoomProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  isHost: boolean;
  onStartGame: () => void;
  onUpdateSettings: (roundTime?: number, maxRounds?: number, voiceEnabled?: boolean, reactionsEnabled?: boolean) => void;
}

export default function MobileWaitingRoom({
  socket,
  gameState,
  myPlayer,
  isHost,
  onStartGame,
  onUpdateSettings,
}: MobileWaitingRoomProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showRulesSheet, setShowRulesSheet] = useState(false);

  const handleCopyCode = () => {
    sounds.playPop();
    navigator.clipboard.writeText(gameState.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-5 overflow-y-auto font-sketch relative pb-28">
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        {/* Waiting Card */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-5 shadow-[5px_6px_0px_#18181b] text-center relative sketch-tape">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="text-3xl sm:text-4xl animate-bounce">🎪</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 font-kalam">
              Sala de Espera
            </h2>
          </div>
          <p className="text-sm text-zinc-600 font-sketch">
            Jogue com <strong className="text-zinc-900">2 a 12+ amigos</strong>! Mínimo de 2 para começar.
          </p>

          {/* Big Room Code Banner */}
          <div className="flex items-center justify-between bg-amber-50 border-2 border-zinc-900 px-4 py-3 rounded-2xl my-3.5 shadow-[3px_3px_0px_#18181b]">
            <div className="text-left">
              <span className="text-xs uppercase font-black text-zinc-500 block tracking-wider">
                Código da Sala:
              </span>
              <span className="text-3xl font-mono font-black text-blue-700 tracking-widest leading-none">
                {gameState.id}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              type="button"
              className="bg-white hover:bg-amber-100 border-2 border-zinc-900 px-3 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {copiedCode ? <Check className="w-4 h-4 text-green-700 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* 1-Tap Mobile Invite Buttons — componente único */}
          <div className="mb-3.5">
            <InviteBar roomId={gameState.id} layout="grid" />
          </div>

          {/* Quick Rules Preview / Trigger */}
          <div className="flex items-center justify-between p-2.5 bg-amber-50/60 border-2 border-zinc-900 rounded-2xl text-xs sm:text-sm font-bold shadow-sm">
            <div className="flex items-center gap-2 text-zinc-800">
              <span>⏱️ {gameState.settings?.roundTime === 0 ? 'Tempo Livre' : `${gameState.settings?.roundTime}s`}</span>
              <span>•</span>
              <span>🏁 {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Fim'}</span>
              <span>•</span>
              <span className={gameState.settings?.voiceEnabled === true ? 'text-emerald-700 font-black' : 'text-red-600 font-black'}>
                {gameState.settings?.voiceEnabled === true ? '🎙️ Voz On' : '🎙️ Voz Off'}
              </span>
            </div>

            {isHost && (
              <button
                type="button"
                onClick={() => setShowRulesSheet(!showRulesSheet)}
                className="bg-amber-300 border border-zinc-900 px-2.5 py-1 rounded-xl text-zinc-900 font-black flex items-center gap-1 text-xs shadow-xs active:scale-95"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showRulesSheet ? 'Fechar' : 'Ajustar Regras'}</span>
              </button>
            )}
          </div>

          {/* Expandable Host Rules Sheet — usa HostSettings compartilhado */}
          <AnimatePresence>
            {showRulesSheet && isHost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-amber-100/90 rounded-2xl border-2 border-zinc-900 text-left overflow-hidden shadow-inner"
              >
                <HostSettings
                  gameState={gameState}
                  isHost={isHost}
                  onUpdateSettings={onUpdateSettings}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Friends in Room List — componente único */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-4 shadow-[4px_5px_0px_#18181b]">
          <PlayerList gameState={gameState} socket={socket} compact />
        </div>
      </div>

      {/* Chat flutuante — deslocado para não cobrir reactions (reactions só em votação) */}
      <div className="fixed bottom-24 right-3.5 z-30">
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="h-12 flex items-center gap-2 bg-amber-300 active:bg-amber-400 border-2 border-zinc-900 px-4 rounded-full text-zinc-900 text-xs sm:text-sm font-black shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <span>Chat ({gameState.messages?.length || 0})</span>
        </button>
      </div>

      {/* Sticky Bottom Action Bar com safe-area */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 pb-safe bg-white/98 backdrop-blur border-t-2 border-zinc-900 z-30 shadow-[0_-3px_10px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={gameState.players.length < 2}
              type="button"
              className="w-full h-14 sm:h-16 btn-arcade-gold rounded-2xl flex items-center justify-center gap-2.5 text-lg sm:text-xl font-black tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_4px_0px_#18181b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Play className="w-5 h-5 fill-current" />
              {gameState.players.length < 2
                ? 'Aguardando amigos (Mín. 2)'
                : `Começar Partida! (${gameState.players.length})`}
            </button>
          ) : (
            <div className="w-full h-14 bg-amber-100 border-2 border-zinc-900 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b]">
              <span className="text-lg animate-bounce">👑</span>
              <span>Aguardando o Host iniciar a partida...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet Drawer for Chat */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border-t-3 border-zinc-900 rounded-t-3xl h-[82vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-3.5 border-b-2 border-zinc-900 bg-amber-100">
                <div className="flex items-center gap-2 font-sketch font-black text-base text-zinc-900">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat da Turma</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  type="button"
                  className="p-1.5 rounded-xl bg-white border border-zinc-900 text-zinc-800 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
