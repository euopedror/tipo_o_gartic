import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, Share2, Link2, Crown, Sliders, Play, 
  MessageCircle, X 
} from 'lucide-react';
import AvatarIcon from '../common/AvatarIcon';
import PartyChat from '../common/PartyChat';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';

interface MobileWaitingRoomProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  isHost: boolean;
  onStartGame: () => void;
  onUpdateSettings: (roundTime?: number, maxRounds?: number) => void;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showRulesSheet, setShowRulesSheet] = useState(false);

  const handleCopyCode = () => {
    sounds.playPop();
    navigator.clipboard.writeText(gameState.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    sounds.playPop();
    const link = `${window.location.origin}${window.location.pathname}?room=${gameState.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    sounds.playPop();
    const link = `${window.location.origin}${window.location.pathname}?room=${gameState.id}`;
    const text = encodeURIComponent(`✏️ Vem jogar Desenho Cego comigo!\nCódigo da sala: ${gameState.id}\nEntra aí: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-3 overflow-y-auto font-sketch relative pb-20">
      <div className="w-full max-w-md mx-auto flex flex-col gap-3">
        {/* Waiting Card */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-4 shadow-[4px_4px_0px_#18181b] text-center relative sketch-tape">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-2xl">🎪</span>
            <h2 className="text-xl font-black text-zinc-900">Sala de Espera</h2>
          </div>
          <p className="text-xs text-zinc-600">Mínimo de 2 amigos para iniciar a diversão!</p>

          {/* Big Room Code Banner */}
          <div className="flex items-center justify-between bg-amber-50 border-2 border-zinc-900 px-3.5 py-2 rounded-xl my-3 shadow-[2px_2px_0px_#18181b]">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Código da Sala:</span>
              <span className="text-2xl font-mono font-black text-blue-700 tracking-widest leading-none">
                {gameState.id}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              type="button"
              className="bg-white hover:bg-amber-100 border border-zinc-900 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* 1-Tap Mobile Invite Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handleShareWhatsApp}
              type="button"
              className="flex items-center justify-center gap-1.5 bg-[#25D366] active:bg-[#20bd5a] text-zinc-950 font-black text-xs py-2.5 px-3 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              type="button"
              className="flex items-center justify-center gap-1.5 bg-white active:bg-zinc-100 text-zinc-900 font-bold text-xs py-2.5 px-3 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Link2 className="w-3.5 h-3.5 text-blue-600" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          {/* Quick Rules Preview / Trigger */}
          <div className="flex items-center justify-between p-2 bg-zinc-50 border-2 border-zinc-900 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-zinc-700">
              <span>⏱️ {gameState.settings?.roundTime === 0 ? 'Tempo Livre' : `${gameState.settings?.roundTime}s`}</span>
              <span>•</span>
              <span>🏁 {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Fim'}</span>
            </div>

            {isHost && (
              <button
                type="button"
                onClick={() => setShowRulesSheet(!showRulesSheet)}
                className="text-blue-700 font-bold flex items-center gap-1 text-[11px] underline"
              >
                <Sliders className="w-3 h-3" />
                <span>{showRulesSheet ? 'Fechar' : 'Ajustar'}</span>
              </button>
            )}
          </div>

          {/* Expandable Host Rules Sheet */}
          <AnimatePresence>
            {showRulesSheet && isHost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border-2 border-zinc-900 text-left overflow-hidden"
              >
                <span className="text-[11px] font-black uppercase text-zinc-800 block mb-1">⏱️ Tempo por Rodada:</span>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[
                    { label: 'Livre', val: 0 },
                    { label: '60s', val: 60 },
                    { label: '90s', val: 90 },
                    { label: '120s', val: 120 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onUpdateSettings(opt.val, undefined)}
                      className={`py-1 text-xs rounded-lg font-bold border ${
                        (gameState.settings?.roundTime ?? 0) === opt.val
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-black uppercase text-zinc-800 block mb-1">🏁 Duração do Torneio:</span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '3 Rodadas', val: 3 },
                    { label: '5 Rodadas', val: 5 },
                    { label: 'Sem Fim', val: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onUpdateSettings(undefined, opt.val)}
                      className={`py-1 text-xs rounded-lg font-bold border ${
                        (gameState.settings?.maxRounds ?? 3) === opt.val
                          ? 'bg-amber-300 text-zinc-900 border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Friends in Room List */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b]">
          <div className="flex items-center justify-between text-xs font-black uppercase text-zinc-700 mb-2 px-1">
            <span>Amigos na Sala:</span>
            <span className="bg-amber-200 border border-zinc-900 text-zinc-900 px-2 py-0.5 rounded-full">
              {gameState.players.length} online
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
            {gameState.players.map((p) => {
              const isMe = p.id === socket.id;
              const isPlayerHost = Boolean(p.isHost || (gameState.hostId ? p.id === gameState.hostId : false));
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-xl border-2 border-zinc-900 shadow-[1.5px_1.5px_0px_#18181b] ${
                    isMe ? 'bg-amber-100' : 'bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarIcon avatar={p.avatar} className="w-8 h-8 shrink-0" />
                    <span className="font-bold text-sm text-zinc-900 truncate font-kalam">
                      {p.name} {isMe && <span className="text-blue-700 text-xs font-sketch">(Você)</span>}
                    </span>
                  </div>

                  {isPlayerHost && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-900 bg-amber-300 px-1.5 py-0.5 rounded-md border border-zinc-900 shrink-0">
                      <Crown className="w-3 h-3" /> Host
                    </span>
                  )}
                </div>
              );
            })}

            {gameState.players.length < 2 && (
              <div className="p-2.5 rounded-xl border-2 border-dashed border-zinc-400 text-zinc-500 text-xs text-center flex items-center justify-center gap-1.5">
                <span className="animate-pulse">⏳</span>
                <span>Esperando mais 1 amigo entrar...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Trigger Button (Pill on Bottom Right) */}
      <div className="fixed bottom-20 right-3 z-30">
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="relative flex items-center gap-1.5 bg-amber-300 active:bg-amber-400 border-2 border-zinc-900 px-3.5 py-2 rounded-full text-zinc-900 text-xs font-black shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat ({gameState.messages?.length || 0})</span>
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t-2 border-zinc-900 z-20">
        <div className="max-w-md mx-auto">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={gameState.players.length < 2}
              type="button"
              className="w-full btn-arcade-gold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-black tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_#18181b]"
            >
              <Play className="w-5 h-5 fill-current" />
              {gameState.players.length < 2
                ? 'Aguardando amigos (Mín. 2)'
                : `Começar Partida! (${gameState.players.length})`}
            </button>
          ) : (
            <div className="w-full bg-amber-50 border-2 border-zinc-900 p-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b]">
              <span className="text-base animate-bounce">👑</span>
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
            className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border-t-2 border-zinc-900 rounded-t-3xl h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-3 border-b-2 border-zinc-900 bg-amber-100">
                <div className="flex items-center gap-1.5 font-sketch font-bold text-zinc-900">
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat da Turma</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  type="button"
                  className="p-1 rounded-lg bg-white border border-zinc-900 text-zinc-800"
                >
                  <X className="w-4 h-4" />
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
