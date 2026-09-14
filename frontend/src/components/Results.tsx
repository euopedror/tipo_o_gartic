import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Sparkles, Laugh, Medal, Download, Share2 } from 'lucide-react';
import type { GameState } from '../types';
import { sounds } from '../utils/audioFx';
import { downloadDrawing } from '../utils/downloadDrawing';
import AvatarIcon from './common/AvatarIcon';

interface ResultsProps {
  socket: Socket;
  gameState: GameState;
}

export default function Results({ socket, gameState }: ResultsProps) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const master = gameState.players.find((p) => p.id === gameState.masterId);

  // Trigger celebration on mount
  useEffect(() => {
    sounds.playFanfare();

    // Confetti burst
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
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

  // Determine special awards
  let mostSimilarId = '';
  let maxSimilarVotes = 0;
  let mostFunnyId = '';
  let maxFunnyVotes = 0;

  Object.entries(gameState.votes || {}).forEach(([playerId, voteObj]) => {
    if (voteObj.similar > maxSimilarVotes) {
      maxSimilarVotes = voteObj.similar;
      mostSimilarId = playerId;
    }
    if (voteObj.funny > maxFunnyVotes) {
      maxFunnyVotes = voteObj.funny;
      mostFunnyId = playerId;
    }
  });

  const picassoWinner = gameState.players.find((p) => p.id === mostSimilarId);
  const memeWinner = gameState.players.find((p) => p.id === mostFunnyId);

  const isTournamentOver = Boolean(gameState.isGameOver);

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-2.5 sm:p-4 md:p-8 overflow-y-auto bg-transparent">
      <div className="w-full max-w-3xl space-y-4 sm:space-y-6">
        {/* Tournament Champion Banner if Game is Over */}
        {isTournamentOver ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 sm:p-7 bg-white border-2 border-zinc-900 rounded-2xl sm:rounded-3xl text-center shadow-[6px_6px_0px_#18181b] relative overflow-hidden font-sketch"
          >
            <div className="text-4xl sm:text-5xl mb-2 animate-bounce">👑</div>
            <span className="inline-block px-3 py-1 bg-yellow-200 border-2 border-zinc-900 rounded-full text-zinc-900 font-bold text-xs uppercase mb-2 shadow-[2px_2px_0px_#18181b]">
              🏆 Torneio Finalizado!
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold font-kalam text-zinc-900 tracking-tight">
              Grande Campeão!
            </h2>
            <div className="mt-4 inline-flex items-center gap-3 bg-yellow-50 border-2 border-zinc-900 px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-2xl shadow-[3px_3px_0px_#18181b]">
              <AvatarIcon avatar={sortedPlayers[0]?.avatar} className="w-10 h-10 sm:w-12 sm:h-12" />
              <div className="text-left font-kalam">
                <div className="text-2xl sm:text-3xl font-bold text-zinc-900">{sortedPlayers[0]?.name}</div>
                <div className="text-xs sm:text-sm text-zinc-600 font-sketch font-bold">{sortedPlayers[0]?.score} pontos no total</div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  sounds.playClick();
                  const text = encodeURIComponent(`🏆 Acabei de jogar o torneio de Desenho Cego! O campeão foi ${sortedPlayers[0]?.name} com ${sortedPlayers[0]?.score} pontos! Quem topa me desafiar na próxima?`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="inline-flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 border-2 border-zinc-900 text-emerald-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-sketch shadow-[2px_2px_0px_#18181b] transition-transform active:scale-95"
              >
                <Share2 className="w-4 h-4 shrink-0" /> Compartilhar Vitória no WhatsApp
              </button>
            </div>
          </motion.div>
        ) : (
          /* Header with reveal */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-200 border-2 border-zinc-900 text-zinc-900 font-bold text-xs uppercase tracking-wider mb-2 font-sketch shadow-[2px_2px_0px_#18181b]">
              <Trophy className="w-4 h-4" />
              Rodada {gameState.currentRound || 1}{gameState.settings?.maxRounds ? ` de ${gameState.settings.maxRounds}` : ''} Concluída!
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-900 font-kalam">
              Resultados & Pódio ✏️
            </h2>

            <div className="mt-2 text-zinc-600 text-sm sm:text-base font-sketch flex items-center justify-center gap-2">
              <span>Mestre da rodada:</span>
              <span className="bg-white px-3 py-1 rounded-xl border-2 border-zinc-900 text-zinc-900 font-bold inline-flex items-center gap-2 shadow-[2px_2px_0px_#18181b]">
                <AvatarIcon avatar={master?.avatar} className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>{master?.name}</span>
              </span>
            </div>

            {/* Secret Character Reveal */}
            {gameState.character && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-4 bg-yellow-100 border-2 border-zinc-900 rounded-2xl max-w-lg mx-auto shadow-[4px_4px_0px_#18181b] font-sketch"
              >
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-widest block mb-0.5">
                  O que o Mestre estava descrevendo:
                </span>
                <span className="text-2xl sm:text-3xl font-bold font-kalam text-zinc-900 tracking-wide">
                  ✨ {gameState.character} ✨
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Special Awards (Picasso & Meme of the round) */}
        {(maxSimilarVotes > 0 || maxFunnyVotes > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-sketch">
            {maxSimilarVotes > 0 && picassoWinner && (
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-[4px_4px_0px_#18181b]"
              >
                {gameState.drawings[picassoWinner.id] && (
                  <div className="relative group/thumb w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-zinc-900 p-1 shrink-0 overflow-hidden shadow-[2px_2px_0px_#18181b]">
                    <img
                      src={gameState.drawings[picassoWinner.id]}
                      alt="Picasso"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => downloadDrawing(gameState.drawings[picassoWinner.id], picassoWinner.name, gameState.character)}
                      title="Baixar desenho PNG"
                      className="absolute inset-0 bg-zinc-900/80 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                      <span>Baixar</span>
                    </button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Troféu Picasso</span>
                  </div>
                  <h4 className="text-lg font-bold font-kalam text-zinc-900 truncate">{picassoWinner.name}</h4>
                  <p className="text-xs text-zinc-600">
                    {maxSimilarVotes} {maxSimilarVotes === 1 ? 'voto' : 'votos'} de Mais Parecido!
                  </p>
                </div>
              </motion.div>
            )}

            {maxFunnyVotes > 0 && memeWinner && (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-[4px_4px_0px_#18181b]"
              >
                {gameState.drawings[memeWinner.id] && (
                  <div className="relative group/thumb w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border-2 border-zinc-900 p-1 shrink-0 overflow-hidden shadow-[2px_2px_0px_#18181b]">
                    <img
                      src={gameState.drawings[memeWinner.id]}
                      alt="Meme"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => downloadDrawing(gameState.drawings[memeWinner.id], memeWinner.name, gameState.character)}
                      title="Baixar desenho PNG"
                      className="absolute inset-0 bg-zinc-900/80 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                      <span>Baixar</span>
                    </button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                    <Laugh className="w-3.5 h-3.5 shrink-0" />
                    <span>Troféu Atrocidade</span>
                  </div>
                  <h4 className="text-lg font-bold font-kalam text-zinc-900 truncate">{memeWinner.name}</h4>
                  <p className="text-xs text-zinc-600">
                    {maxFunnyVotes} {maxFunnyVotes === 1 ? 'voto' : 'votos'} de comédia pura!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Podium Leaderboard */}
        <div className="bg-white border-2 border-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[5px_5px_0px_#18181b] space-y-3 font-sketch">
          <h3 className="text-base font-bold font-kalam text-zinc-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-500" />
            Classificação Geral
          </h3>

          <div className="space-y-2 sm:space-y-2.5">
            {sortedPlayers.map((player, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`flex items-center justify-between p-2.5 sm:p-3.5 px-3 sm:px-5 rounded-xl border-2 border-zinc-900 transition-all ${
                    isFirst
                      ? 'bg-yellow-100 shadow-[3px_3px_0px_#18181b] scale-[1.01]'
                      : isSecond
                      ? 'bg-zinc-100 shadow-[2px_2px_0px_#18181b]'
                      : isThird
                      ? 'bg-amber-50 shadow-[2px_2px_0px_#18181b]'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 font-kalam">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-zinc-900 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                        isFirst
                          ? 'bg-yellow-300 text-zinc-900'
                          : isSecond
                          ? 'bg-zinc-300 text-zinc-900'
                          : isThird
                          ? 'bg-amber-300 text-zinc-900'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {idx + 1}º
                    </div>

                    <AvatarIcon avatar={player.avatar} className="w-7 h-7 sm:w-8 sm:h-8" />

                    <div className="min-w-0">
                      <span className="text-base sm:text-lg font-bold text-zinc-900 truncate block">
                        {player.name}
                        {player.id === gameState.masterId && (
                          <span className="text-xs text-blue-700 ml-1.5 font-sketch font-bold">
                            (Mestre)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-xl sm:text-2xl font-kalam font-bold text-zinc-900 shrink-0 ml-2">
                    {player.score} <span className="text-xs font-sketch text-zinc-500 font-normal">pts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Next Round Button / New Tournament Button */}
        <button
          onClick={handleNextRound}
          className="w-full btn-arcade-gold py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl flex items-center justify-center gap-2.5 text-base sm:text-xl font-bold font-kalam shadow-[4px_4px_0px_#18181b] min-h-[50px] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {isTournamentOver ? (
            <>
              <Trophy className="w-6 h-6 text-zinc-900 animate-bounce" />
              <span>Iniciar Novo Torneio!</span>
            </>
          ) : (
            <>
              <span className="truncate">
                Jogar Próxima Rodada! ({gameState.currentRound ? gameState.currentRound + 1 : 2}
                {gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''})
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5] shrink-0" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
