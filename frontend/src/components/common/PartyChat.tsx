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
    <div className={`flex flex-col h-full bg-white font-sketch ${compact ? 'border-2 border-zinc-900 rounded-2xl shadow-[4px_4px_0px_#18181b] overflow-hidden' : ''}`}>
      {/* Header */}
      <div className="p-3 bg-zinc-100 border-b-2 border-zinc-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-zinc-900" />
          <h3 className="font-bold text-sm text-zinc-900 font-kalam">Chat da Sala ✏️</h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-200 border border-zinc-900 text-zinc-900 shadow-[1px_1px_0px_#18181b]">
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
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:scale-95 ${
                isChatMuted 
                  ? 'bg-rose-200 hover:bg-rose-300 text-rose-950 animate-pulse' 
                  : 'bg-white hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              {isChatMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-700" />
                  <span>Reativar Chat</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Silenciar Sala</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg border-2 border-zinc-900 bg-white hover:bg-zinc-100 text-zinc-800 shadow-[1px_1px_0px_#18181b] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mute Notification Banner */}
      {isChatMuted && (
        <div className="px-3 py-1.5 bg-rose-100 border-b-2 border-zinc-900 flex items-center justify-between text-xs text-rose-950 font-bold shrink-0">
          <span className="flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-rose-700 shrink-0" />
            <span>Chat silenciado pelo Host{isHost ? ' (você pode digitar)' : ''}</span>
          </span>
          {isHost && (
            <button 
              type="button"
              onClick={handleToggleMute}
              className="text-xs bg-rose-300 hover:bg-rose-400 border border-zinc-900 text-rose-950 font-bold px-2 py-0.5 rounded-md shadow-[1px_1px_0px_#18181b] transition-colors"
            >
              Reativar
            </button>
          )}
        </div>
      )}

      {/* Messages stream */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px] text-xs bg-white"
      >
        {localMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-6">
            <span className="text-2xl mb-1">💬</span>
            <p className="font-bold text-sm font-kalam text-zinc-700">O chat está pronto!</p>
            <p className="text-xs">Mande uma mensagem ou uma dica visual.</p>
          </div>
        ) : (
          localMessages.map((msg) => {
            const isMe = msg.senderId === socket.id || msg.senderId === 'me' || (Boolean(myPlayer?.name) && msg.senderName === myPlayer?.name);

            // System Message
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <span className="bg-zinc-100 border border-zinc-400 text-zinc-700 text-xs px-3 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1.5">
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
                  className="p-2.5 bg-yellow-100 border-2 border-zinc-900 rounded-xl shadow-[3px_3px_0px_#18181b] text-zinc-900 my-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 font-kalam uppercase tracking-wider mb-0.5">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                    <span>Dica Oficial do Mestre</span>
                  </div>
                  <p className="font-bold text-xs text-zinc-900 leading-snug">{msg.text}</p>
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
                      className="absolute -bottom-1 -right-1 text-[8px] bg-yellow-300 border border-zinc-900 text-zinc-900 font-bold rounded-full px-0.5 leading-tight shadow-sm"
                    >
                      👑
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ${
                    isMe
                      ? isHostSender
                        ? 'bg-yellow-200 text-zinc-950 rounded-tr-none'
                        : 'bg-blue-100 text-zinc-950 rounded-tr-none'
                      : isHostSender
                      ? 'bg-yellow-100 text-zinc-950 rounded-tl-none'
                      : 'bg-zinc-100 text-zinc-950 rounded-tl-none'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-bold mb-0.5 font-kalam ${
                    isMe ? 'text-zinc-800' : isHostSender ? 'text-amber-900' : 'text-blue-900'
                  }`}>
                    <span className="truncate">{msg.senderName}</span>
                    {isHostSender && (
                      <span className="bg-yellow-300 border border-zinc-900 text-zinc-900 text-[9px] font-bold px-1 rounded uppercase tracking-wider font-sketch">
                        HOST
                      </span>
                    )}
                    {msg.isMaster && !isHostSender && (
                      <span title="Mestre da rodada" className="text-amber-800 text-[10px] font-bold">👑 Mestre</span>
                    )}
                    {isMe && <span className="opacity-60 text-[10px] font-sketch">(Você)</span>}
                  </div>
                  <p className="text-xs break-words leading-relaxed font-sketch">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reaction Emojis */}
      <div className="px-3 py-1.5 bg-zinc-50 border-t-2 border-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-xs text-zinc-700 font-bold mr-1 shrink-0 font-sketch">Reagir:</span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={!isHost && isChatMuted}
            onClick={() => handleQuickEmoji(emoji)}
            className="hover:scale-125 transition-transform text-base sm:text-sm p-1.5 rounded-lg border border-transparent hover:border-zinc-900 hover:bg-zinc-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
            title={`Enviar ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Master Toggle: Send as Tip or Chat */}
      {isMaster && (
        <div className="px-3 py-1 bg-yellow-100 border-t-2 border-zinc-900 flex items-center justify-between text-xs">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1 font-kalam">
            <Crown className="w-3.5 h-3.5" /> Modo Mestre:
          </span>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border-2 border-zinc-900">
            <button
              type="button"
              onClick={() => setSendAsTip(true)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                sendAsTip ? 'bg-yellow-300 text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              💡 Dica Oficial
            </button>
            <button
              type="button"
              onClick={() => setSendAsTip(false)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                !sendAsTip ? 'bg-zinc-200 text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              💬 Chat Normal
            </button>
          </div>
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-2 sm:p-2.5 bg-zinc-100 border-t-2 border-zinc-900 flex items-center gap-2">
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
              : 'Digite sua mensagem...'
          }
          maxLength={150}
          className="flex-1 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 font-sketch focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
        />
        <button
          type="submit"
          disabled={(!isHost && isChatMuted) || !inputText.trim()}
          className={`p-2.5 sm:p-2 rounded-xl font-bold border-2 border-zinc-900 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0 ${
            isMaster && sendAsTip
              ? 'bg-yellow-300 hover:bg-yellow-400 text-zinc-900 shadow-[2px_2px_0px_#18181b]'
              : 'bg-yellow-300 hover:bg-yellow-400 text-zinc-900 shadow-[2px_2px_0px_#18181b]'
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
