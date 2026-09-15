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
    const end = Date.now() + 2 * 1000;
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 45,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 45,
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

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto bg-[#f8f7f2] font-sketch pb-24">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
        {/* Celebration Title Card */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-4 shadow-[4px_4px_0px_#18181b] text-center relative sketch-tape">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-yellow-500 fill-amber-300 stroke-[2.5]" />
            <h1 className="text-2xl font-black text-zinc-900">Fim da Rodada!</h1>
          </div>

          <p className="text-xs text-zinc-600">
            O personagem secreto era: <strong className="text-blue-700 font-kalam text-sm">{gameState.character || 'Desenho'}</strong>
          </p>
          {master && (
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              Descrito pelo mestre: <strong className="text-zinc-800">{master.name}</strong>
            </span>
          )}
        </div>

        {/* 1st Place Champion Spotlight */}
        {sortedPlayers[0] && (
          <div className="bg-amber-100 border-2 border-zinc-900 rounded-2xl p-4 shadow-[4px_4px_0px_#18181b] text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-300 border-2 border-zinc-900 px-3 py-0.5 rounded-full text-[11px] font-black shadow-sm flex items-center gap-1">
              <span>👑 1º LUGAR</span>
            </div>

            <div className="flex items-center justify-center my-2">
              <AvatarIcon avatar={sortedPlayers[0].avatar} className="w-16 h-16 drop-shadow-md" />
            </div>

            <h3 className="text-xl font-black text-zinc-900 font-kalam">{sortedPlayers[0].name}</h3>
            <span className="text-sm font-black text-blue-700 font-mono">
              {sortedPlayers[0].score} Pontos
            </span>
          </div>
        )}

        {/* Special Awards Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Most Similar */}
          <div className="bg-blue-50 border-2 border-zinc-900 rounded-xl p-2.5 shadow-[2px_2px_0px_#18181b] text-center">
            <span className="text-[10px] font-black uppercase text-blue-800 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" /> Mais Parecido
            </span>
            {mostSimilarPlayer ? (
              <div className="mt-1.5 flex flex-col items-center">
                <AvatarIcon avatar={mostSimilarPlayer.avatar} className="w-8 h-8 mb-1" />
                <span className="text-xs font-bold text-zinc-900 truncate max-w-full font-kalam">
                  {mostSimilarPlayer.name}
                </span>
                <span className="text-[10px] text-blue-700 font-bold">{maxSimilarVotes} votos</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic block mt-2">Sem votos</span>
            )}
          </div>

          {/* Most Funny */}
          <div className="bg-amber-50 border-2 border-zinc-900 rounded-xl p-2.5 shadow-[2px_2px_0px_#18181b] text-center">
            <span className="text-[10px] font-black uppercase text-amber-800 flex items-center justify-center gap-1">
              <Laugh className="w-3 h-3 text-amber-600" /> Mais Engraçado
            </span>
            {mostFunnyPlayer ? (
              <div className="mt-1.5 flex flex-col items-center">
                <AvatarIcon avatar={mostFunnyPlayer.avatar} className="w-8 h-8 mb-1" />
                <span className="text-xs font-bold text-zinc-900 truncate max-w-full font-kalam">
                  {mostFunnyPlayer.name}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">{maxFunnyVotes} votos</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic block mt-2">Sem votos</span>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b]">
          <span className="text-xs font-black uppercase text-zinc-700 block mb-2 px-1">
            Placar Geral:
          </span>

          <div className="flex flex-col gap-1.5">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border-2 border-zinc-900 shadow-[1.5px_1.5px_0px_#18181b]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 text-center font-bold text-xs ${
                    idx === 0 ? 'text-amber-600 font-black' : 'text-zinc-500'
                  }`}>
                    #{idx + 1}
                  </span>
                  <AvatarIcon avatar={p.avatar} className="w-7 h-7 shrink-0" />
                  <span className="font-bold text-xs text-zinc-900 truncate font-kalam">
                    {p.name}
                  </span>
                </div>

                <span className="font-mono font-black text-xs text-zinc-900 bg-amber-200 border border-zinc-900 px-2 py-0.5 rounded-md">
                  {p.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Drawings Gallery with 1-Tap Download */}
        {gameState.drawings && Object.keys(gameState.drawings).length > 0 && (
          <div className="bg-white border-2 border-zinc-900 rounded-2xl p-3 shadow-[3px_3px_0px_#18181b]">
            <span className="text-xs font-black uppercase text-zinc-700 block mb-2 px-1">
              🎨 Galeria da Turma:
            </span>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(gameState.drawings).map(([pId, dataUrl]) => {
                const artist = gameState.players.find((p) => p.id === pId);
                return (
                  <div
                    key={pId}
                    className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-1.5 flex flex-col shadow-sm"
                  >
                    <div
                      onClick={() => setZoomImage({ name: artist?.name || 'Desenho', url: dataUrl })}
                      className="w-full aspect-square bg-white rounded-lg border border-zinc-300 overflow-hidden cursor-pointer flex items-center justify-center p-1"
                    >
                      <img src={dataUrl} alt={artist?.name} className="w-full h-full object-contain" />
                    </div>

                    <div className="flex items-center justify-between mt-1 px-1">
                      <span className="text-[11px] font-bold text-zinc-800 truncate font-kalam">
                        {artist?.name || 'Artista'}
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadDrawing(dataUrl, artist?.name || 'desenho')}
                        title="Baixar imagem"
                        className="p-1 rounded bg-white border border-zinc-900 text-zinc-700 active:scale-95"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t-2 border-zinc-900 z-20">
        <div className="max-w-sm mx-auto">
          {isHost ? (
            <button
              onClick={handleNextRound}
              type="button"
              className="w-full btn-arcade-gold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-black tracking-wide shadow-[3px_3px_0px_#18181b]"
            >
              <span>Próxima Rodada</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <div className="w-full bg-amber-50 border-2 border-zinc-900 p-2.5 rounded-xl text-center text-xs font-bold text-zinc-800 shadow-[2px_2px_0px_#18181b]">
              Aguardando o Host iniciar a próxima rodada...
            </div>
          )}
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
