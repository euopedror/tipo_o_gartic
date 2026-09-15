import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Sparkles, Laugh, Download, X } from 'lucide-react';
import type { GameState } from '../../types';
import { sounds } from '../../utils/audioFx';
import { downloadDrawing } from '../../utils/downloadDrawing';
import AvatarIcon from '../common/AvatarIcon';

interface MobileResultsProps {
  socket: Socket;
  gameState: GameState;
  isHost: boolean;
}

export default function MobileResults({ socket, gameState, isHost }: MobileResultsProps) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const master = gameState.players.find((p) => p.id === gameState.masterId);
  const [zoomImage, setZoomImage] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    sounds.playFanfare();

    // Trigger mobile-optimized confetti burst
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 50,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 50,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const handleNextRound = () => {
    sounds.playPop();
    socket.emit('next_round', { roomId: gameState.id });
  };

  // Compute special awards
  let mostSimilarId = '';
  let maxSimilarVotes = 0;
  let mostFunnyId = '';
  let maxFunnyVotes = 0;

  if (gameState.votes) {
    Object.entries(gameState.votes).forEach(([pId, v]) => {
      if (v.similar > maxSimilarVotes) {
        maxSimilarVotes = v.similar;
        mostSimilarId = pId;
      }
      if (v.funny > maxFunnyVotes) {
        maxFunnyVotes = v.funny;
        mostFunnyId = pId;
      }
    });
  }

  const mostSimilarPlayer = gameState.players.find((p) => p.id === mostSimilarId);
  const mostFunnyPlayer = gameState.players.find((p) => p.id === mostFunnyId);
  const drawingsList = Object.entries(gameState.drawings || {});

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto bg-[#f8f7f2] font-sketch pb-28">
      <div className="w-full max-w-md mx-auto flex flex-col gap-3.5">
        {/* Celebration Title Card */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-5 shadow-[4px_5px_0px_#18181b] text-center relative sketch-tape">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Trophy className="w-8 h-8 text-yellow-500 fill-amber-300 stroke-[2.5] animate-bounce" />
            <h1 className="text-3xl font-black text-zinc-900 font-kalam tracking-tight">
              Fim da Rodada!
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-100/90 border-2 border-zinc-900 px-3 py-1.5 rounded-2xl my-1 shadow-sm">
            <span className="text-xs font-bold text-zinc-700">Personagem:</span>
            <span className="text-base font-black text-blue-700 font-kalam">
              {gameState.character || 'Desenho'}
            </span>
          </div>

          {master && (
            <span className="text-xs text-zinc-600 block mt-1">
              Descrito pelo mestre: <strong className="text-zinc-900 font-kalam text-sm">{master.name}</strong>
            </span>
          )}
        </div>

        {/* 1st Place Champion Spotlight (BIG and GLORIOUS) */}
        {sortedPlayers[0] && (
          <div className="bg-gradient-to-b from-amber-200 to-amber-100 border-3 border-zinc-900 rounded-3xl p-5 shadow-[5px_6px_0px_#18181b] text-center relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-300 border-2 border-zinc-900 px-4 py-1 rounded-full text-xs font-black shadow-[2px_2px_0px_#18181b] flex items-center gap-1.5 tracking-wider">
              <span>👑 CAMPEÃO DA RODADA</span>
            </div>

            <div className="flex items-center justify-center my-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/90 border-3 border-zinc-900 rounded-full flex items-center justify-center p-2 shadow-[3px_3px_0px_#18181b]">
                <AvatarIcon avatar={sortedPlayers[0].avatar} className="w-full h-full object-contain filter drop-shadow-md" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 font-kalam tracking-wide">
              {sortedPlayers[0].name}
            </h3>

            <div className="inline-flex items-center gap-1.5 bg-white border-2 border-zinc-900 px-4 py-1 rounded-full text-base font-black text-blue-700 font-mono shadow-sm mt-1.5">
              <span>{sortedPlayers[0].score} Pontos</span>
            </div>
          </div>
        )}

        {/* Special Awards Row */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Most Similar */}
          <div className="bg-blue-50 border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b] text-center flex flex-col justify-between">
            <span className="text-xs font-black uppercase text-blue-900 flex items-center justify-center gap-1 tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Mais Parecido
            </span>
            {mostSimilarPlayer ? (
              <div className="my-2 flex flex-col items-center">
                <AvatarIcon avatar={mostSimilarPlayer.avatar} className="w-12 h-12 mb-1 drop-shadow-sm" />
                <span className="text-sm font-bold text-zinc-900 truncate max-w-full font-kalam">
                  {mostSimilarPlayer.name}
                </span>
                <span className="text-xs text-blue-700 font-black bg-blue-100 border border-blue-900/30 px-2 py-0.5 rounded-full mt-1">
                  {maxSimilarVotes} {maxSimilarVotes === 1 ? 'voto' : 'votos'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic block my-4">Sem votos</span>
            )}
          </div>

          {/* Most Funny */}
          <div className="bg-amber-50 border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b] text-center flex flex-col justify-between">
            <span className="text-xs font-black uppercase text-amber-900 flex items-center justify-center gap-1 tracking-wider">
              <Laugh className="w-3.5 h-3.5 text-amber-600" /> Mais Engraçado
            </span>
            {mostFunnyPlayer ? (
              <div className="my-2 flex flex-col items-center">
                <AvatarIcon avatar={mostFunnyPlayer.avatar} className="w-12 h-12 mb-1 drop-shadow-sm" />
                <span className="text-sm font-bold text-zinc-900 truncate max-w-full font-kalam">
                  {mostFunnyPlayer.name}
                </span>
                <span className="text-xs text-amber-700 font-black bg-amber-200 border border-amber-900/30 px-2 py-0.5 rounded-full mt-1">
                  {maxFunnyVotes} {maxFunnyVotes === 1 ? 'voto' : 'votos'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic block my-4">Sem votos</span>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white border-2 border-zinc-900 rounded-3xl p-4 shadow-[4px_4px_0px_#18181b]">
          <span className="text-xs sm:text-sm font-black uppercase text-zinc-800 block mb-2.5 px-1 tracking-wider">
            🏆 Placar da Turma:
          </span>

          <div className="flex flex-col gap-2">
            {sortedPlayers.map((p, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ${
                    idx === 0 ? 'bg-amber-100/80' : 'bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 text-center font-black text-sm">
                      {medal}
                    </span>
                    <AvatarIcon avatar={p.avatar} className="w-9 h-9 shrink-0 drop-shadow-sm" />
                    <span className="font-bold text-sm sm:text-base text-zinc-900 truncate font-kalam">
                      {p.name}
                    </span>
                  </div>

                  <span className="font-mono font-black text-xs sm:text-sm text-zinc-900 bg-amber-200 border border-zinc-900 px-2.5 py-1 rounded-xl shadow-sm">
                    {p.score} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawings Gallery (Handles 1 drawing or multiple with beauty) */}
        {drawingsList.length > 0 && (
          <div className="bg-white border-2 border-zinc-900 rounded-3xl p-4 shadow-[4px_4px_0px_#18181b]">
            <span className="text-xs sm:text-sm font-black uppercase text-zinc-800 block mb-2.5 px-1 tracking-wider">
              🎨 Galeria da Rodada:
            </span>

            <div className={`grid gap-3 ${drawingsList.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {drawingsList.map(([pId, dataUrl]) => {
                const artist = gameState.players.find((p) => p.id === pId);
                return (
                  <div
                    key={pId}
                    className="bg-amber-50/50 border-2 border-zinc-900 rounded-2xl p-2 flex flex-col shadow-[2px_2px_0px_#18181b]"
                  >
                    <div
                      onClick={() => setZoomImage({ name: artist?.name || 'Desenho', url: dataUrl })}
                      className="w-full aspect-square bg-white rounded-xl border-2 border-zinc-900 overflow-hidden cursor-pointer flex items-center justify-center p-2 relative group"
                    >
                      <img src={dataUrl} alt={artist?.name} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-zinc-900 bg-white/70 backdrop-blur-xs transition-opacity">
                        Toque para ampliar
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 px-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <AvatarIcon avatar={artist?.avatar} className="w-5 h-5 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate font-kalam">
                          {artist?.name || 'Artista'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadDrawing(dataUrl, artist?.name || 'desenho')}
                        title="Baixar desenho"
                        className="p-1.5 rounded-xl bg-white border border-zinc-900 text-zinc-800 hover:bg-amber-100 active:scale-95 shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar with High Contrast and Guaranteed Visibility */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 pb-safe bg-white/98 backdrop-blur border-t-2 border-zinc-900 z-30 shadow-[0_-3px_10px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto">
          {isHost ? (
            <button
              onClick={handleNextRound}
              type="button"
              className="w-full h-14 sm:h-16 btn-arcade-gold rounded-2xl flex items-center justify-center gap-2.5 text-lg sm:text-xl font-black tracking-wide shadow-[3px_4px_0px_#18181b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <span>Próxima Rodada</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>
          ) : (
            <div className="w-full h-14 bg-amber-100 border-2 border-zinc-900 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-zinc-800 shadow-[2px_2px_0px_#18181b]">
              <span className="text-lg animate-bounce">⏳</span>
              <span>Aguardando o Host iniciar a próxima rodada...</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Zoom Modal */}
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
                  <span>Baixar Imagem</span>
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
