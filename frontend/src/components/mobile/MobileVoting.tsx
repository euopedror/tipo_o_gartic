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
    <div className="flex-1 flex flex-col p-3 overflow-y-auto bg-[#f8f7f2] font-sketch pb-16">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
        {/* Top Header & Voting Status */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b] text-center">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black uppercase text-zinc-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Votação da Rodada
            </span>
            <div className="flex items-center gap-1 bg-amber-100 border border-zinc-900 px-2 py-0.5 rounded-lg text-xs font-mono font-bold">
              <Clock className="w-3 h-3" />
              <span>{timer > 0 ? `${timer}s` : '♾️'}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-600 mb-2">
            Vote no desenho <strong className="text-blue-700">Mais Parecido</strong> e no <strong className="text-amber-600">Mais Engraçado</strong>!
          </p>

          {/* Voting checklist badges */}
          <div className="grid grid-cols-2 gap-1.5 text-left">
            <div className={`p-1.5 rounded-xl border-2 border-zinc-900 flex items-center justify-between text-xs font-bold ${
              hasVotedSimilar ? 'bg-blue-100 text-blue-900' : 'bg-zinc-50 text-zinc-500'
            }`}>
              <span>⭐ Parecido</span>
              {hasVotedSimilar ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <span className="text-[10px]">Pendente</span>}
            </div>

            <div className={`p-1.5 rounded-xl border-2 border-zinc-900 flex items-center justify-between text-xs font-bold ${
              hasVotedFunny ? 'bg-amber-100 text-amber-900' : 'bg-zinc-50 text-zinc-500'
            }`}>
              <span>😂 Engraçado</span>
              {hasVotedFunny ? <Check className="w-3.5 h-3.5 text-amber-700" /> : <span className="text-[10px]">Pendente</span>}
            </div>
          </div>

          {allVoted && (
            <div className="mt-2 py-1 px-2 bg-green-100 border border-zinc-900 rounded-lg text-xs font-bold text-green-800 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Votos computados com sucesso!</span>
            </div>
          )}
        </div>

        {/* Vertical Feed of Drawing Cards */}
        <div className="flex flex-col gap-3">
          {drawings.map(({ playerId, player, dataUrl }) => {
            const isMe = playerId === socket.id || (myPlayer?.id && playerId === myPlayer.id);
            const isVotedSimilar = votedSimilarId === playerId;
            const isVotedFunny = votedFunnyId === playerId;

            return (
              <div
                key={playerId}
                className="bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181b] flex flex-col"
              >
                {/* Card Header with Artist Info */}
                <div className="p-2.5 bg-amber-50/80 border-b-2 border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarIcon avatar={player?.avatar} className="w-7 h-7" />
                    <span className="font-bold text-sm text-zinc-900 font-kalam">
                      {player?.name || 'Artista Anônimo'} {isMe && <span className="text-blue-700 text-xs font-sketch">(Você)</span>}
                    </span>
                  </div>

                  <button
                    onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                    type="button"
                    title="Ampliar"
                    className="p-1.5 rounded-lg bg-white border border-zinc-900 text-zinc-700 shadow-sm active:scale-95"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Drawing Image */}
                <div
                  onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                  className="w-full aspect-square bg-white flex items-center justify-center p-2 cursor-pointer relative"
                >
                  <img
                    src={dataUrl}
                    alt={player?.name || 'Desenho'}
                    className="w-full h-full object-contain rounded-xl border border-zinc-200"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
                    🔍 Toque para ampliar
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-2 bg-zinc-50 border-t-2 border-zinc-900 flex items-center justify-between gap-2">
                  {isMe ? (
                    <div className="w-full py-2 text-center text-xs font-bold text-zinc-500 italic">
                      Seu desenho (não pode votar em si mesmo)
                    </div>
                  ) : (
                    <>
                      {/* Voto: Parecido */}
                      <button
                        onClick={() => handleVote('similar', playerId)}
                        disabled={hasVotedSimilar}
                        type="button"
                        className={`flex-1 py-2 px-2.5 rounded-xl border-2 border-zinc-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] ${
                          isVotedSimilar
                            ? 'bg-blue-600 text-white'
                            : hasVotedSimilar
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-300 shadow-none'
                            : 'bg-white hover:bg-blue-50 text-blue-800'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isVotedSimilar ? 'Votado! ⭐' : 'Parecido'}</span>
                      </button>

                      {/* Voto: Engraçado */}
                      <button
                        onClick={() => handleVote('funny', playerId)}
                        disabled={hasVotedFunny}
                        type="button"
                        className={`flex-1 py-2 px-2.5 rounded-xl border-2 border-zinc-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] ${
                          isVotedFunny
                            ? 'bg-amber-500 text-zinc-950'
                            : hasVotedFunny
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-300 shadow-none'
                            : 'bg-white hover:bg-amber-50 text-amber-800'
                        }`}
                      >
                        <Laugh className="w-3.5 h-3.5" />
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
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-3"
          >
            <div className="w-full max-w-sm bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-3 border-b-2 border-zinc-900 bg-amber-100">
                <span className="font-bold text-sm text-zinc-900">Desenho de {zoomImage.name}</span>
                <button
                  onClick={() => setZoomImage(null)}
                  type="button"
                  className="p-1 rounded-lg bg-white border border-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white flex items-center justify-center">
                <img
                  src={zoomImage.url}
                  alt={zoomImage.name}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-xl border border-zinc-300"
                />
              </div>

              <div className="p-3 border-t-2 border-zinc-900 bg-zinc-50 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadDrawing(zoomImage.url, zoomImage.name)}
                  className="flex-1 py-2 rounded-xl bg-amber-300 border-2 border-zinc-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#18181b]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Desenho</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomImage(null)}
                  className="px-4 py-2 rounded-xl bg-white border-2 border-zinc-900 text-xs font-bold"
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
