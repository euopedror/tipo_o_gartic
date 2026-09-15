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
  onUpdateSettings: (roundTime?: number, maxRounds?: number, voiceEnabled?: boolean) => void;
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
    const text = encodeURIComponent(`✏️ Vem jogar Desenho Cego comigo!\nCódigo da sala: ${gameState.id}\nEntra aí direto pelo link: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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

          {/* 1-Tap Mobile Invite Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <button
              onClick={handleShareWhatsApp}
              type="button"
              className="h-13 flex items-center justify-center gap-2 bg-[#25D366] active:bg-[#20bd5a] text-zinc-950 font-black text-sm px-3 rounded-2xl border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Share2 className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              type="button"
              className="h-13 flex items-center justify-center gap-2 bg-white active:bg-zinc-100 text-zinc-900 font-black text-sm px-3 rounded-2xl border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            >
              {copiedLink ? <Check className="w-4.5 h-4.5 text-green-700 stroke-[2.5]" /> : <Link2 className="w-4.5 h-4.5 text-blue-600" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          {/* Quick Rules Preview / Trigger */}
          <div className="flex items-center justify-between p-2.5 bg-amber-50/60 border-2 border-zinc-900 rounded-2xl text-xs sm:text-sm font-bold shadow-sm">
            <div className="flex items-center gap-2 text-zinc-800">
              <span>⏱️ {gameState.settings?.roundTime === 0 ? 'Tempo Livre' : `${gameState.settings?.roundTime}s`}</span>
              <span>•</span>
              <span>🏁 {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Fim'}</span>
              <span>•</span>
              <span className={gameState.settings?.voiceEnabled === false ? 'text-red-600 font-black' : 'text-emerald-700 font-black'}>
                {gameState.settings?.voiceEnabled === false ? '🎙️ Voz Off' : '🎙️ Voz On'}
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

          {/* Expandable Host Rules Sheet */}
          <AnimatePresence>
            {showRulesSheet && isHost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-amber-100/90 rounded-2xl border-2 border-zinc-900 text-left overflow-hidden shadow-inner"
              >
                <span className="text-xs font-black uppercase text-zinc-800 block mb-1.5">⏱️ Tempo por Rodada:</span>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
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
                      className={`py-2 text-xs sm:text-sm rounded-xl font-black border-2 transition-all ${
                        (gameState.settings?.roundTime ?? 0) === opt.val
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-black uppercase text-zinc-800 block mb-1.5">🏁 Duração do Torneio:</span>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    { label: '3 Rodadas', val: 3 },
                    { label: '5 Rodadas', val: 5 },
                    { label: 'Sem Fim', val: 0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onUpdateSettings(undefined, opt.val)}
                      className={`py-2 text-xs sm:text-sm rounded-xl font-black border-2 transition-all ${
                        (gameState.settings?.maxRounds ?? 3) === opt.val
                          ? 'bg-amber-300 text-zinc-900 border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-black uppercase text-zinc-800 block mb-1.5">🎙️ Chat de Voz na Sala:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(undefined, undefined, true)}
                    className={`py-2 text-xs sm:text-sm rounded-xl font-black border-2 transition-all flex items-center justify-center gap-1.5 ${
                      gameState.settings?.voiceEnabled !== false
                        ? 'bg-emerald-300 text-zinc-900 border-zinc-900 shadow-sm'
                        : 'bg-white text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <span>🟢 Permitido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(undefined, undefined, false)}
                    className={`py-2 text-xs sm:text-sm rounded-xl font-black border-2 transition-all flex items-center justify-center gap-1.5 ${
                      gameState.settings?.voiceEnabled === false
                        ? 'bg-red-300 text-zinc-900 border-zinc-900 shadow-sm'
                        : 'bg-white text-zinc-800 border-zinc-300'
                    }`}
                  >
                    <span>🔴 Desativado</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Friends in Room List */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-4 shadow-[4px_5px_0px_#18181b]">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black uppercase text-zinc-800 mb-2.5 px-1">
            <span>Amigos na Sala:</span>
            <span className="bg-amber-200 border-2 border-zinc-900 text-zinc-900 px-3 py-0.5 rounded-full font-black">
              {gameState.players.length} {gameState.players.length === 1 ? 'amigo' : 'amigos'}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5">
            {gameState.players.map((p) => {
              const isMe = p.id === socket.id;
              const isPlayerHost = Boolean(p.isHost || (gameState.hostId ? p.id === gameState.hostId : false));
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ${
                    isMe ? 'bg-amber-100/90' : 'bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarIcon avatar={p.avatar} className="w-10 h-10 shrink-0 drop-shadow-sm" />
                    <span className="font-bold text-base text-zinc-900 truncate font-kalam">
                      {p.name} {isMe && <span className="text-blue-700 text-xs font-sketch">(Você)</span>}
                    </span>
                  </div>

                  {isPlayerHost && (
                    <span className="flex items-center gap-1 text-xs font-black text-zinc-900 bg-amber-300 px-2 py-1 rounded-xl border border-zinc-900 shrink-0 shadow-xs">
                      <Crown className="w-3.5 h-3.5" /> Host
                    </span>
                  )}
                </div>
              );
            })}

            {gameState.players.length < 2 && (
              <div className="p-3.5 rounded-2xl border-2 border-dashed border-zinc-400 text-zinc-600 text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2">
                <span className="animate-pulse text-lg">⏳</span>
                <span>Esperando mais 1 amigo entrar...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Trigger Button (Bottom Right) */}
      <div className="fixed bottom-22 right-3.5 z-30">
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="h-12 flex items-center gap-2 bg-amber-300 active:bg-amber-400 border-2 border-zinc-900 px-4 rounded-full text-zinc-900 text-xs sm:text-sm font-black shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <span>Chat ({gameState.messages?.length || 0})</span>
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/98 backdrop-blur border-t-2 border-zinc-900 z-30 shadow-[0_-3px_10px_rgba(0,0,0,0.08)]">
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
