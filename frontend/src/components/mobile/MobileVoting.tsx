import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Laugh, Sparkles, ZoomIn, X, Check, Download } from 'lucide-react';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';
import { downloadDrawing } from '../../utils/downloadDrawing';
import AvatarIcon from '../common/AvatarIcon';

interface MobileVotingProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  timer: number;
}

export default function MobileVoting({ socket, gameState, myPlayer, timer }: MobileVotingProps) {
  const [hasVotedSimilar, setHasVotedSimilar] = useState(false);
  const [hasVotedFunny, setHasVotedFunny] = useState(false);
  const [votedSimilarId, setVotedSimilarId] = useState<string | null>(null);
  const [votedFunnyId, setVotedFunnyId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ name: string; url: string } | null>(null);

  const drawings = Object.entries(gameState.drawings || {}).map(([playerId, dataUrl]) => {
    const player = gameState.players.find((p) => p.id === playerId);
    return { playerId, player, dataUrl };
  });

  const handleVote = (type: 'similar' | 'funny', playerId: string) => {
    if (type === 'similar' && hasVotedSimilar) return;
    if (type === 'funny' && hasVotedFunny) return;
    if (playerId === socket.id || (myPlayer?.id && playerId === myPlayer.id)) return;

    sounds.playPop();
    socket.emit('submit_vote', { roomId: gameState.id, type, votedPlayerId: playerId });

    if (type === 'similar') {
      setHasVotedSimilar(true);
      setVotedSimilarId(playerId);
    }
    if (type === 'funny') {
      setHasVotedFunny(true);
      setVotedFunnyId(playerId);
    }
  };

  const allVoted = hasVotedSimilar && hasVotedFunny;

  return (
    <div className="flex-1 flex flex-col p-3.5 sm:p-5 overflow-y-auto bg-[#f8f7f2] font-sketch pb-24">
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        {/* Top Header & Voting Status */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-4 sm:p-5 shadow-[4px_5px_0px_#18181b] text-center">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black uppercase text-zinc-800 flex items-center gap-1.5 tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500" /> Votação da Rodada
            </span>
            <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-zinc-900 px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-black">
              <Clock className="w-3.5 h-3.5" />
              <span>{timer > 0 ? `${timer}s` : '♾️'}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 mb-3">
            Vote no desenho <strong className="text-blue-700">Mais Parecido</strong> e no <strong className="text-amber-600">Mais Engraçado</strong>!
          </p>

          {/* Voting Checklist Badges */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className={`p-2.5 rounded-2xl border-2 border-zinc-900 flex items-center justify-between text-xs sm:text-sm font-black shadow-xs ${
              hasVotedSimilar ? 'bg-blue-100 text-blue-900' : 'bg-zinc-50 text-zinc-500'
            }`}>
              <span>⭐ Mais Parecido</span>
              {hasVotedSimilar ? <Check className="w-4 h-4 text-blue-700 stroke-[3]" /> : <span className="text-xs font-bold text-zinc-400">Pendente</span>}
            </div>

            <div className={`p-2.5 rounded-2xl border-2 border-zinc-900 flex items-center justify-between text-xs sm:text-sm font-black shadow-xs ${
              hasVotedFunny ? 'bg-amber-100 text-amber-900' : 'bg-zinc-50 text-zinc-500'
            }`}>
              <span>😂 Mais Engraçado</span>
              {hasVotedFunny ? <Check className="w-4 h-4 text-amber-700 stroke-[3]" /> : <span className="text-xs font-bold text-zinc-400">Pendente</span>}
            </div>
          </div>

          {allVoted && (
            <div className="mt-3 py-2 px-3 bg-green-100 border-2 border-zinc-900 rounded-xl text-xs sm:text-sm font-black text-green-900 flex items-center justify-center gap-2 shadow-xs animate-pulse">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Seus votos foram computados! Aguarde a contagem...</span>
            </div>
          )}
        </div>

        {/* Vertical Feed of Drawing Cards */}
        <div className="flex flex-col gap-4">
          {drawings.map(({ playerId, player, dataUrl }) => {
            const isMe = playerId === socket.id || (myPlayer?.id && playerId === myPlayer.id);
            const isVotedSimilar = votedSimilarId === playerId;
            const isVotedFunny = votedFunnyId === playerId;

            return (
              <div
                key={playerId}
                className="bg-white border-3 border-zinc-900 rounded-3xl overflow-hidden shadow-[5px_6px_0px_#18181b] flex flex-col"
              >
                {/* Card Header with Artist Info */}
                <div className="p-3 bg-amber-50/90 border-b-2 border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AvatarIcon avatar={player?.avatar} className="w-9 h-9 drop-shadow-sm" />
                    <span className="font-bold text-base sm:text-lg text-zinc-900 font-kalam">
                      {player?.name || 'Artista'} {isMe && <span className="text-blue-700 text-xs font-sketch font-black">(Você)</span>}
                    </span>
                  </div>

                  <button
                    onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                    type="button"
                    title="Ampliar desenho"
                    className="p-2 rounded-xl bg-white border-2 border-zinc-900 text-zinc-800 shadow-sm active:scale-95"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawing Image Box */}
                <div
                  onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                  className="w-full aspect-square bg-white flex items-center justify-center p-3 cursor-pointer relative"
                >
                  <img
                    src={dataUrl}
                    alt={player?.name || 'Desenho'}
                    className="w-full h-full object-contain rounded-2xl border-2 border-zinc-200"
                  />
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs pointer-events-none">
                    🔍 Toque para ampliar
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-zinc-50 border-t-2 border-zinc-900 flex items-center justify-between gap-2.5">
                  {isMe ? (
                    <div className="w-full py-2.5 text-center text-xs sm:text-sm font-bold text-zinc-500 italic">
                      Seu desenho (você não pode votar em si mesmo)
                    </div>
                  ) : (
                    <>
                      {/* Voto: Parecido */}
                      <button
                        onClick={() => handleVote('similar', playerId)}
                        disabled={hasVotedSimilar}
                        type="button"
                        className={`flex-1 h-13 py-2 px-3 rounded-2xl border-2 border-zinc-900 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[2px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] ${
                          isVotedSimilar
                            ? 'bg-blue-600 text-white shadow-none'
                            : hasVotedSimilar
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-300 shadow-none'
                            : 'bg-white hover:bg-blue-50 text-blue-900'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isVotedSimilar ? 'Votado! ⭐' : 'Parecido'}</span>
                      </button>

                      {/* Voto: Engraçado */}
                      <button
                        onClick={() => handleVote('funny', playerId)}
                        disabled={hasVotedFunny}
                        type="button"
                        className={`flex-1 h-13 py-2 px-3 rounded-2xl border-2 border-zinc-900 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[2px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] ${
                          isVotedFunny
                            ? 'bg-amber-400 text-zinc-950 shadow-none'
                            : hasVotedFunny
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-300 shadow-none'
                            : 'bg-white hover:bg-amber-50 text-amber-900'
                        }`}
                      >
                        <Laugh className="w-4 h-4" />
                        <span>{isVotedFunny ? 'Votado! 😂' : 'Engraçado'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-sm bg-white border-3 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-3.5 border-b-2 border-zinc-900 bg-amber-100">
                <span className="font-bold text-base text-zinc-900 font-kalam">Desenho de {zoomImage.name}</span>
                <button
                  onClick={() => setZoomImage(null)}
                  type="button"
                  className="p-1.5 rounded-xl bg-white border border-zinc-900 text-zinc-800 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-white flex items-center justify-center">
                <img
                  src={zoomImage.url}
                  alt={zoomImage.name}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-2xl border-2 border-zinc-300"
                />
              </div>

              <div className="p-3.5 border-t-2 border-zinc-900 bg-zinc-50 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadDrawing(zoomImage.url, zoomImage.name)}
                  className="flex-1 py-3 rounded-xl bg-amber-300 border-2 border-zinc-900 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Desenho</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomImage(null)}
                  className="px-5 py-3 rounded-xl bg-white border-2 border-zinc-900 text-xs sm:text-sm font-bold active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
