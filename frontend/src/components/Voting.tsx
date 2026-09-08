import { useState } from 'react';
import { Socket } from 'socket.io-client';

interface VotingProps {
  socket: Socket;
  gameState: any;
  myPlayer: any;
  timer: number;
}

export default function Voting({ socket, gameState, myPlayer, timer }: VotingProps) {
  const [hasVotedSimilar, setHasVotedSimilar] = useState(false);
  const [hasVotedFunny, setHasVotedFunny] = useState(false);
  const isMaster = myPlayer?.isMaster;

  const drawings = Object.entries(gameState.drawings || {}).map(([playerId, dataUrl]) => {
    const player = gameState.players.find((p: any) => p.id === playerId);
    return { playerId, player, dataUrl };
  });

  const handleVote = (type: 'similar' | 'funny', playerId: string) => {
    if (type === 'similar' && hasVotedSimilar) return;
    if (type === 'funny' && hasVotedFunny) return;
    if (playerId === socket.id) return; // can't vote for self

    socket.emit('submit_vote', { roomId: gameState.id, type, votedPlayerId: playerId });
    
    if (type === 'similar') setHasVotedSimilar(true);
    if (type === 'funny') setHasVotedFunny(true);
  };

  const hasVotedAll = hasVotedSimilar && hasVotedFunny;

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          Hora de Votar!
        </h2>
        <p className="text-text-muted text-lg mb-4">
          O tempo esgotou! Mestre, o que você tentou descrever?
        </p>
        
        <div className="inline-block bg-panel border border-border px-6 py-3 rounded-xl shadow-lg">
          <span className="text-red-500 font-bold animate-pulse text-2xl mr-2">{timer}s</span>
          <span className="text-white">restantes para votar</span>
        </div>
      </div>

      {(hasVotedAll || isMaster) && (
        <div className="mb-8 text-center text-green-400 font-bold bg-green-500/10 border border-green-500/30 py-3 rounded-xl mx-auto w-full max-w-md">
          {isMaster ? 'Mestre também vota!' : 'Você já votou! Aguardando outros jogadores...'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
        {drawings.map(({ playerId, player, dataUrl }) => {
          const isMe = playerId === socket.id;

          return (
            <div key={playerId} className="bg-panel border border-border rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02]">
              <div className="p-4 border-b border-border flex justify-between items-center bg-black/20">
                <span className="font-bold text-lg">{player?.name} {isMe ? '(Você)' : ''}</span>
              </div>
              <div className="aspect-[4/3] w-full bg-[#0f172a] relative">
                <img src={dataUrl as string} alt={`Desenho de ${player?.name}`} className="w-full h-full object-contain" />
              </div>
              {!isMe && !hasVotedAll && (
                <div className="p-4 flex gap-2">
                  <button 
                    onClick={() => handleVote('similar', playerId)}
                    disabled={hasVotedSimilar}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    🎨 Mais Parecido
                  </button>
                  <button 
                    onClick={() => handleVote('funny', playerId)}
                    disabled={hasVotedFunny}
                    className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    😂 Atrocidade
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {drawings.length === 0 && (
          <div className="col-span-full text-center text-text-muted text-xl py-12 bg-panel rounded-2xl border border-border">
            Ninguém conseguiu enviar um desenho a tempo! 😭
          </div>
        )}
      </div>
    </div>
  );
}
