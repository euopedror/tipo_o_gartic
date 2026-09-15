import { useState, useEffect, useRef } from 'react';
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
import VoiceChat from './components/common/VoiceChat';
import AvatarIcon from './components/common/AvatarIcon';
import { useIsMobile } from './hooks/useIsMobile';
import MobileHeader from './components/mobile/MobileHeader';
import MobileLobby from './components/mobile/MobileLobby';
import MobileWaitingRoom from './components/mobile/MobileWaitingRoom';
import MobileGame from './components/mobile/MobileGame';
import MobileVoting from './components/mobile/MobileVoting';
import MobileResults from './components/mobile/MobileResults';
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
const socket: Socket = io(backendUrl, {
  transports: ['websocket', 'polling']
});

export default function App() {
  const { isMobile } = useIsMobile();
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

  // Keep fresh references for socket events
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;
  const playerAvatarRef = useRef(playerAvatar);
  playerAvatarRef.current = playerAvatar;

  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket connected/reconnected:', socket.id);
      if (roomIdRef.current && playerNameRef.current) {
        socket.emit('join_room', {
          roomId: roomIdRef.current,
          playerName: playerNameRef.current,
          avatar: playerAvatarRef.current
        });
      }
    };

    socket.on('connect', handleConnect);

    socket.on('room_update', (state: GameState) => {
      // Guard: Ensure user is an active participant in this room (by socket.id or playerName)
      const myRefName = playerNameRef.current?.trim().toLowerCase();
      const matched = state.players?.find(
        (p) => p.id === socket.id || (Boolean(myRefName) && p.name.trim().toLowerCase().startsWith(myRefName))
      );
      if (!matched) {
        setGameState(null);
        setRoomId('');
        return;
      }
      // If server tagged name (e.g. "Artista #123"), keep local name in sync
      if (matched.name !== playerNameRef.current) {
        playerNameRef.current = matched.name;
        setPlayerName(matched.name);
      }
      setGameState(state);
      if (typeof state.timer === 'number') {
        setTimer(state.timer);
      }
      setError('');
    });

    socket.on('left_room_success', () => {
      setGameState(null);
      setRoomId('');
      setFloatingChatOpen(false);
      setUnreadChatCount(0);
    });

    socket.on('new_chat_message', (msg: ChatMessage) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const exists = prev.messages?.some((m) => m.id === msg.id);
        if (exists) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), msg]
        };
      });
      if (msg.senderId !== socket.id) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    socket.on('new_tip', (tip: string) => {
      sounds.playPop();
      setGameState((prev) => {
        if (!prev) return prev;
        if (prev.tips?.includes(tip)) return prev;
        return {
          ...prev,
          tips: [...(prev.tips || []), tip]
        };
      });
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
      socket.off('connect', handleConnect);
      socket.off('room_update');
      socket.off('left_room_success');
      socket.off('new_chat_message');
      socket.off('new_tip');
      socket.off('timer_update');
      socket.off('new_reaction');
      socket.off('error');
    };
  }, []);

  const handleJoin = (room: string, name: string, avatar: string) => {
    const cleanRoom = room.trim().toUpperCase();
    const cleanName = name.trim();
    roomIdRef.current = cleanRoom;
    playerNameRef.current = cleanName;
    playerAvatarRef.current = avatar;
    setRoomId(cleanRoom);
    setPlayerName(cleanName);
    setPlayerAvatar(avatar);
    socket.emit('join_room', { roomId: cleanRoom, playerName: cleanName, avatar });
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
      roundTime: roundTime !== undefined ? roundTime : (gameState?.settings?.roundTime ?? 0),
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

  const myPlayer = gameState?.players?.find(
    (p) => p.id === socket.id || (Boolean(playerName) && p.name === playerName)
  );
  const isHost = Boolean(
    myPlayer?.isHost || 
    (gameState?.hostId ? myPlayer?.id === gameState.hostId : (gameState?.players[0]?.id === socket.id || (Boolean(playerName) && gameState?.players[0]?.name === playerName)))
  );

  if (!gameState || !myPlayer) {
    return isMobile ? (
      <MobileLobby onJoin={handleJoin} error={error} />
    ) : (
      <Lobby onJoin={handleJoin} error={error} />
    );
  }

  // Exclusive Layout for Mobile Devices
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] text-zinc-900 flex flex-col font-sans select-none overflow-x-hidden">
        <MobileHeader
          socket={socket}
          gameState={gameState}
          myPlayer={myPlayer}
          playerName={playerName}
          playerAvatar={playerAvatar}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onLeaveRoom={handleLeaveRoom}
        />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
            {gameState.state === 'LOBBY' && (
              <MobileWaitingRoom
                key="mobile-waiting"
                socket={socket}
                gameState={gameState}
                myPlayer={myPlayer}
                isHost={isHost}
                onStartGame={handleStartGame}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {gameState.state === 'PLAYING' && (
              <MobileGame
                key="mobile-game"
                socket={socket}
                gameState={gameState}
                myPlayer={myPlayer}
                timer={timer}
              />
            )}

            {gameState.state === 'VOTING' && (
              <MobileVoting
                key="mobile-voting"
                socket={socket}
                gameState={gameState}
                myPlayer={myPlayer}
                timer={timer}
              />
            )}

            {gameState.state === 'RESULTS' && (
              <MobileResults
                key="mobile-results"
                socket={socket}
                gameState={gameState}
                isHost={isHost}
              />
            )}
          </AnimatePresence>

          {/* Floating Reactions Layer on Mobile */}
          {gameState.state !== 'LOBBY' && (
            <FloatingReactions
              reactions={reactions}
              onSendReaction={handleSendReaction}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-zinc-900 flex flex-col font-sans selection:bg-amber-200 selection:text-zinc-900">
      {/* App Header */}
      <header className="bg-white border-b-2 border-zinc-900 px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2.5 font-sketch shrink-0 select-none">
          <span className="text-xl sm:text-2xl md:text-3xl">✏️</span>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-900 leading-none">
              Desenho Cego
            </h1>
            <div className="text-[10px] sm:text-xs text-zinc-500 font-bold hidden sm:block">
              caderno de rabiscos
            </div>
          </div>
        </div>

        {/* Center Room Code Pill & Round Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={handleCopyCode}
            title="Clique para copiar o código da sala"
            className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-amber-50 border-2 border-zinc-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all text-xs md:text-sm font-mono font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <span className="text-zinc-500 hidden xs:inline font-sketch text-sm">SALA:</span>
            <span className="text-blue-700 tracking-wider font-black">{gameState.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600 shrink-0 stroke-[2.5]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-900 shrink-0" />
            )}
          </button>

          {gameState.state !== 'LOBBY' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-100 border-2 border-zinc-900 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-zinc-900 font-sketch shadow-[2px_2px_0px_#18181b]">
              <span>
                Rodada {gameState.currentRound || 1}
                {gameState.settings?.maxRounds ? `/${gameState.settings.maxRounds}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* WebRTC Live Voice Chat */}
          <VoiceChat
            socket={socket}
            roomId={gameState.id}
            players={gameState.players}
            myPlayer={myPlayer}
            voiceUserIds={gameState.voiceUserIds}
          />

          <button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-zinc-100 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-zinc-800 min-w-[32px] sm:min-w-[36px] flex items-center justify-center"
            title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-green-700" /> : <VolumeX className="w-4 h-4 text-red-600" />}
          </button>

          {/* User profile tag */}
          <div 
            className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]"
            title={playerName || myPlayer?.name}
          >
            <AvatarIcon avatar={myPlayer?.avatar || playerAvatar} className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs md:text-sm font-bold text-zinc-900 max-w-[70px] sm:max-w-[100px] truncate hidden xs:inline font-sketch">
              {playerName || myPlayer?.name}
            </span>
          </div>

          {/* Leave Room Button */}
          <button
            onClick={handleLeaveRoom}
            title="Sair da sala"
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-red-50 hover:text-red-600 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-zinc-700 min-w-[32px] sm:min-w-[36px] flex items-center justify-center"
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
              className="flex-1 p-3 sm:p-6 flex items-center justify-center overflow-y-auto"
            >
              <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Waiting Room Card */}
                <div className="lg:col-span-7 bg-white border-2 border-zinc-900 rounded-2xl p-5 sm:p-7 shadow-[4px_5px_0px_#18181b] relative overflow-hidden text-center sketch-tape">
                  {/* Header */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-3xl">🎪</span>
                    <h2 className="text-2xl md:text-3xl font-black text-zinc-900 font-sketch">Sala de Espera</h2>
                  </div>
                  <p className="text-zinc-600 text-sm font-sketch">
                    Jogue com <strong className="text-zinc-900">2 a 12+ amigos</strong>! Mínimo de 2 para começar.
                  </p>

                  {/* Big Room Code Badge */}
                  <div className="inline-flex items-center gap-2.5 bg-amber-50 border-2 border-zinc-900 px-5 py-2 rounded-xl my-4 shadow-[2px_2px_0px_#18181b]">
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider font-sketch">Código da Sala:</span>
                    <span className="text-2xl font-mono font-black text-blue-700 tracking-widest">{gameState.id}</span>
                    <button
                      onClick={handleCopyCode}
                      title="Copiar código da sala"
                      className="p-1.5 rounded-lg bg-white hover:bg-amber-100 text-zinc-900 border border-zinc-900 transition-all ml-1"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-700 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Simplified Invite Bar */}
                  <div className="mb-5 p-3.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-[2px_2px_0px_#18181b]">
                    <div>
                      <span className="text-sm font-black text-zinc-900 block font-sketch">Convidar Amigos</span>
                      <span className="text-xs text-zinc-500 font-sketch">Envie o link direto para a galera</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleCopyInviteLink}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-100 border-2 border-zinc-900 text-xs font-bold px-3.5 py-2.5 rounded-xl text-zinc-900 transition-all active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_#18181b] font-sketch"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-green-700" /> : <Link2 className="w-4 h-4 text-blue-600" />}
                        <span>{copiedLink ? 'Link Copiado! ✓' : 'Copiar Link'}</span>
                      </button>
                      <button
                        onClick={handleShareWhatsApp}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-zinc-900 text-xs font-black px-4 py-2.5 rounded-xl border-2 border-zinc-900 transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] font-sketch"
                      >
                        <Share2 className="w-4 h-4 stroke-[2.5]" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Host Settings (Sleek Segmented Controls) */}
                  {isHost ? (
                    <div className="mb-5 p-3.5 bg-zinc-50 rounded-xl border-2 border-zinc-900 text-left shadow-[2px_2px_0px_#18181b]">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 mb-2.5 font-sketch">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Regras da Partida (Host)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Round Time */}
                        <div>
                          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">⏱️ Tempo por Rodada:</span>
                          <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900">
                            {[
                              { label: '♾️ Livre', val: 0 },
                              { label: '60s', val: 60 },
                              { label: '90s', val: 90 },
                              { label: '120s', val: 120 },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => handleUpdateSettings(opt.val, undefined)}
                                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                                  (gameState.settings?.roundTime ?? 0) === opt.val
                                    ? 'bg-zinc-900 text-white shadow-sm font-black'
                                    : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Total Rounds */}
                        <div>
                          <span className="text-xs text-zinc-600 font-bold uppercase block mb-1 font-sketch">🏁 Duração do Torneio:</span>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border-2 border-zinc-900">
                            {[
                              { label: '3 Rod.', val: 3 },
                              { label: '5 Rod.', val: 5 },
                              { label: 'Sem Fim', val: 0 },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => handleUpdateSettings(undefined, opt.val)}
                                className={`py-1 rounded-lg text-xs font-bold transition-all font-sketch ${
                                  (gameState.settings?.maxRounds ?? 3) === opt.val
                                    ? 'bg-amber-300 text-zinc-900 shadow-sm font-black'
                                    : 'text-zinc-600 hover:text-zinc-900'
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
                    <div className="mb-5 py-2 px-4 bg-zinc-50 rounded-xl border-2 border-zinc-900 flex items-center justify-around text-xs shadow-[2px_2px_0px_#18181b] font-sketch">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <span>⏱️ Tempo:</span>
                        <span className="font-bold text-zinc-900">
                          {(gameState.settings?.roundTime ?? 0) === 0 ? 'Sem Limite (♾️)' : `${gameState.settings?.roundTime}s`}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-zinc-300" />
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <span>🏁 Torneio:</span>
                        <span className="font-bold text-zinc-900">
                          {gameState.settings?.maxRounds ? `${gameState.settings.maxRounds} Rodadas` : 'Sem Limite'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Player list grid */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2.5 px-1 font-sketch">
                      <span>Amigos Conectados</span>
                      <span className="bg-amber-100 border border-zinc-900 text-zinc-900 px-2.5 py-0.5 rounded-full font-bold">
                        {gameState.players.length} {gameState.players.length === 1 ? 'amigo' : 'amigos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {gameState.players.map((p) => {
                        const isMe = p.id === socket.id;
                        const isPlayerHost = Boolean(p.isHost || (gameState.hostId ? p.id === gameState.hostId : false));
                        return (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-zinc-900 transition-all font-sketch shadow-[2px_2px_0px_#18181b] ${
                              isMe 
                                ? 'bg-amber-100' 
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <AvatarIcon avatar={p.avatar} className="w-8 h-8 sm:w-9 sm:h-9" />
                              <span className="font-bold text-base text-zinc-900 truncate font-kalam">
                                {p.name} {isMe && <span className="text-blue-700 text-xs font-sketch">(Você)</span>}
                              </span>
                            </div>

                            {isPlayerHost && (
                              <span title="Criador da sala" className="flex items-center gap-1 text-xs font-bold text-zinc-900 bg-amber-300 px-2 py-0.5 rounded-lg border border-zinc-900">
                                <Crown className="w-3 h-3" /> Host
                              </span>
                            )}
                          </motion.div>
                        );
                      })}

                      {/* Dotted placeholder if only 1 player */}
                      {gameState.players.length < 2 && (
                        <div className="flex items-center justify-center p-3 rounded-xl border-2 border-dashed border-zinc-400 text-zinc-500 text-xs font-semibold gap-2 font-sketch">
                          <span className="animate-pulse">⏳</span>
                          <span>Esperando mais 1 amigo entrar...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start Game button (Host Only) vs Waiting for Host (Non-Hosts) */}
                  {isHost ? (
                    <button
                      onClick={handleStartGame}
                      disabled={gameState.players.length < 2}
                      className="w-full btn-arcade-gold py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xl tracking-wide disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      {gameState.players.length < 2
                        ? 'Aguardando mais 1 jogador (Mín. 2)'
                        : `Começar Partida! (${gameState.players.length} jogadores)`}
                    </button>
                  ) : (
                    <div className="w-full bg-amber-50 border-2 border-zinc-900 p-4 rounded-xl flex items-center justify-center gap-2.5 text-center text-base font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b] font-sketch">
                      <span className="text-xl animate-bounce">👑</span>
                      <span>
                        Aguardando o Host ({gameState.players.find(p => p.isHost || p.id === gameState.hostId)?.name || 'Host'}) iniciar a partida...
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Column: Waiting Room Chat */}
                <div className="lg:col-span-5 bg-white border-2 border-zinc-900 rounded-2xl overflow-hidden shadow-[4px_5px_0px_#18181b] h-[360px] sm:h-[460px] lg:h-[600px] flex flex-col">
                  <PartyChat
                    socket={socket}
                    roomId={gameState.id}
                    messages={gameState.messages}
                    myPlayer={myPlayer}
                    isMaster={false}
                    isHost={isHost}
                    isChatMuted={Boolean(gameState.isChatMuted)}
                  />
                </div>
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
            <div className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-40">
              <button
                type="button"
                onClick={toggleFloatingChat}
                className="relative flex items-center gap-1.5 sm:gap-2 bg-panel/95 hover:bg-panel border border-border/90 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-white text-xs font-bold shadow-2xl backdrop-blur transition-all active:scale-95 group hover:border-accent-cyan/50"
              >
                <MessageCircle className="w-4 h-4 text-accent-cyan group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden xs:inline">Chat da Sala</span>
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
                  className="fixed bottom-14 sm:bottom-16 left-2 sm:left-4 z-50 w-[calc(100vw-1rem)] sm:w-96 max-w-sm h-[380px] max-h-[65vh] shadow-2xl rounded-3xl overflow-hidden border border-border/90 bg-panel/98 backdrop-blur"
                >
                  <PartyChat
                    socket={socket}
                    roomId={gameState.id}
                    messages={gameState.messages}
                    myPlayer={myPlayer}
                    isMaster={Boolean(myPlayer?.isMaster)}
                    isHost={isHost}
                    isChatMuted={Boolean(gameState.isChatMuted)}
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
