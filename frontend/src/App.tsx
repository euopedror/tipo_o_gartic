import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, Volume2, VolumeX, Play, 
  Crown, LogOut, Share2, Sliders, Link2, MessageCircle 
} from 'lucide-react';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Voting from './components/Voting';
import Results from './components/Results';
import FloatingReactions from './components/common/FloatingReactions';
import PartyChat from './components/common/PartyChat';
import type { GameState, ReactionItem, ChatMessage } from './types';
import { sounds } from './utils/audioFx';

// Connect to backend:
// 1. Build-time env var VITE_BACKEND_URL
// 2. Runtime URL query param (?backend=https://...)
// 3. Runtime localStorage ('backend_url')
// 4. Default Render deployment or localhost:3001
const getBackendUrl = () => {
  if ((import.meta as any).env?.VITE_BACKEND_URL) {
    return (import.meta as any).env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const queryBackend = urlParams.get('backend');
    if (queryBackend) return queryBackend;

    const saved = localStorage.getItem('backend_url');
    if (saved) return saved;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return 'https://desenho-cego-backend.onrender.com';
    }
  }
  return 'http://localhost:3001';
};

const backendUrl = getBackendUrl();
const socket: Socket = io(backendUrl);

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('🎨');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    socket.on('room_update', (state: GameState) => {
      // Guard: Ensure user is an active participant in this room
      const inRoom = state.players?.some((p) => p.id === socket.id);
      if (!inRoom) {
        setGameState(null);
        setRoomId('');
        return;
      }
      setGameState(state);
      setError('');
    });

    socket.on('left_room_success', () => {
      setGameState(null);
      setRoomId('');
      setFloatingChatOpen(false);
      setUnreadChatCount(0);
    });

    socket.on('new_chat_message', (msg: ChatMessage) => {
      if (msg.senderId !== socket.id) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    socket.on('timer_update', (time: number) => {
      setTimer(time);
      if (time <= 5 && time > 0) {
        sounds.playTick();
      }
    });

    socket.on('new_reaction', (r: ReactionItem) => {
      setReactions((prev) => [...prev.slice(-15), r]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== r.id));
      }, 3000);
    });

    socket.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.off('room_update');
      socket.off('left_room_success');
      socket.off('new_chat_message');
      socket.off('timer_update');
      socket.off('new_reaction');
      socket.off('error');
    };
  }, []);

  const handleJoin = (room: string, name: string, avatar: string) => {
    setRoomId(room);
    setPlayerName(name);
    setPlayerAvatar(avatar);
    socket.emit('join_room', { roomId: room, playerName: name, avatar });
  };

  const handleStartGame = () => {
    sounds.playPop();
    socket.emit('start_game', { roomId });
  };

  const handleCopyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(gameState?.id || roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareUrl = () => {
    const base = `${window.location.origin}${window.location.pathname}?room=${gameState?.id || roomId}`;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryBackend = urlParams.get('backend');
      if (queryBackend) {
        return `${base}&backend=${encodeURIComponent(queryBackend)}`;
      }
    }
    return base;
  };

  const handleCopyInviteLink = () => {
    sounds.playClick();
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const url = getShareUrl();
    const text = encodeURIComponent(`🎨 Vem jogar Desenho Cego comigo! A sala já tá pronta. Clique no link para entrar direto: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleUpdateSettings = (roundTime?: number, maxRounds?: number) => {
    sounds.playClick();
    socket.emit('update_settings', {
      roomId: gameState?.id,
      roundTime: roundTime ?? gameState?.settings?.roundTime ?? 90,
      maxRounds: maxRounds !== undefined ? maxRounds : (gameState?.settings?.maxRounds ?? 3)
    });
  };

  const handleSendReaction = (emoji: string) => {
    if (gameState?.id) {
      socket.emit('send_reaction', { roomId: gameState.id, emoji });
    }
  };

  const handleLeaveRoom = () => {
    sounds.playClick();
    if (window.confirm('Deseja realmente sair da sala atual?')) {
      if (gameState?.id) {
        socket.emit('leave_room', { roomId: gameState.id });
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
      setGameState(null);
      setRoomId('');
      setFloatingChatOpen(false);
      setUnreadChatCount(0);
    }
  };

  const toggleFloatingChat = () => {
    sounds.playClick();
    if (!floatingChatOpen) {
      setUnreadChatCount(0);
    }
    setFloatingChatOpen(!floatingChatOpen);
  };

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) sounds.playPop();
  };

  const myPlayer = gameState?.players?.find((p) => p.id === socket.id);

  if (!gameState || !myPlayer) {
    return <Lobby onJoin={handleJoin} error={error} />;
  }

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* App Header */}
      <header className="bg-panel/90 backdrop-blur border-b border-border/80 px-4 py-3 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3 font-display">
          <span className="text-2xl md:text-3xl float-bounce">🎨</span>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>Desenho</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
                Cego
              </span>
            </h1>
            <div className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider hidden sm:block font-sans">
              Party Edition
            </div>
          </div>
        </div>

        {/* Center Room Code Pill & Round Badge */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyCode}
            title="Clique para copiar o código da sala"
            className="flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-border px-3 py-1.5 rounded-full transition-all text-xs md:text-sm font-mono font-bold"
          >
            <span className="text-text-muted">SALA:</span>
            <span className="text-accent-yellow tracking-wider">{gameState.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-text-muted hover:text-white" />
            )}
          </button>

          {gameState.state !== 'LOBBY' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-violet-500/15 border border-violet-400/30 px-3 py-1.5 rounded-full text-xs font-bold text-violet-300 font-display">
              <span>
                Rodada {gameState.currentRound || 1}
                {gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-panel-light hover:bg-border/60 border border-border transition-colors text-text-muted hover:text-white"
            title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-accent-green" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          {/* User profile tag */}
          <div className="flex items-center gap-2 bg-panel-light px-3 py-1.5 rounded-xl border border-border">
            <span className="text-lg">{myPlayer?.avatar || playerAvatar}</span>
            <span className="text-xs md:text-sm font-bold text-white max-w-[100px] truncate">
              {playerName || myPlayer?.name}
            </span>
          </div>

          {/* Leave Room Button */}
          <button
            onClick={handleLeaveRoom}
            title="Sair da sala"
            className="p-2 rounded-xl bg-panel-light hover:bg-red-500/20 hover:border-red-500/40 border border-border transition-colors text-text-muted hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {gameState.state === 'LOBBY' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col items-center justify-center p-4 md:p-8"
            >
              <div className="bg-panel border border-border/90 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl backdrop-blur relative overflow-hidden text-center">
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-3xl">🎪</span>
                  <h2 className="text-2xl md:text-3xl font-black text-white font-display">Sala de Espera</h2>
                </div>
                <p className="text-text-muted text-xs md:text-sm">
                  Jogue com <strong className="text-white">2 a 12+ amigos</strong>! Mínimo de 2 para começar.
                </p>

                {/* Big Room Code Badge */}
                <div className="inline-flex items-center gap-2.5 bg-black/40 border border-violet-500/30 px-5 py-2 rounded-2xl my-4 shadow-inner">
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Código da Sala:</span>
                  <span className="text-2xl font-mono font-black text-accent-yellow tracking-widest">{gameState.id}</span>
                  <button
                    onClick={handleCopyCode}
                    title="Copiar código da sala"
                    className="p-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 hover:text-white transition-all ml-1"
                  >
                    {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Simplified Invite Bar */}
                <div className="mb-5 p-3.5 bg-violet-500/10 border border-violet-400/25 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div>
                    <span className="text-xs font-bold text-white block font-display">Convidar Amigos</span>
                    <span className="text-[11px] text-text-muted">Envie o link direto para a galera</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCopyInviteLink}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-panel-light hover:bg-border border border-border text-xs font-bold px-3.5 py-2.5 rounded-xl text-white transition-all active:scale-95 shadow-sm"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-accent-green" /> : <Link2 className="w-4 h-4 text-accent-cyan" />}
                      <span>{copiedLink ? 'Link Copiado! ✓' : 'Copiar Link'}</span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Host Settings (Sleek Segmented Controls) */}
                {gameState.players[0]?.id === socket.id ? (
                  <div className="mb-5 p-3.5 bg-black/25 rounded-2xl border border-border/70 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-cyan mb-2.5">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Regras da Partida (Host)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Round Time */}
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block mb-1">⏱️ Tempo por Rodada:</span>
                        <div className="grid grid-cols-3 gap-1 bg-panel-light p-1 rounded-xl border border-border/60">
                          {[
                            { label: '60s', val: 60 },
                            { label: '90s', val: 90 },
                            { label: '120s', val: 120 },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => handleUpdateSettings(opt.val, undefined)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                (gameState.settings?.roundTime || 90) === opt.val
                                  ? 'bg-primary text-white shadow-sm font-black'
                                  : 'text-text-muted hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Total Rounds */}
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block mb-1">🏁 Duração do Torneio:</span>
                        <div className="grid grid-cols-3 gap-1 bg-panel-light p-1 rounded-xl border border-border/60">
                          {[
                            { label: '3 Rod.', val: 3 },
                            { label: '5 Rod.', val: 5 },
                            { label: 'Sem Fim', val: 0 },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => handleUpdateSettings(undefined, opt.val)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                (gameState.settings?.maxRounds ?? 3) === opt.val
                                  ? 'bg-accent-yellow text-black shadow-sm font-black'
                                  : 'text-text-muted hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 py-2 px-4 bg-black/25 rounded-2xl border border-border/60 flex items-center justify-around text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>⏱️ Tempo:</span>
                      <span className="font-bold text-white">{gameState.settings?.roundTime || 90}s</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>🏁 Torneio:</span>
                      <span className="font-bold text-white">
                        {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Limite'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Player list grid */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5 px-1">
                    <span>Amigos Conectados</span>
                    <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                      {gameState.players.length} {gameState.players.length === 1 ? 'amigo' : 'amigos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {gameState.players.map((p, idx) => {
                      const isMe = p.id === socket.id;
                      const isFirst = idx === 0;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all ${
                            isMe 
                              ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/30' 
                              : 'bg-black/30 border-border/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl">{p.avatar || '🎨'}</span>
                            <span className="font-bold text-sm text-white truncate">
                              {p.name} {isMe && <span className="text-primary text-xs">(Você)</span>}
                            </span>
                          </div>

                          {isFirst && (
                            <span title="Criador da sala" className="flex items-center gap-1 text-[10px] font-bold text-accent-yellow bg-accent-yellow/10 px-2 py-0.5 rounded-lg border border-accent-yellow/30">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Dotted placeholder if only 1 player */}
                    {gameState.players.length < 2 && (
                      <div className="flex items-center justify-center p-3 rounded-2xl border-2 border-dashed border-border/60 text-text-muted text-xs font-semibold gap-2">
                        <span className="animate-pulse">⏳</span>
                        <span>Esperando mais 1 amigo entrar...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Start Game button */}
                <button
                  onClick={handleStartGame}
                  disabled={gameState.players.length < 2}
                  className="w-full btn-party-cta py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-lg tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {gameState.players.length < 2
                    ? 'Aguardando mais 1 jogador (Mín. 2)'
                    : `Começar Partida! (${gameState.players.length} jogadores)`}
                </button>
              </div>
            </motion.div>
          )}

          {gameState.state === 'PLAYING' && (
            <Game
              key="game"
              socket={socket}
              gameState={gameState}
              myPlayer={myPlayer}
              timer={timer}
            />
          )}

          {gameState.state === 'VOTING' && (
            <Voting
              key="voting"
              socket={socket}
              gameState={gameState}
              myPlayer={myPlayer}
              timer={timer}
            />
          )}

          {gameState.state === 'RESULTS' && (
            <Results
              key="results"
              socket={socket}
              gameState={gameState}
            />
          )}
        </AnimatePresence>

        {/* Floating Reactions Bar & Animation Layer */}
        {gameState.state !== 'LOBBY' && (
          <FloatingReactions 
            reactions={reactions} 
            onSendReaction={handleSendReaction} 
          />
        )}

        {/* Floating Chat Button & Drawer during Voting and Results */}
        {(gameState.state === 'VOTING' || gameState.state === 'RESULTS') && (
          <>
            <div className="fixed bottom-4 left-4 z-40">
              <button
                type="button"
                onClick={toggleFloatingChat}
                className="relative flex items-center gap-2 bg-panel/95 hover:bg-panel border border-border/90 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-2xl backdrop-blur transition-all active:scale-95 group hover:border-accent-cyan/50"
              >
                <MessageCircle className="w-4 h-4 text-accent-cyan group-hover:scale-110 transition-transform" />
                <span>Chat da Sala</span>
                {unreadChatCount > 0 && (
                  <span className="bg-accent-pink text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-md">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {floatingChatOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  className="fixed bottom-16 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-96 shadow-2xl rounded-3xl overflow-hidden border border-border/90 bg-panel/98 backdrop-blur"
                >
                  <PartyChat
                    socket={socket}
                    roomId={gameState.id}
                    messages={gameState.messages}
                    myPlayer={myPlayer}
                    isMaster={Boolean(myPlayer?.isMaster)}
                    compact={true}
                    onClose={() => setFloatingChatOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
