import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Laugh, Sparkles, ZoomIn, X, Check, Download } from 'lucide-react';
import type { GameState, Player } from '../types';
import { sounds } from '../utils/audioFx';
import { downloadDrawing } from '../utils/downloadDrawing';

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
    if (playerId === socket.id) return; // Cannot vote for oneself

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
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-bg-dark via-panel/50 to-bg-dark">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 font-bold text-xs uppercase tracking-wider mb-3 font-display">
          <Sparkles className="w-4 h-4 text-accent-yellow" />
          Galeria de Arte da Rodada
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white font-display">
          Hora de Votar! 🗳️
        </h2>
        <p className="text-text-muted text-sm md:text-base mt-2">
          Vote em quem desenhou <strong className="text-accent-cyan">mais parecido</strong> e em quem produziu a <strong className="text-accent-pink">maior atrocidade</strong>!
        </p>

        {/* Timer Bar */}
        <div className="mt-4 inline-flex items-center gap-3 bg-panel border border-border px-5 py-2.5 rounded-2xl shadow-lg">
          <Clock className={`w-5 h-5 ${timer <= 10 ? 'text-red-400 animate-spin' : 'text-accent-yellow'}`} />
          <span className="text-text-muted text-xs font-bold uppercase tracking-wider">Tempo:</span>
          <span className={`text-2xl font-mono font-black ${timer <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timer}s
          </span>
        </div>
      </motion.div>

      {/* Voting Status feedback */}
      <div className="max-w-md mx-auto w-full mb-6 text-center">
        {hasVotedAll ? (
          <div className="bg-accent-green/15 border border-accent-green/40 text-accent-green font-bold py-3 px-4 rounded-2xl text-sm flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            <span>Todos os seus votos foram registrados! Aguardando o timer...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-xs">
            <span className={`px-3 py-1.5 rounded-xl border font-semibold ${hasVotedSimilar ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan' : 'bg-black/30 border-border text-text-muted'}`}>
              {hasVotedSimilar ? '✓ Mais Parecido' : '🎨 Falta votar: Mais Parecido'}
            </span>
            <span className={`px-3 py-1.5 rounded-xl border font-semibold ${hasVotedFunny ? 'bg-accent-pink/20 border-accent-pink text-accent-pink' : 'bg-black/30 border-border text-text-muted'}`}>
              {hasVotedFunny ? '✓ Atrocidade' : '😂 Falta votar: Atrocidade'}
            </span>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full pb-10">
        {drawings.map(({ playerId, player, dataUrl }) => {
          const isMe = playerId === socket.id;
          const isSimilarVoted = votedSimilarId === playerId;
          const isFunnyVoted = votedFunnyId === playerId;

          return (
            <motion.div
              key={playerId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className={`bg-panel border-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all relative ${
                isSimilarVoted
                  ? 'border-accent-cyan ring-2 ring-accent-cyan/40'
                  : isFunnyVoted
                  ? 'border-accent-pink ring-2 ring-accent-pink/40'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Card Header */}
              <div className="p-3.5 px-4 bg-black/40 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">{player?.avatar || '🎨'}</span>
                  <span className="font-bold text-sm text-white truncate">
                    {player?.name || 'Artista'} {isMe && <span className="text-primary text-xs">(Seu)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => downloadDrawing(dataUrl, player?.name, gameState.character)}
                    title="Baixar desenho PNG"
                    className="p-1.5 rounded-lg bg-panel-light hover:bg-border text-text-muted hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                    title="Expandir desenho"
                    className="p-1.5 rounded-lg bg-panel-light hover:bg-border text-text-muted hover:text-white transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawing Canvas Image */}
              <div 
                onClick={() => setZoomImage({ name: player?.name || 'Desenho', url: dataUrl })}
                className="aspect-[4/3] w-full bg-[#0a0e1a] relative cursor-pointer group flex items-center justify-center p-2"
              >
                <img
                  src={dataUrl}
                  alt={`Desenho de ${player?.name}`}
                  className="w-full h-full object-contain rounded-xl"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/20">
                    <ZoomIn className="w-3.5 h-3.5" /> Ampliar
                  </span>
                </div>
              </div>

              {/* Voting Actions */}
              <div className="p-3.5 bg-black/20 border-t border-border flex gap-2">
                {isMe ? (
                  <div className="w-full text-center py-2 text-xs font-semibold text-text-muted bg-white/5 rounded-xl">
                    Seu próprio desenho 😉
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleVote('similar', playerId)}
                      disabled={hasVotedSimilar}
                      className={`flex-1 btn-3d py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        isSimilarVoted
                          ? 'bg-accent-cyan text-black shadow-[0_3px_0_0_#0891b2]'
                          : hasVotedSimilar
                          ? 'opacity-30 cursor-not-allowed bg-black/30 text-text-muted'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_0_0_#1d4ed8]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSimilarVoted ? 'Parecido ✓' : 'Mais Parecido'}</span>
                    </button>

                    <button
                      onClick={() => handleVote('funny', playerId)}
                      disabled={hasVotedFunny}
                      className={`flex-1 btn-3d py-2.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                        isFunnyVoted
                          ? 'bg-accent-pink text-white shadow-[0_3px_0_0_#be123c]'
                          : hasVotedFunny
                          ? 'opacity-30 cursor-not-allowed bg-black/30 text-text-muted'
                          : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_4px_0_0_#a21caf]'
                      }`}
                    >
                      <Laugh className="w-3.5 h-3.5" />
                      <span>{isFunnyVoted ? 'Atrocidade 😂' : 'Atrocidade'}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {drawings.length === 0 && (
          <div className="col-span-full text-center text-text-muted py-16 bg-panel/50 rounded-3xl border border-border">
            <span className="text-4xl mb-3 block">😢</span>
            <h3 className="text-xl font-bold text-white mb-1">Nenhum desenho foi enviado a tempo!</h3>
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
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-3xl w-full bg-panel border border-border rounded-3xl overflow-hidden shadow-2xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <h3 className="text-lg font-bold text-white">Desenho de {zoomImage.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadDrawing(zoomImage.url, zoomImage.name, gameState.character);
                    }}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PNG</span>
                  </button>
                  <button
                    onClick={() => setZoomImage(null)}
                    className="p-1.5 rounded-xl bg-panel-light hover:bg-border text-text-muted hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="bg-[#0a0e1a] rounded-2xl overflow-hidden flex items-center justify-center max-h-[70vh]">
                <img
                  src={zoomImage.url}
                  alt="Zoom"
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
