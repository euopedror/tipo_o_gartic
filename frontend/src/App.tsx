import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Voting from './components/Voting';
import Results from './components/Results';

// Assuming backend runs on port 3001
const socket: Socket = io('http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    socket.on('room_update', (state) => {
      setGameState(state);
      setError('');
    });

    socket.on('timer_update', (time) => {
      setTimer(time);
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('room_update');
      socket.off('timer_update');
      socket.off('error');
    };
  }, []);

  const handleJoin = (room: string, name: string) => {
    setRoomId(room);
    setPlayerName(name);
    socket.emit('join_room', { roomId: room, playerName: name });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { roomId });
  };

  const myPlayer = gameState?.players?.find((p: any) => p.id === socket.id);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center p-4">
        <Lobby onJoin={handleJoin} error={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col font-sans">
      {/* Header */}
      <header className="bg-panel border-b border-border p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          Desenho Cego
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-text-muted">Sala: <span className="font-mono text-white">{gameState.id}</span></span>
          <span className="text-text-muted">Jogador: <span className="text-white">{playerName}</span></span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {gameState.state === 'LOBBY' && (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="bg-panel p-8 rounded-2xl border border-border max-w-md w-full shadow-2xl text-center">
              <h2 className="text-3xl font-bold mb-6">Lobby</h2>
              
              <div className="mb-8">
                <h3 className="text-lg text-text-muted mb-2">Jogadores ({gameState.players.length})</h3>
                <ul className="space-y-2">
                  {gameState.players.map((p: any) => (
                    <li key={p.id} className="bg-bg-dark px-4 py-2 rounded-lg border border-border flex justify-between items-center">
                      <span>{p.name} {p.id === socket.id ? '(Você)' : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={handleStartGame}
                disabled={gameState.players.length < 2}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95"
              >
                {gameState.players.length < 2 ? 'Aguardando jogadores...' : 'Iniciar Jogo'}
              </button>
            </div>
          </div>
        )}

        {gameState.state === 'PLAYING' && (
          <Game 
            socket={socket} 
            gameState={gameState} 
            myPlayer={myPlayer} 
            timer={timer} 
          />
        )}

        {gameState.state === 'VOTING' && (
          <Voting 
            socket={socket} 
            gameState={gameState} 
            myPlayer={myPlayer} 
            timer={timer} 
          />
        )}

        {gameState.state === 'RESULTS' && (
          <Results 
            socket={socket} 
            gameState={gameState} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
