import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Voting from './components/Voting';
import Results from './components/Results';
import FloatingReactions from './components/common/FloatingReactions';
import PartyChat from './components/common/PartyChat';
import VoiceChat from './components/common/VoiceChat';
import WebHeader from './components/web/WebHeader';
import WebWaitingRoom from './components/web/WebWaitingRoom';
import { useIsMobile } from './hooks/useIsMobile';
import MobileHeader from './components/mobile/MobileHeader';
import MobileLobby from './components/mobile/MobileLobby';
import MobileWaitingRoom from './components/mobile/MobileWaitingRoom';
import MobileGame from './components/mobile/MobileGame';
import MobileVoting from './components/mobile/MobileVoting';
import MobileResults from './components/mobile/MobileResults';
import type { GameState, ReactionItem, ChatMessage } from './types';
import { sounds } from './utils/audioFx';
import { socket } from './socket/client';

export default function App() {
  const { isMobile } = useIsMobile();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('🎨');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);
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

    socket.on('chat_cleared', () => {
      setGameState((prev) => (prev ? { ...prev, messages: [] } : prev));
      setUnreadChatCount(0);
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
      setReactions((prev) => [...prev.slice(-11), r]);
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
      socket.off('chat_cleared');
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

  const handleUpdateSettings = (roundTime?: number, maxRounds?: number, voiceEnabled?: boolean, reactionsEnabled?: boolean) => {
    sounds.playClick();
    socket.emit('update_settings', {
      roomId: gameState?.id,
      roundTime: roundTime !== undefined ? roundTime : (gameState?.settings?.roundTime ?? 0),
      maxRounds: maxRounds !== undefined ? maxRounds : (gameState?.settings?.maxRounds ?? 3),
      voiceEnabled: voiceEnabled !== undefined ? voiceEnabled : (gameState?.settings?.voiceEnabled ?? false),
      reactionsEnabled: reactionsEnabled !== undefined ? reactionsEnabled : (gameState?.settings?.reactionsEnabled ?? true)
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

          {/* Reactions no mobile: esconder no LOBBY e no PLAYING para não cobrir dock de desenho/chat */}
          {(gameState.state === 'VOTING' || gameState.state === 'RESULTS') && !gameState.isReactionsDisabled && (
            <FloatingReactions
              reactions={reactions}
              onSendReaction={handleSendReaction}
              isMobile={true}
              disabled={Boolean(gameState.isReactionsDisabled)}
            />
          )}

          {/* Voz flutuante global — fora do header */}
          <VoiceChat
            socket={socket}
            roomId={gameState.id}
            players={gameState.players}
            myPlayer={myPlayer}
            voiceUserIds={gameState.voiceUserIds}
            isVoiceDisabled={Boolean(gameState.isVoiceDisabled || gameState.settings?.voiceEnabled === false)}
            isHost={isHost}
            variant="fab"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-zinc-900 flex flex-col font-sans selection:bg-amber-200 selection:text-zinc-900">
      <WebHeader
        gameState={gameState}
        myPlayer={myPlayer}
        playerName={playerName}
        playerAvatar={playerAvatar}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onLeaveRoom={handleLeaveRoom}
        onCopyCode={handleCopyCode}
        copied={copied}
      />

      {/* Main Content Area — desktop usa componentes web exclusivos */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {gameState.state === 'LOBBY' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <WebWaitingRoom
                socket={socket}
                gameState={gameState}
                myPlayer={myPlayer}
                isHost={isHost}
                onStartGame={handleStartGame}
                onUpdateSettings={handleUpdateSettings}
              />
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
        {gameState.state !== 'LOBBY' && !gameState.isReactionsDisabled && (
          <FloatingReactions 
            reactions={reactions} 
            onSendReaction={handleSendReaction}
            disabled={Boolean(gameState.isReactionsDisabled)}
          />
        )}

        {/* Voz flutuante global — fora do header */}
        <VoiceChat
          socket={socket}
          roomId={gameState.id}
          players={gameState.players}
          myPlayer={myPlayer}
          voiceUserIds={gameState.voiceUserIds}
          isVoiceDisabled={Boolean(gameState.isVoiceDisabled || gameState.settings?.voiceEnabled === false)}
          isHost={isHost}
          variant="fab"
        />

        {/* Floating Chat Button & Drawer during Voting and Results */}
        {(gameState.state === 'VOTING' || gameState.state === 'RESULTS') && (
          <>
            <div className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-40">
              <button
                type="button"
                onClick={toggleFloatingChat}
                className="relative flex items-center gap-1.5 sm:gap-2 bg-amber-50/95 hover:bg-amber-100 border-2 border-zinc-900 px-3 py-2 sm:px-4 sm:py-2 rounded-2xl text-zinc-900 text-xs font-bold shadow-[3px_3px_0px_#18181b] backdrop-blur transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-sketch"
              >
                <MessageCircle className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden xs:inline">Chat da Sala</span>
                {unreadChatCount > 0 && (
                  <span className="bg-rose-500 border border-zinc-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-sm">
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
