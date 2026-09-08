import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Sparkles, Laugh, Medal, Download, Share2 } from 'lucide-react';
import type { GameState } from '../types';
import { sounds } from '../utils/audioFx';
import { downloadDrawing } from '../utils/downloadDrawing';

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
    <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-bg-dark via-panel/60 to-bg-dark">
      <div className="w-full max-w-3xl space-y-6">
        {/* Tournament Champion Banner if Game is Over */}
        {isTournamentOver ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-accent-yellow rounded-3xl text-center shadow-2xl relative overflow-hidden"
          >
            <div className="text-4xl sm:text-5xl mb-2 animate-bounce">👑</div>
            <span className="text-xs font-black uppercase tracking-widest text-accent-yellow block mb-1">
              🏆 Torneio Finalizado!
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
              Grande Campeão!
            </h2>
            <div className="mt-4 inline-flex items-center gap-3 bg-black/60 border border-accent-yellow/40 px-6 py-3 rounded-2xl shadow-xl">
              <span className="text-4xl">{sortedPlayers[0]?.avatar || '🏆'}</span>
              <div className="text-left">
                <div className="text-2xl font-black text-accent-yellow">{sortedPlayers[0]?.name}</div>
                <div className="text-xs text-text-muted font-bold">{sortedPlayers[0]?.score} pontos no total</div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  sounds.playClick();
                  const text = encodeURIComponent(`🏆 Acabei de jogar o torneio de Desenho Cego! O campeão foi ${sortedPlayers[0]?.name} com ${sortedPlayers[0]?.score} pontos! Quem topa me desafiar na próxima?`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="inline-flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <Share2 className="w-4 h-4" /> Compartilhar Vitória no WhatsApp
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-yellow/15 border border-accent-yellow/40 text-accent-yellow font-bold text-xs uppercase tracking-wider mb-3 font-display">
              <Trophy className="w-4 h-4" />
              Rodada {gameState.currentRound || 1}{gameState.settings?.maxRounds ? ` de ${gameState.settings.maxRounds}` : ''} Concluída!
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white font-display">
              Resultados & Pódio
            </h2>

            <div className="mt-3 text-text-muted text-sm flex items-center justify-center gap-2">
              <span>Mestre da rodada:</span>
              <span className="bg-panel px-3 py-1 rounded-xl border border-border text-white font-bold inline-flex items-center gap-1.5">
                <span>{master?.avatar || '👑'}</span>
                <span>{master?.name}</span>
              </span>
            </div>

            {/* Secret Character Reveal */}
            {gameState.character && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-4 bg-gradient-to-r from-violet-900/40 via-purple-800/30 to-pink-900/40 border-2 border-primary/50 rounded-3xl max-w-lg mx-auto shadow-xl"
              >
                <span className="text-xs font-bold text-accent-cyan uppercase tracking-widest block mb-1">
                  O que o Mestre estava descrevendo:
                </span>
                <span className="text-2xl md:text-3xl font-black text-white tracking-wide">
                  ✨ {gameState.character} ✨
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Special Awards (Picasso & Meme of the round) */}
        {(maxSimilarVotes > 0 || maxFunnyVotes > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {maxSimilarVotes > 0 && picassoWinner && (
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-panel border border-accent-cyan/40 rounded-3xl p-4 flex items-center gap-4 shadow-xl"
              >
                {gameState.drawings[picassoWinner.id] && (
                  <div className="relative group/thumb w-20 h-20 rounded-2xl bg-[#0a0e1a] border border-border p-1 shrink-0 overflow-hidden">
                    <img
                      src={gameState.drawings[picassoWinner.id]}
                      alt="Picasso"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => downloadDrawing(gameState.drawings[picassoWinner.id], picassoWinner.name, gameState.character)}
                      title="Baixar desenho PNG"
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold"
                    >
                      <Download className="w-5 h-5 mb-0.5" />
                      <span>Baixar</span>
                    </button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs font-bold text-accent-cyan uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Troféu Picasso</span>
                  </div>
                  <h4 className="text-lg font-black text-white truncate">{picassoWinner.name}</h4>
                  <p className="text-xs text-text-muted">
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
                className="bg-panel border border-accent-pink/40 rounded-3xl p-4 flex items-center gap-4 shadow-xl"
              >
                {gameState.drawings[memeWinner.id] && (
                  <div className="relative group/thumb w-20 h-20 rounded-2xl bg-[#0a0e1a] border border-border p-1 shrink-0 overflow-hidden">
                    <img
                      src={gameState.drawings[memeWinner.id]}
                      alt="Meme"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => downloadDrawing(gameState.drawings[memeWinner.id], memeWinner.name, gameState.character)}
                      title="Baixar desenho PNG"
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold"
                    >
                      <Download className="w-5 h-5 mb-0.5" />
                      <span>Baixar</span>
                    </button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs font-bold text-accent-pink uppercase tracking-wider">
                    <Laugh className="w-3.5 h-3.5" />
                    <span>Troféu Atrocidade</span>
                  </div>
                  <h4 className="text-lg font-black text-white truncate">{memeWinner.name}</h4>
                  <p className="text-xs text-text-muted">
                    {maxFunnyVotes} {maxFunnyVotes === 1 ? 'voto' : 'votos'} de comédia pura!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Podium Leaderboard */}
        <div className="bg-panel border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-accent-yellow" />
            Classificação Geral
          </h3>

          <div className="space-y-2.5">
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
                  className={`flex items-center justify-between p-3.5 px-5 rounded-2xl border transition-all ${
                    isFirst
                      ? 'bg-accent-yellow/15 border-accent-yellow/60 shadow-lg shadow-accent-yellow/10 scale-[1.02]'
                      : isSecond
                      ? 'bg-slate-300/10 border-slate-300/40'
                      : isThird
                      ? 'bg-amber-700/10 border-amber-700/40'
                      : 'bg-black/30 border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        isFirst
                          ? 'bg-accent-yellow text-black'
                          : isSecond
                          ? 'bg-slate-300 text-black'
                          : isThird
                          ? 'bg-amber-600 text-white'
                          : 'bg-border text-text-muted'
                      }`}
                    >
                      {idx + 1}º
                    </div>

                    <span className="text-2xl">{player.avatar || '🎨'}</span>

                    <div>
                      <span className={`text-base font-bold ${isFirst ? 'text-accent-yellow' : 'text-white'}`}>
                        {player.name}
                      </span>
                      {player.id === gameState.masterId && (
                        <span className="text-[10px] text-primary ml-2 font-semibold uppercase">
                          (Mestre)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xl font-mono font-black text-white">
                    {player.score} <span className="text-xs text-text-muted font-sans font-normal">pts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Next Round Button / New Tournament Button */}
        <button
          onClick={handleNextRound}
          className="w-full btn-party-cta py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-lg font-black tracking-wide font-display shadow-2xl"
        >
          {isTournamentOver ? (
            <>
              <Trophy className="w-6 h-6 text-accent-yellow animate-bounce" />
              <span>Iniciar Novo Torneio!</span>
            </>
          ) : (
            <>
              <span>
                Jogar Próxima Rodada! ({gameState.currentRound ? gameState.currentRound + 1 : 2}
                {gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''})
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
