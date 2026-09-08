// React is imported implicitly
import { Socket } from 'socket.io-client';

interface ResultsProps {
  socket: Socket;
  gameState: any;
}

export default function Results({ socket, gameState }: ResultsProps) {
  
  // Sort players by score
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const master = gameState.players.find((p: any) => p.id === gameState.masterId);

  const handleNextRound = () => {
    socket.emit('next_round', { roomId: gameState.id });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="bg-panel w-full max-w-2xl rounded-3xl border border-border p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="text-center relative z-10 mb-10">
          <h2 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Fim da Rodada!
          </h2>
          <p className="text-text-muted text-lg">
            O Mestre foi <span className="font-bold text-white">{master?.name}</span>
          </p>
        </div>

        <div className="space-y-4 relative z-10 mb-10">
          {sortedPlayers.map((player, idx) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-4 rounded-xl border ${
                idx === 0 
                  ? 'bg-yellow-500/20 border-yellow-500/50 scale-105' 
                  : 'bg-black/20 border-border'
              } transition-transform`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  idx === 0 ? 'bg-yellow-500 text-black' :
                  idx === 1 ? 'bg-gray-400 text-black' :
                  idx === 2 ? 'bg-amber-700 text-white' : 'bg-border text-text-muted'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-lg ${idx === 0 ? 'font-bold text-yellow-400' : 'text-white'}`}>
                  {player.name} {player.id === gameState.masterId ? '(Mestre)' : ''}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold">
                {player.score} <span className="text-sm text-text-muted font-sans">pts</span>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleNextRound}
          className="w-full relative z-10 bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all active:scale-95 text-lg"
        >
          Próxima Rodada
        </button>
      </div>
    </div>
  );
}
