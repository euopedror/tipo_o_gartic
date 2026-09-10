import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Send, Crown, Sparkles, MessageCircle, X, Volume2, VolumeX } from 'lucide-react';
import type { ChatMessage, Player } from '../../types';
import { sounds } from '../../utils/audioFx';

interface PartyChatProps {
  socket: Socket;
  roomId: string;
  messages?: ChatMessage[];
  myPlayer?: Player;
  isMaster?: boolean;
  isHost?: boolean;
  isChatMuted?: boolean;
  compact?: boolean;
  onClose?: () => void;
}

const QUICK_EMOJIS = ['😂', '🎨', '🔥', '👏', '👀', '🤔', '😱'];

export default function PartyChat({
  socket,
  roomId,
  messages = [],
  myPlayer,
  isMaster = false,
  isHost = false,
  isChatMuted = false,
  compact = false,
  onClose
}: PartyChatProps) {
  const [inputText, setInputText] = useState('');
  const [sendAsTip, setSendAsTip] = useState(isMaster);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => messages);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync external messages without wiping local additions
  useEffect(() => {
    if (messages && messages.length > 0) {
      setLocalMessages((prev) => {
        const map = new Map<string, ChatMessage>();
        prev.forEach((m) => map.set(m.id, m));
        messages.forEach((m) => {
          // Replace matching optimistic local message if present
          for (const [key, val] of map.entries()) {
            if (key.startsWith('local-') && val.text === m.text && (val.senderName === m.senderName || val.senderId === m.senderId)) {
              map.delete(key);
            }
          }
          map.set(m.id, m);
        });
        return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [messages]);

  // Listen to new_chat_message and new_tip in real time
  useEffect(() => {
    const handleNewMessage = (msg: ChatMessage) => {
      setLocalMessages((prev) => {
        // Replace matching optimistic local message if present
        const hasMatchingLocal = prev.some(
          (m) => m.id.startsWith('local-') && m.text === msg.text && (m.senderName === msg.senderName || m.senderId === msg.senderId)
        );
        if (hasMatchingLocal) {
          return prev.map((m) =>
            m.id.startsWith('local-') && m.text === msg.text && (m.senderName === msg.senderName || m.senderId === msg.senderId)
              ? msg
              : m
          );
        }
        if (prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });

      const isMyMessage = msg.senderId === socket.id || (Boolean(myPlayer?.name) && msg.senderName === myPlayer?.name);
      if (!isMyMessage) {
        sounds.playPop();
      }
    };

    socket.on('new_chat_message', handleNewMessage);

    return () => {
      socket.off('new_chat_message', handleNewMessage);
    };
  }, [socket, myPlayer?.name]);

  // Auto-scroll on new message
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [localMessages.length]);

  const handleToggleMute = () => {
    sounds.playPop();
    socket.emit('toggle_chat_mute', { roomId });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isHost && isChatMuted) return;

    const text = inputText.trim();
    if (!text) return;

    const senderName = myPlayer?.name || 'Você';
    const senderAvatar = myPlayer?.avatar || '🎨';

    if (isMaster && sendAsTip) {
      // Send as official tip
      sounds.playPop();
      const tipMsg: ChatMessage = {
        id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        senderId: socket.id || 'me',
        senderName: senderName,
        senderAvatar: '👑',
        text: text,
        isMaster: true,
        isHost: Boolean(isHost),
        isTip: true,
        timestamp: Date.now()
      };
      setLocalMessages((prev) => [...prev, tipMsg]);
      socket.emit('send_tip', { roomId, tip: text });
    } else {
      // Normal chat message
      sounds.playClick();
      const chatMsg: ChatMessage = {
        id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        senderId: socket.id || 'me',
        senderName: senderName,
        senderAvatar: senderAvatar,
        text: text,
        isMaster: Boolean(isMaster),
        isHost: Boolean(isHost),
        isTip: false,
        timestamp: Date.now()
      };
      setLocalMessages((prev) => [...prev, chatMsg]);
      socket.emit('send_chat_message', { 
        roomId, 
        text, 
        playerName: senderName, 
        avatar: senderAvatar 
      });
    }

    setInputText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    if (!isHost && isChatMuted) return;
    sounds.playPop();
    const senderName = myPlayer?.name || 'Você';
    const senderAvatar = myPlayer?.avatar || '🎨';
    const chatMsg: ChatMessage = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      senderId: socket.id || 'me',
      senderName: senderName,
      senderAvatar: senderAvatar,
      text: emoji,
      isMaster: Boolean(isMaster),
      isHost: Boolean(isHost),
      isTip: false,
      timestamp: Date.now()
    };
    setLocalMessages((prev) => [...prev, chatMsg]);
    socket.emit('send_chat_message', { 
      roomId, 
      text: emoji, 
      playerName: senderName, 
      avatar: senderAvatar 
    });
  };

  return (
    <div className={`flex flex-col h-full bg-panel ${compact ? 'border border-border/80 rounded-2xl shadow-2xl overflow-hidden' : ''}`}>
      {/* Header */}
      <div className="p-3 bg-black/40 border-b border-border/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent-cyan" />
          <h3 className="font-bold text-xs md:text-sm text-white font-display">Chat da Sala</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
            {localMessages.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Host Mute/Unmute Control */}
          {isHost && (
            <button
              type="button"
              onClick={handleToggleMute}
              title={isChatMuted ? 'Liberar chat para todos os jogadores' : 'Silenciar chat para não-hosts'}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 border shadow-sm active:scale-95 ${
                isChatMuted 
                  ? 'bg-red-500/25 hover:bg-red-500/35 text-red-200 border-red-500/50 animate-pulse' 
                  : 'bg-panel-light hover:bg-border text-text-muted hover:text-white border-border/80'
              }`}
            >
              {isChatMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  <span>Reativar Chat</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Silenciar Sala</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-panel-light text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mute Notification Banner */}
      {isChatMuted && (
        <div className="px-3 py-1.5 bg-red-500/20 border-b border-red-500/40 flex items-center justify-between text-[11px] text-red-300 font-bold shrink-0">
          <span className="flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Chat silenciado pelo Host{isHost ? ' (você pode digitar)' : ''}</span>
          </span>
          {isHost && (
            <button 
              type="button"
              onClick={handleToggleMute}
              className="text-[10px] bg-red-500/30 hover:bg-red-500/50 text-white font-black px-2 py-0.5 rounded-md transition-colors"
            >
              Reativar
            </button>
          )}
        </div>
      )}

      {/* Messages stream */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px] text-xs"
      >
        {localMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted py-6">
            <span className="text-2xl mb-1">💬</span>
            <p className="font-semibold text-xs">O chat está pronto!</p>
            <p className="text-[11px] opacity-70">Mande uma mensagem ou uma dica visual.</p>
          </div>
        ) : (
          localMessages.map((msg) => {
            const isMe = msg.senderId === socket.id || msg.senderId === 'me' || (Boolean(myPlayer?.name) && msg.senderName === myPlayer?.name);

            // System Message
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <span className="bg-black/40 border border-border/50 text-text-muted text-[11px] px-3 py-1 rounded-full font-medium shadow-inner flex items-center gap-1.5">
                    <span>{msg.senderAvatar || 'ℹ️'}</span>
                    <span>{msg.text}</span>
                  </span>
                </div>
              );
            }

            // Official Tip Message
            if (msg.isTip) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-accent-yellow/60 rounded-2xl shadow-md text-white my-1"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-yellow uppercase tracking-wider mb-1">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                    <span>Dica Oficial do Mestre</span>
                  </div>
                  <p className="font-semibold text-xs text-amber-100">{msg.text}</p>
                </motion.div>
              );
            }

            // Regular or Host Message
            const isHostSender = Boolean(msg.isHost);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 select-none">
                  <span className="text-base">{msg.senderAvatar || '🎨'}</span>
                  {isHostSender && (
                    <span 
                      title="Host da Sala" 
                      className="absolute -bottom-1 -right-1 text-[8px] bg-amber-400 text-black font-black rounded-full px-0.5 leading-tight shadow-sm"
                    >
                      👑
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isMe
                      ? isHostSender
                        ? 'bg-gradient-to-r from-violet-600 via-primary to-amber-600 text-white rounded-tr-sm shadow-md border border-amber-400/30'
                        : 'bg-primary text-white rounded-tr-sm shadow-md'
                      : isHostSender
                      ? 'bg-gradient-to-r from-amber-500/20 via-black/60 to-purple-500/20 border-2 border-amber-400/60 text-slate-100 rounded-tl-sm shadow-md'
                      : 'bg-black/40 border border-border/70 text-slate-100 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold mb-0.5 ${
                    isMe ? 'text-violet-200' : isHostSender ? 'text-amber-300' : 'text-accent-cyan'
                  }`}>
                    <span className="truncate">{msg.senderName}</span>
                    {isHostSender && (
                      <span className="bg-amber-400/25 border border-amber-400/50 text-amber-300 text-[8px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                    {msg.isMaster && !isHostSender && (
                      <span title="Mestre da rodada" className="text-accent-yellow text-[9px] font-black">👑 Mestre</span>
                    )}
                    {isMe && <span className="opacity-70">(Você)</span>}
                  </div>
                  <p className="text-xs break-words leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reaction Emojis */}
      <div className="px-3 py-1 bg-black/20 border-t border-border/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-text-muted font-bold mr-1 shrink-0">Reagir:</span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={!isHost && isChatMuted}
            onClick={() => handleQuickEmoji(emoji)}
            className="hover:scale-125 transition-transform text-sm p-1 rounded-md hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            title={`Enviar ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Master Toggle: Send as Tip or Chat */}
      {isMaster && (
        <div className="px-3 py-1 bg-accent-yellow/10 border-t border-accent-yellow/20 flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-accent-yellow flex items-center gap-1">
            <Crown className="w-3 h-3" /> Modo Mestre:
          </span>
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setSendAsTip(true)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                sendAsTip ? 'bg-accent-yellow text-black font-black' : 'text-text-muted hover:text-white'
              }`}
            >
              💡 Dica Oficial
            </button>
            <button
              type="button"
              onClick={() => setSendAsTip(false)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                !sendAsTip ? 'bg-primary text-white font-black' : 'text-text-muted hover:text-white'
              }`}
            >
              💬 Chat Normal
            </button>
          </div>
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-black/40 border-t border-border/80 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          disabled={!isHost && isChatMuted}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            !isHost && isChatMuted
              ? '🔇 Chat silenciado pelo Host...'
              : isMaster && sendAsTip
              ? 'Digite uma dica visual clara...'
              : 'Digite sua mensagem no chat...'
          }
          maxLength={150}
          className="flex-1 bg-bg-dark border border-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={(!isHost && isChatMuted) || !inputText.trim()}
          className={`p-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
            isMaster && sendAsTip
              ? 'bg-accent-yellow hover:bg-yellow-400 text-black shadow-md'
              : 'bg-primary hover:bg-primary-hover text-white shadow-md'
          }`}
          title={isMaster && sendAsTip ? 'Enviar como Dica Oficial' : 'Enviar Mensagem'}
        >
          {isMaster && sendAsTip ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
