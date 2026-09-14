import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Laugh, Sparkles, ZoomIn, X, Check, Download } from 'lucide-react';
import type { GameState, Player } from '../types';
import { sounds } from '../utils/audioFx';
import { downloadDrawing } from '../utils/downloadDrawing';
import AvatarIcon from './common/AvatarIcon';

interface VotingProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  timer: number;
}

export default function Voting({ socket, gameState, myPlayer: _myPlayer, timer }: VotingProps) {
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
    if (playerId === socket.id || (_myPlayer?.id && playerId === _myPlayer.id)) return; // Cannot vote for oneself

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

  const hasVotedAll = hasVotedSimilar && hasVotedFunny;

  return (
    <div className="flex-1 flex flex-col p-2.5 sm:p-4 md:p-8 overflow-y-auto bg-transparent">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto mb-4 sm:mb-6"
      >
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 rounded-full bg-yellow-200 border-2 border-zinc-900 text-zinc-900 font-bold text-xs uppercase tracking-wider mb-2 font-sketch shadow-[2px_2px_0px_#18181b]">
          <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          Galeria da Rodada
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold text-zinc-900 font-kalam tracking-tight">
          Hora de Votar! 🗳️
        </h2>
        <p className="text-zinc-600 font-sketch text-base sm:text-lg mt-1">
          Vote em quem desenhou <strong className="text-blue-700 underline decoration-wavy decoration-blue-400">mais parecido</strong> e em quem fez a <strong className="text-rose-700 underline decoration-wavy decoration-rose-400">maior atrocidade</strong>!
        </p>

        {/* Timer Bar */}
        <div className="mt-3 inline-flex items-center gap-2.5 bg-white border-2 border-zinc-900 px-4 sm:px-5 py-1.5 rounded-xl shadow-[3px_3px_0px_#18181b]">
          <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${timer <= 10 ? 'text-red-600 animate-spin' : 'text-zinc-900'}`} />
          <span className="text-zinc-700 text-xs sm:text-sm font-bold font-sketch uppercase tracking-wider">Tempo:</span>
          <span className={`text-xl sm:text-2xl font-kalam font-bold ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>
            {timer}s
          </span>
        </div>
      </motion.div>

      {/* Voting Status feedback */}
      <div className="max-w-md mx-auto w-full mb-4 sm:mb-6 text-center font-sketch">
        {hasVotedAll ? (
          <div className="bg-emerald-100 border-2 border-zinc-900 text-emerald-950 font-bold py-2.5 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-[2px_2px_0px_#18181b]">
            <Check className="w-5 h-5 text-emerald-800 shrink-0 stroke-[3]" />
            <span>Todos os seus votos foram registrados! Aguardando o tempo...</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className={`px-3 py-1 rounded-xl border-2 border-zinc-900 font-bold shadow-[2px_2px_0px_#18181b] transition-all ${
              hasVotedSimilar ? 'bg-blue-200 text-blue-950' : 'bg-white text-zinc-600'
            }`}>
              {hasVotedSimilar ? '✓ Mais Parecido' : '✏️ Falta: Mais Parecido'}
            </span>
            <span className={`px-3 py-1 rounded-xl border-2 border-zinc-900 font-bold shadow-[2px_2px_0px_#18181b] transition-all ${
              hasVotedFunny ? 'bg-rose-200 text-rose-950' : 'bg-white text-zinc-600'
            }`}>
              {hasVotedFunny ? '✓ Atrocidade' : '😂 Falta: Atrocidade'}
            </span>
          </div>
        )}
      </div>

      {/* Empty state if no drawings were submitted */}
      {drawings.length === 0 && (
        <div className="max-w-md mx-auto w-full p-6 bg-white border-2 border-zinc-900 rounded-2xl text-center shadow-[4px_4px_0px_#18181b] mb-8 font-sketch">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
          <h3 className="text-xl font-bold font-kalam text-zinc-900 mb-1">Nenhum desenho nesta rodada</h3>
          <p className="text-sm text-zinc-600">
            Nenhum desenho foi entregue a tempo. Aguardando o fim da rodada!
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto w-full pb-10">
        {drawings.map(({ playerId, player, dataUrl }) => {
          const isMe = playerId === socket.id;
          const isSimilarVoted = votedSimilarId === playerId;
          const isFunnyVoted = votedFunnyId === playerId;

          return (
            <motion.div
              key={playerId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -3 }}
              className={`bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181b] flex flex-col transition-all relative ${
                isSimilarVoted
                  ? 'ring-4 ring-blue-400'
                  : isFunnyVoted
                  ? 'ring-4 ring-rose-400'
                  : ''
              }`}
            >
              {/* Card Header */}
              <div className="p-3 px-4 bg-zinc-100 border-b-2 border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 font-kalam">
                  <AvatarIcon avatar={player?.avatar} className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="font-bold text-base text-zinc-900 truncate">
                    {player?.name || 'Artista'} {isMe && <span className="text-blue-700 text-xs font-sketch">(Seu)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => downloadDrawing(dataUrl, player?.name, gameState.character)}
                    title="Baixar desenho PNG"
                    className="p-1.5 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 shadow-[1px_1px_0px_#18181b] transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                    title="Expandir desenho"
                    className="p-1.5 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 shadow-[1px_1px_0px_#18181b] transition-transform active:scale-95"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawing Canvas Image */}
              <div 
                onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                className="aspect-[4/3] w-full bg-white relative cursor-pointer group flex items-center justify-center p-2.5 border-b-2 border-zinc-900"
              >
                <img
                  src={dataUrl}
                  alt={`Desenho de ${player?.name}`}
                  className="w-full h-full object-contain border border-dashed border-zinc-300 rounded-lg bg-white"
                />
                <div className="absolute inset-0 bg-zinc-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-white border-2 border-zinc-900 text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-[2px_2px_0px_#18181b] font-sketch">
                    <ZoomIn className="w-3.5 h-3.5" /> Ampliar
                  </span>
                </div>
              </div>

              {/* Voting Actions */}
              <div className="p-2.5 sm:p-3 bg-zinc-50 flex gap-2 font-kalam">
                {isMe ? (
                  <div className="w-full text-center py-2 text-sm font-bold text-zinc-500 bg-zinc-100 rounded-xl border border-dashed border-zinc-300 font-sketch">
                    Seu próprio desenho 😉
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleVote('similar', playerId)}
                      disabled={hasVotedSimilar}
                      className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-zinc-900 transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                        isSimilarVoted
                          ? 'bg-blue-300 text-blue-950 shadow-[2px_2px_0px_#18181b]'
                          : hasVotedSimilar
                          ? 'opacity-30 cursor-not-allowed bg-zinc-200 text-zinc-500 border-zinc-400'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-900 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{isSimilarVoted ? 'Parecido ✓' : 'Mais Parecido'}</span>
                    </button>

                    <button
                      onClick={() => handleVote('funny', playerId)}
                      disabled={hasVotedFunny}
                      className={`flex-1 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-zinc-900 transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                        isFunnyVoted
                          ? 'bg-rose-300 text-rose-950 shadow-[2px_2px_0px_#18181b]'
                          : hasVotedFunny
                          ? 'opacity-30 cursor-not-allowed bg-zinc-200 text-zinc-500 border-zinc-400'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-900 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                      }`}
                    >
                      <Laugh className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{isFunnyVoted ? 'Atrocidade 😂' : 'Atrocidade'}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {drawings.length === 0 && (
          <div className="col-span-full text-center text-zinc-600 py-12 bg-white rounded-2xl border-2 border-dashed border-zinc-400 font-sketch">
            <span className="text-3xl mb-2 block">😢</span>
            <h3 className="text-xl font-bold font-kalam text-zinc-900 mb-1">Nenhum desenho enviado a tempo!</h3>
            <p className="text-sm">A rodada vai avançar automaticamente.</p>
          </div>
        )}
      </div>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-3 sm:p-4 cursor-zoom-out"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-white border-2 border-zinc-900 rounded-2xl shadow-[6px_6px_0px_#18181b] overflow-hidden p-3 sm:p-4 cursor-default font-sketch"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-900 mb-3">
                <h3 className="text-base sm:text-xl font-bold font-kalam text-zinc-900 truncate max-w-[200px] sm:max-w-none">
                  Desenho de {zoomImage.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadDrawing(zoomImage.url, zoomImage.name, gameState.character)}
                    className="flex items-center gap-1.5 bg-yellow-300 hover:bg-yellow-400 border-2 border-zinc-900 text-zinc-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#18181b] transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Baixar PNG</span>
                  </button>
                  <button
                    onClick={() => setZoomImage(null)}
                    className="p-1.5 rounded-xl border-2 border-zinc-900 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-[1px_1px_0px_#18181b]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-white border-2 border-dashed border-zinc-300 rounded-xl overflow-hidden flex items-center justify-center p-2 max-h-[65vh] sm:max-h-[70vh]">
                <img
                  src={zoomImage.url}
                  alt="Zoom"
                  className="w-full h-full object-contain max-h-[60vh] sm:max-h-[65vh]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
