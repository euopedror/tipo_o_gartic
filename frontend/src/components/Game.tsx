import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Send, Crown, Eraser, Paintbrush, 
  Trash2, CheckCircle2, Lightbulb, RefreshCw, Check, MessageCircle, Sparkles,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import type { GameState, Player } from '../types';
import { sounds } from '../utils/audioFx';
import { getRandomIdea } from '../utils/characterIdeas';
import type { CharacterIdea } from '../utils/characterIdeas';
import PartyChat from './common/PartyChat';

interface GameProps {
  socket: Socket;
  gameState: GameState;
  myPlayer?: Player;
  timer: number;
}

const COLOR_PALETTE = [
  '#18181b', // Preto / Nanquim
  '#2563eb', // Azul Caneta Bic
  '#dc2626', // Vermelho Correção
  '#16a34a', // Verde Canetinha
  '#f59e0b', // Amarelo
  '#ea580c', // Laranja
  '#7c3aed', // Roxo
  '#db2777', // Rosa
  '#78350f', // Marrom Madeira
  '#475569', // Grafite Lápis
  '#fde047', // Marca-texto
  '#ffffff', // Branco Corretivo
];

export default function Game({ socket, gameState, myPlayer, timer }: GameProps) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'tips'>('chat');
  const isMaster = myPlayer?.isMaster;
  const artists = gameState.players.filter(p => !p.isMaster);
  const submittedCount = artists.filter(p => p.hasSubmitted).length;

  return (
    <div className="flex-1 flex flex-col md:flex-row p-2 sm:p-3 md:p-6 gap-2 sm:gap-4 bg-[#f8f7f2] overflow-hidden">
      {/* Sidebar desktop — Game.tsx agora é SÓ desktop. Mobile usa MobileGame.tsx */}
      <div className="flex w-full md:w-88 flex-col gap-3 shrink-0 h-full md:h-full max-h-full min-h-0 overflow-hidden">
        {/* Desktop Timer Card */}
        <div className="flex bg-white rounded-2xl p-4 md:p-5 border-2 border-zinc-900 shadow-[4px_5px_0px_#18181b] items-center justify-between gap-2 font-sketch shrink-0">
          <div className="flex items-center gap-3">
            {timer > 0 ? (
              <>
                <div className={`p-2.5 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ${timer <= 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-zinc-900'}`}>
                  <Clock className={`w-5 h-5 ${timer <= 20 ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-500">Tempo Restante</span>
                  <div className={`text-3xl font-mono font-black ${timer <= 20 ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>
                    {timer}s
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-green-100 text-green-800 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]">
                  <span className="text-2xl leading-none">♾️</span>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-green-800">Sem Pressa</span>
                  <div className="text-base font-black text-zinc-900">
                    Tempo Livre
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500">Entregas</span>
            <div className="text-base font-bold text-zinc-900 font-mono">
              {submittedCount} / {artists.length}
            </div>
            {isMaster && (
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  if (window.confirm('Deseja encerrar o tempo de desenho e abrir a votação agora?')) {
                    socket.emit('finish_round_early', { roomId: gameState.id });
                  }
                }}
                title="Avançar imediatamente para a votação"
                className="bg-amber-300 hover:bg-amber-400 border-2 border-zinc-900 text-zinc-900 px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_#18181b]"
              >
                🏁 Ir p/ Voto
              </button>
            )}
          </div>
        </div>

        {/* Chat / Tips Feed */}
        <div className="flex-1 min-h-0 max-h-full bg-white rounded-2xl border-2 border-zinc-900 flex flex-col overflow-hidden shadow-[4px_5px_0px_#18181b]">
          {/* Tab Switcher (Desktop) */}
          <div className="flex p-2 border-b-2 border-zinc-900 bg-zinc-50 items-center justify-between font-sketch shrink-0">
            <div className="flex items-center gap-1 bg-zinc-200 p-1 rounded-xl border border-zinc-400 w-full">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveSidebarTab('chat');
                }}
                className={`flex-1 py-1 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSidebarTab === 'chat'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-400'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Chat & Dicas</span>
                <span className="text-[10px] bg-zinc-100 border border-zinc-400 px-1.5 py-0.5 rounded-full font-bold">
                  {gameState.messages?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveSidebarTab('tips');
                }}
                className={`flex-1 py-1 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSidebarTab === 'tips'
                    ? 'bg-amber-300 text-zinc-900 font-bold shadow-sm border border-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Só Dicas</span>
                <span className="text-[10px] bg-amber-200 border border-zinc-900 px-1.5 py-0.5 rounded-full font-bold">
                  {gameState.tips.length}
                </span>
              </button>
            </div>
          </div>

          {/* Chat or Tips display — desktop usa activeSidebarTab */}
          {activeSidebarTab === 'chat' ? (
            <div className="flex-1 min-h-0 h-full max-h-full overflow-hidden">
              <PartyChat
                socket={socket}
                roomId={gameState.id}
                messages={gameState.messages}
                myPlayer={myPlayer}
                isMaster={Boolean(isMaster)}
                isHost={Boolean(myPlayer?.isHost || myPlayer?.id === gameState.hostId)}
                isChatMuted={Boolean(gameState.isChatMuted)}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 h-full max-h-full flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-chat-scrollbar">
                {gameState.tips.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs p-4">
                    <span className="text-3xl mb-2">👂</span>
                    <p className="font-bold text-sm text-zinc-800 font-kalam">O Mestre está preparando a primeira dica...</p>
                    <p className="text-xs text-zinc-500 mt-1">Fique de olho aqui!</p>
                  </div>
                ) : (
                  gameState.tips.map((tip, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      className="bg-yellow-100/90 border-2 border-zinc-900 p-3 rounded-2xl shadow-[2px_2px_0px_#18181b] relative"
                    >
                      <div className="text-xs text-amber-900 font-black uppercase tracking-wider mb-1 flex items-center gap-1 font-kalam">
                        <span>👑 Mestre</span>
                        <span className="text-zinc-600 font-sketch">• Dica #{idx + 1}</span>
                      </div>
                      <p className="font-bold text-sm text-zinc-900 font-kalam leading-relaxed">{tip}</p>
                    </motion.div>
                  ))
                )}
              </div>

              {isMaster && (
                <MasterTipInput socket={socket} roomId={gameState.id} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas / Master Center Area — desktop lado a lado */}
      <div className="flex flex-1 bg-panel rounded-2xl sm:rounded-3xl border border-border overflow-hidden relative shadow-2xl flex-col min-h-[360px] md:min-h-[420px]">
        {isMaster ? (
          <MasterDashboard 
            socket={socket} 
            roomId={gameState.id} 
            submittedCount={submittedCount} 
            totalArtists={artists.length} 
            tips={gameState.tips}
          />
        ) : (
          <DrawingBoard 
            socket={socket} 
            roomId={gameState.id} 
            myPlayer={myPlayer} 
            tips={gameState.tips}
            timer={timer}
          />
        )}
      </div>
    </div>
  );
}

function MasterTipInput({ socket, roomId }: { socket: Socket; roomId: string }) {
  const [tip, setTip] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (tip.trim()) {
      sounds.playPop();
      socket.emit('send_tip', { roomId, tip: tip.trim() });
      setTip('');
    }
  };

  return (
    <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-border flex gap-2">
      <input
        type="text"
        value={tip}
        onChange={(e) => setTip(e.target.value)}
        className="flex-1 bg-bg-dark border border-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
        placeholder="Digite uma dica visual clara..."
        maxLength={100}
      />
      <button
        type="submit"
        disabled={!tip.trim()}
        className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-bold p-2.5 rounded-xl transition-all active:scale-95"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}

function MasterDashboard({ 
  socket, 
  roomId, 
  submittedCount, 
  totalArtists,
  tips = []
}: { 
  socket: Socket; 
  roomId: string; 
  submittedCount: number; 
  totalArtists: number; 
  tips?: string[];
}) {
  const [currentIdea, setCurrentIdea] = useState<CharacterIdea>(() => getRandomIdea());
  const [customWord, setCustomWord] = useState('');
  const [manualTip, setManualTip] = useState('');

  const handleShuffle = () => {
    sounds.playPop();
    setCurrentIdea(getRandomIdea());
  };

  const handleUseIdea = (idea: CharacterIdea) => {
    sounds.playClick();
    socket.emit('set_character', { roomId, character: idea.name });
  };

  const handleSendStarterTip = (tip: string) => {
    sounds.playPop();
    socket.emit('send_tip', { roomId, tip });
  };

  const handleSendManualTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTip.trim()) {
      sounds.playPop();
      socket.emit('send_tip', { roomId, tip: manualTip.trim() });
      setManualTip('');
    }
  };

  const handleSetCustomWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (customWord.trim()) {
      sounds.playClick();
      socket.emit('set_character', { roomId, character: customWord.trim() });
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col justify-between overflow-y-auto bg-[#f8f7f2]">
      {/* Top Banner */}
      <div className="text-center max-w-xl mx-auto select-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border-2 border-zinc-900 text-zinc-900 font-sketch font-bold text-xs uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#18181b]">
          <Crown className="w-4 h-4 text-amber-600" />
          Você é o Mestre da Rodada!
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 font-sketch">
          Comande o Jogo & Descreva ✏️
        </h2>
        <p className="text-zinc-600 text-xs md:text-sm mt-0.5 font-sketch">
          Os outros jogadores só podem desenhar com base nas suas palavras.
        </p>

        <div className="mt-3 p-3 bg-red-50 border-2 border-red-600 rounded-xl text-red-800 text-xs font-sketch font-bold shadow-[2px_2px_0px_#18181b]">
          🚨 <strong className="text-red-900">REGRA DE OURO:</strong> Nunca diga o nome nem de onde ele vem! Foque em formas, cores e detalhes.
        </div>
      </div>

      {/* Idea Cards / Suggestion Box */}
      <div className="my-4 max-w-xl mx-auto w-full bg-white border-2 border-zinc-900 rounded-2xl p-4 sm:p-5 shadow-[4px_5px_0px_#18181b] font-sketch">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Sugestão de Personagem</span>
          </div>

          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 text-xs text-zinc-800 hover:text-black bg-zinc-50 hover:bg-amber-50 px-3 py-1.5 rounded-lg border-2 border-zinc-900 shadow-[1px_1px_0px_#18181b] transition-all font-bold active:translate-x-[1px] active:translate-y-[1px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sortear Outro
          </button>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{currentIdea.category}</span>
            <h4 className="text-2xl font-black text-zinc-900">{currentIdea.name}</h4>
          </div>
          <button
            onClick={() => handleUseIdea(currentIdea)}
            className="btn-arcade-gold text-zinc-900 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Definir Segredo 🔒
          </button>
        </div>

        {/* Quick Tips helper */}
        <div className="mt-4">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider block mb-2">
            Ideias de Dicas para clicar e enviar:
          </span>
          <div className="flex flex-wrap gap-2">
            {currentIdea.starterTips.map((tip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendStarterTip(tip)}
                className="text-xs bg-white hover:bg-amber-100 text-zinc-900 border-2 border-zinc-900 px-3 py-1.5 rounded-lg shadow-[1px_2px_0px_#18181b] transition-all text-left font-bold active:translate-x-[1px] active:translate-y-[1px]"
              >
                + "{tip}"
              </button>
            ))}
          </div>
        </div>

        {/* Manual Custom Tip Input */}
        <form onSubmit={handleSendManualTip} className="mt-4 pt-3 border-t-2 border-zinc-200 flex items-center gap-2">
          <input
            type="text"
            value={manualTip}
            onChange={(e) => setManualTip(e.target.value)}
            placeholder="Ou escreva sua dica (ex: 'Orelhas pontudas')..."
            className="input-party flex-1 rounded-xl px-3 py-2 text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[40px]"
            maxLength={120}
          />
          <button
            type="submit"
            disabled={!manualTip.trim()}
            className="btn-arcade-gold disabled:opacity-40 text-zinc-900 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 shrink-0 min-h-[40px]"
          >
            <Send className="w-3.5 h-3.5" /> Enviar Dica
          </button>
        </form>

        {/* Tips Sent in this Round */}
        {tips.length > 0 && (
          <div className="mt-4 pt-3 border-t-2 border-zinc-200">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Dicas enviadas aos artistas nesta rodada ({tips.length}):
            </span>
            <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
              {tips.map((tip, idx) => (
                <div key={idx} className="bg-amber-50 border-2 border-zinc-900 px-3 py-1.5 rounded-lg text-xs text-zinc-900 flex items-start gap-2 shadow-[1px_1px_0px_#18181b]">
                  <span className="text-blue-700 font-bold text-xs shrink-0 mt-0.5">#{idx + 1}</span>
                  <span className="text-zinc-900 font-bold">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom secret character input */}
        <form onSubmit={handleSetCustomWord} className="mt-4 pt-3 border-t-2 border-zinc-200 flex items-center gap-2">
          <input
            type="text"
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            placeholder="Ou digite o nome do personagem..."
            className="input-party flex-1 rounded-xl px-3 py-2 text-base sm:text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[40px]"
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!customWord.trim()}
            className="bg-white hover:bg-zinc-100 disabled:opacity-40 text-xs font-bold text-zinc-900 px-3.5 py-2 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] transition-all flex items-center gap-1 min-h-[40px] shrink-0 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Check className="w-3.5 h-3.5 text-green-700 stroke-[2.5]" /> Salvar
          </button>
        </form>
      </div>

      {/* Progress status & Advance Round CTA */}
      <div className="p-3.5 bg-white rounded-2xl border-2 border-zinc-900 max-w-xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[3px_4px_0px_#18181b] font-sketch">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-600">Artistas prontos:</span>
          <span className="font-mono font-bold text-zinc-900 text-base bg-amber-100 px-3 py-0.5 rounded-lg border-2 border-zinc-900 shadow-[1px_1px_0px_#18181b]">
            {submittedCount} de {totalArtists}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playPop();
            if (window.confirm('Deseja encerrar o tempo de desenho e abrir a votação agora?')) {
              socket.emit('finish_round_early', { roomId });
            }
          }}
          className="w-full sm:w-auto btn-arcade-gold font-bold text-xs px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_#18181b] transition-all active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1.5"
        >
          <span>🏁 Encerrar Desenho & Ir p/ Votação</span>
        </button>
      </div>
    </div>
  );
}

function DrawingBoard({ 
  socket, 
  roomId, 
  myPlayer: _myPlayer,
  tips = [],
  onOpenTips,
  timer
}: { 
  socket: Socket; 
  roomId: string; 
  myPlayer?: Player; 
  tips?: string[];
  onOpenTips?: () => void;
  timer?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#18181b');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [submitted, setSubmitted] = useState(() => Boolean(_myPlayer?.hasSubmitted));
  const [tipsMinimized, setTipsMinimized] = useState(true);
  const [newTipAlert, setNewTipAlert] = useState<string | null>(null);
  const prevTipsCount = useRef(tips.length);
  const hasSubmittedRef = useRef(Boolean(_myPlayer?.hasSubmitted));
  hasSubmittedRef.current = submitted;
  const prevTimerRef = useRef<number | undefined>(timer);

  useEffect(() => {
    if (_myPlayer?.hasSubmitted) {
      setSubmitted(true);
    }
  }, [_myPlayer?.hasSubmitted]);

  // Show a sleek non-intrusive toast alert whenever the Master sends a new tip
  useEffect(() => {
    if (tips.length > prevTipsCount.current && tips.length > 0) {
      const latest = tips[tips.length - 1];
      setNewTipAlert(latest);
      sounds.playPop();
      const timer = setTimeout(() => {
        setNewTipAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    prevTipsCount.current = tips.length;
  }, [tips.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Save current contents
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx && canvas.width > 0 && canvas.height > 0) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (tempCanvas.width > 0) {
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Prevent scrolling on mobile touch
    const preventDefault = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });

    // Block Undo Ctrl+Z to preserve the core theme "Desenho Cego"
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (submitted) return;
    if (!tipsMinimized) {
      setTipsMinimized(true);
    }
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = isEraser ? '#ffffff' : color;
      ctx.lineWidth = isEraser ? lineWidth * 2.5 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || submitted) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || submitted) return;
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const handleClear = () => {
    if (submitted) return;
    sounds.playPop();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const submitDrawing = () => {
    if (submitted) return;
    const canvas = canvasRef.current;
    if (canvas) {
      sounds.playPop();
      const dataUrl = canvas.toDataURL('image/png');
      socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl, dataUrl });
      setSubmitted(true);
    }
  };

  // Auto-submit apenas quando o tempo LIMITADO expira (>0 -> 0).
  // Timer 0 = "Tempo Livre", não pode entregar sozinho (bug: pulava pra votação na hora).
  useEffect(() => {
    const prev = prevTimerRef.current ?? 0;
    prevTimerRef.current = timer;
    if (timer === 0 && prev > 0 && !hasSubmittedRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl, dataUrl });
          setSubmitted(true);
        } catch (e) {
          console.error('Auto submit on timer 0 failed:', e);
        }
      }
    }
  }, [timer, roomId, socket]);

  // Auto-submit on round exit / component unmount if not yet submitted
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl, dataUrl });
          } catch (e) {
            console.error('Auto submit on unmount failed:', e);
          }
        }
      }
    };
  }, [roomId, socket]);

  return (
    <div className="flex-1 flex flex-col w-full h-full relative bg-white border-2 border-zinc-900 rounded-2xl shadow-[4px_5px_0px_#18181b] overflow-hidden">
      {/* Top Floating Toolbar */}
      <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 bg-white border-2 border-zinc-900 px-2 sm:px-3.5 py-1 sm:py-2 rounded-xl shadow-[3px_3px_0px_#18181b] flex items-center gap-1.5 sm:gap-2.5 z-10 max-w-[96%] overflow-x-auto no-scrollbar font-sketch">
        {/* Brush / Eraser toggle */}
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border-2 border-zinc-900 shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsEraser(false);
            }}
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${
              !isEraser ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Lápis / Caneta"
          >
            <Paintbrush className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsEraser(true);
            }}
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${
              isEraser ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Borracha"
          >
            <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 max-w-[160px] xs:max-w-none overflow-x-auto no-scrollbar">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsEraser(false);
                setColor(c);
              }}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform shrink-0 ${
                !isEraser && color === c ? 'border-zinc-900 scale-125 shadow-md ring-2 ring-amber-300' : 'border-zinc-400'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Custom Color Input */}
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setIsEraser(false);
              setColor(e.target.value);
            }}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full cursor-pointer bg-transparent border-0 shrink-0"
            title="Mais Cores"
          />
        </div>

        <div className="w-px h-5 sm:h-6 bg-zinc-300 shrink-0" />

        {/* Brush Size Slider */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs font-bold text-zinc-600 uppercase font-sketch">Tam:</span>
          <input
            type="range"
            min="2"
            max="30"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-12 sm:w-20 accent-zinc-900 cursor-pointer"
          />
          {/* Visual brush thickness dot */}
          <div 
            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-zinc-100 rounded-lg border-2 border-zinc-900 shrink-0"
            title={`Tamanho: ${lineWidth}px`}
          >
            <div 
              className="rounded-full transition-all"
              style={{ 
                width: Math.max(3, Math.min(16, lineWidth)), 
                height: Math.max(3, Math.min(16, lineWidth)),
                backgroundColor: isEraser ? '#dc2626' : color
              }} 
            />
          </div>
        </div>

        <div className="w-px h-5 sm:h-6 bg-zinc-300 shrink-0" />

        {/* Clear Canvas */}
        <button
          type="button"
          onClick={handleClear}
          title="Limpar folha inteira"
          className="p-1 sm:p-1.5 rounded-lg text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-300 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Toast Notification for New Tip */}
      <AnimatePresence>
        {newTipAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 bg-amber-200 text-zinc-900 px-3.5 sm:px-4 py-2 rounded-xl shadow-[3px_4px_0px_#18181b] flex items-center gap-2.5 sm:gap-3 max-w-md w-[92%] border-2 border-zinc-900 pointer-events-auto cursor-pointer font-sketch"
            onClick={() => {
              setNewTipAlert(null);
              if (onOpenTips) {
                onOpenTips();
              } else {
                setTipsMinimized(false);
              }
            }}
            title="Clique para abrir todas as dicas"
          >
            <div className="p-1 bg-white border border-zinc-900 rounded-lg shrink-0">
              <Crown className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-zinc-600 uppercase">
                Nova Dica #{tips.length}!
              </div>
              <div className="text-sm font-black truncate text-zinc-900">{newTipAlert}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNewTipAlert(null);
              }}
              className="p-1 text-zinc-600 hover:text-zinc-900 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Master Tips Toggle & Panel */}
      <div className="absolute top-14 sm:top-16 right-2 sm:right-5 z-20 pointer-events-auto font-sketch">
        {tipsMinimized ? (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setTipsMinimized(false);
            }}
            className="bg-white hover:bg-amber-50 text-zinc-900 border-2 border-zinc-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#18181b] flex items-center gap-1.5 text-xs font-bold transition-all active:translate-x-[1px] active:translate-y-[1px]"
            title="Abrir painel de dicas do Mestre"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Dicas ({tips.length})</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white border-2 border-zinc-900 rounded-2xl p-3 shadow-[4px_5px_0px_#18181b]"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-zinc-200 mb-2">
              <div className="flex items-center gap-1.5 text-zinc-900 text-sm font-black uppercase">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Dicas do Mestre</span>
                <span className="bg-amber-200 text-zinc-900 text-xs px-2 py-0.2 rounded-full border border-zinc-900 font-bold">
                  {tips.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setTipsMinimized(true);
                }}
                className="text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                title="Ocultar painel para desenhar livremente"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Ocultar</span>
              </button>
            </div>

            {tips.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1 opacity-70 animate-pulse" />
                <p className="font-bold">O Mestre ainda não enviou dicas.</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Fique atento à tela!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-50 border border-zinc-900 rounded-lg p-2 text-zinc-900 flex items-start gap-2 shadow-sm"
                  >
                    <span className="text-blue-700 font-black text-xs shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <span className="break-words font-bold leading-tight">{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full h-full cursor-crosshair overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
      </div>

      {/* Bottom Submit action / Waiting overlay */}
      {submitted ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-4 sm:p-6 text-center"
        >
          <div className="bg-white border-2 border-zinc-900 p-6 sm:p-8 rounded-2xl max-w-sm w-full shadow-[4px_5px_0px_#18181b] text-zinc-900 font-sketch">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-2xl font-black mb-1">Desenho Salvo! ✏️</h3>
            <p className="text-zinc-600 text-sm">
              Sua obra foi guardada na folha. Aguardando os demais jogadores finalizarem para começar a votação!
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 font-sketch">
          <button
            onClick={submitDrawing}
            className="btn-arcade-gold py-2.5 sm:py-3.5 px-4 sm:px-7 rounded-xl flex items-center gap-2 text-base sm:text-lg tracking-wide font-bold shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span>Terminei Meu Desenho!</span>
          </button>
        </div>
      )}
    </div>
  );
}
