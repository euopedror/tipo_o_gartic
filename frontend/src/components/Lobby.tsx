import { useState } from 'react';

interface LobbyProps {
  onJoin: (roomId: string, name: string) => void;
  error?: string;
}

export default function Lobby({ onJoin, error }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && name.trim()) {
      onJoin(roomId.trim(), name.trim());
    }
  };

  const generateRoom = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  return (
    <div className="bg-panel p-8 rounded-2xl shadow-2xl border border-border w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          Desenho Cego
        </h1>
        <p className="text-text-muted">Descreva sem nomear, desenhe sem apagar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Seu Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-gray-600"
            placeholder="Como quer ser chamado?"
            required
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2 flex justify-between">
            <span>Código da Sala</span>
            <button 
              type="button" 
              onClick={generateRoom}
              className="text-primary hover:text-primary-hover text-sm font-bold transition-colors"
            >
              Gerar Aleatório
            </button>
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="w-full bg-bg-dark border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-white font-mono placeholder:text-gray-600"
            placeholder="EX: SALA123"
            required
            maxLength={10}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          Entrar na Sala
        </button>
      </form>
    </div>
  );
}
