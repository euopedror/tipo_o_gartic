import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { 
  Clock, Send, Crown, Eraser, Paintbrush, 
  Trash2, CheckCircle2, Lightbulb, RefreshCw, Check, MessageCircle, Sparkles
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
  '#ffffff', // Branco
  '#000000', // Preto
  '#ef4444', // Vermelho
  '#f97316', // Laranja
  '#eab308', // Amarelo
  '#22c55e', // Verde
  '#06b6d4', // Ciano
  '#3b82f6', // Azul
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#78350f', // Marrom
  '#fcd34d', // Bege/Pele
];

export default function Game({ socket, gameState, myPlayer, timer }: GameProps) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'tips'>('chat');
  const isMaster = myPlayer?.isMaster;
  const artists = gameState.players.filter(p => !p.isMaster);
  const submittedCount = artists.filter(p => p.hasSubmitted).length;

  return (
    <div className="flex-1 flex flex-col md:flex-row p-3 md:p-6 gap-4 bg-bg-dark overflow-hidden">
      {/* Sidebar: Timer, Progress, Chat & Tips */}
      <div className="w-full md:w-88 flex flex-col gap-3 shrink-0">
        {/* Timer Card */}
        <div className="bg-panel rounded-3xl p-4 md:p-5 border border-border shadow-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {timer > 0 ? (
              <>
                <div className={`p-3 rounded-2xl ${timer <= 20 ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                  <Clock className={`w-6 h-6 ${timer <= 20 ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted font-display">Tempo Restante</span>
                  <div className={`text-3xl font-mono font-black ${timer <= 20 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {timer}s
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <span className="text-2xl leading-none">♾️</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-display">Sem Pressa</span>
                  <div className="text-sm font-black text-white font-display">
                    Tempo Livre
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted font-display">Entregas</span>
            <div className="text-base font-bold text-accent-cyan font-display">
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
                className="bg-accent-yellow/20 hover:bg-accent-yellow/30 border border-accent-yellow/40 text-accent-yellow px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              >
                🏁 Ir p/ Voto
              </button>
            )}
          </div>
        </div>

        {/* Chat / Tips Feed */}
        <div className="flex-1 bg-panel rounded-3xl border border-border flex flex-col overflow-hidden shadow-xl min-h-[340px]">
          {/* Tab Switcher */}
          <div className="p-2 border-b border-border/80 bg-black/30 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-panel-light p-1 rounded-xl border border-border/60 w-full">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveSidebarTab('chat');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSidebarTab === 'chat'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Chat & Dicas</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-bold">
                  {gameState.messages?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveSidebarTab('tips');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSidebarTab === 'tips'
                    ? 'bg-accent-yellow text-black font-black shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Só Dicas</span>
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full font-bold">
                  {gameState.tips.length}
                </span>
              </button>
            </div>
          </div>

          {activeSidebarTab === 'chat' ? (
            <PartyChat
              socket={socket}
              roomId={gameState.id}
              messages={gameState.messages}
              myPlayer={myPlayer}
              isMaster={Boolean(isMaster)}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {gameState.tips.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-text-muted text-xs p-4">
                    <span className="text-3xl mb-2">👂</span>
                    <p className="font-medium">O Mestre está preparando a primeira dica...</p>
                    <p className="text-[11px] opacity-70 mt-1">Fique de olho aqui!</p>
                  </div>
                ) : (
                  gameState.tips.map((tip, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      className="bg-primary/15 border border-primary/30 p-3 rounded-2xl rounded-tl-sm text-white text-sm shadow-sm relative"
                    >
                      <div className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>👑 Mestre</span>
                        <span className="text-text-muted">• Dica #{idx + 1}</span>
                      </div>
                      <p className="font-medium text-slate-100">{tip}</p>
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

      {/* Main Canvas / Master Center Area */}
      <div className="flex-1 bg-panel rounded-3xl border border-border overflow-hidden relative shadow-2xl flex flex-col min-h-[420px]">
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
    <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-panel to-bg-dark">
      {/* Top Banner */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-yellow/15 border border-accent-yellow/40 text-accent-yellow font-bold text-xs uppercase tracking-wider mb-3 font-display">
          <Crown className="w-4 h-4" />
          Você é o Mestre da Rodada!
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white font-display">
          Comande o Jogo & Descreva
        </h2>
        <p className="text-text-muted text-xs md:text-sm mt-1">
          Os outros jogadores só podem desenhar com base nas suas palavras.
        </p>

        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-semibold">
          🚨 <strong className="text-white">REGRA DE OURO:</strong> Nunca diga o nome nem de onde ele vem! Foque em formas, cores e detalhes.
        </div>
      </div>

      {/* Idea Cards / Suggestion Box */}
      <div className="my-6 max-w-xl mx-auto w-full bg-black/40 border border-border rounded-3xl p-5 shadow-inner">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-cyan">
            <Lightbulb className="w-4 h-4" />
            <span>Sugestão de Personagem</span>
          </div>

          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white bg-panel px-3 py-1.5 rounded-xl border border-border transition-colors font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sortear Outro
          </button>
        </div>

        <div className="bg-panel-light p-4 rounded-2xl border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase">{currentIdea.category}</span>
            <h4 className="text-xl font-black text-white">{currentIdea.name}</h4>
          </div>
          <button
            onClick={() => handleUseIdea(currentIdea)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            Definir Segredo 🔒
          </button>
        </div>

        {/* Quick Tips helper */}
        <div className="mt-4">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
            Ideias de Dicas para clicar e enviar:
          </span>
          <div className="flex flex-wrap gap-2">
            {currentIdea.starterTips.map((tip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendStarterTip(tip)}
                className="text-xs bg-bg-dark hover:bg-primary/20 hover:border-primary/50 text-slate-200 border border-border px-3 py-1.5 rounded-xl transition-colors text-left"
              >
                + "{tip}"
              </button>
            ))}
          </div>
        </div>

        {/* Manual Custom Tip Input */}
        <form onSubmit={handleSendManualTip} className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
          <input
            type="text"
            value={manualTip}
            onChange={(e) => setManualTip(e.target.value)}
            placeholder="Ou escreva sua própria dica (ex: 'Orelhas pontudas')..."
            className="flex-1 bg-bg-dark border border-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-accent-yellow"
            maxLength={120}
          />
          <button
            type="submit"
            disabled={!manualTip.trim()}
            className="bg-accent-yellow hover:bg-yellow-400 disabled:opacity-40 text-black font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" /> Enviar Dica
          </button>
        </form>

        {/* Tips Sent in this Round */}
        {tips.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/60">
            <span className="text-[11px] font-bold text-accent-yellow uppercase tracking-wider block mb-2">
              Dicas enviadas aos artistas nesta rodada ({tips.length}):
            </span>
            <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
              {tips.map((tip, idx) => (
                <div key={idx} className="bg-bg-dark border border-accent-yellow/30 px-3 py-1.5 rounded-xl text-xs text-white flex items-start gap-2">
                  <span className="text-accent-yellow font-bold text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                  <span className="text-slate-100">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom secret character input */}
        <form onSubmit={handleSetCustomWord} className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
          <input
            type="text"
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            placeholder="Ou digite o nome do seu próprio personagem..."
            className="flex-1 bg-bg-dark border border-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!customWord.trim()}
            className="bg-panel hover:bg-border disabled:opacity-40 text-xs font-bold text-white px-3 py-2 rounded-xl border border-border transition-colors flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5 text-accent-green" /> Salvar
          </button>
        </form>
      </div>

      {/* Progress status & Advance Round CTA */}
      <div className="p-4 bg-black/30 rounded-3xl border border-border/80 max-w-xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-muted">Artistas prontos:</span>
          <span className="font-mono font-bold text-accent-green text-sm bg-accent-green/10 px-3 py-1 rounded-xl border border-accent-green/30">
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
          className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
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
  tips = []
}: { 
  socket: Socket; 
  roomId: string; 
  myPlayer?: Player; 
  tips?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          ctx.fillStyle = '#0a0e1a';
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
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = isEraser ? '#0a0e1a' : color;
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
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const submitDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      sounds.playPop();
      const dataUrl = canvas.toDataURL('image/png');
      socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl });
      setSubmitted(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-panel/95 backdrop-blur border border-border px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-10 max-w-[95%] overflow-x-auto">
        {/* Brush / Eraser toggle */}
        <div className="flex items-center bg-black/30 p-1 rounded-xl border border-border shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsEraser(false);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              !isEraser ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
            }`}
            title="Pincel"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsEraser(true);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isEraser ? 'bg-primary text-white' : 'text-text-muted hover:text-white'
            }`}
            title="Borracha"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5 shrink-0">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsEraser(false);
                setColor(c);
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                !isEraser && color === c ? 'border-white scale-125 shadow-md' : 'border-black/40'
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
            className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
            title="Mais Cores"
          />
        </div>

        <div className="w-px h-6 bg-border shrink-0" />

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-text-muted uppercase">Tam:</span>
          <input
            type="range"
            min="2"
            max="30"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-16 sm:w-20 accent-primary cursor-pointer"
          />
          {/* Visual brush thickness dot */}
          <div 
            className="w-6 h-6 flex items-center justify-center bg-black/50 rounded-lg border border-border/60"
            title={`Tamanho: ${lineWidth}px`}
          >
            <div 
              className="rounded-full transition-all"
              style={{ 
                width: Math.max(3, Math.min(18, lineWidth)), 
                height: Math.max(3, Math.min(18, lineWidth)),
                backgroundColor: isEraser ? '#ef4444' : color
              }} 
            />
          </div>
        </div>

        <div className="w-px h-6 bg-border shrink-0" />

        {/* Clear Canvas */}
        <button
          type="button"
          onClick={handleClear}
          title="Limpar tela inteira"
          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Pinned Master Tips Banner on Canvas */}
      <div className="absolute top-16 left-3 right-3 sm:left-6 sm:right-6 z-10 pointer-events-auto flex flex-col items-center">
        {tips.length === 0 ? (
          <div className="bg-black/80 backdrop-blur-md border border-accent-yellow/40 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs text-amber-200 animate-pulse">
            <Sparkles className="w-4 h-4 text-accent-yellow shrink-0" />
            <span className="font-semibold">Aguardando o Mestre enviar a primeira pista visual...</span>
          </div>
        ) : (
          <div className="max-w-xl w-full bg-black/85 backdrop-blur-md border border-accent-yellow/50 rounded-2xl p-2.5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10 mb-1">
              <div className="flex items-center gap-1.5 text-accent-yellow text-xs font-black uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5" />
                <span>Dicas do Mestre</span>
                <span className="bg-accent-yellow/20 text-accent-yellow text-[10px] px-2 py-0.2 rounded-full font-mono">
                  {tips.length}
                </span>
              </div>
              <span className="text-[10px] text-text-muted hidden sm:inline">Desenhe seguindo as instruções:</span>
            </div>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
              {tips.map((tip, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-100 font-medium flex items-start gap-2">
                  <span className="text-accent-yellow font-bold text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                  <span className="break-words leading-tight">{tip}</span>
                </div>
              ))}
            </div>
          </div>
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
          className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center z-20 p-6 text-center"
        >
          <div className="bg-panel border border-border p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <CheckCircle2 className="w-16 h-16 text-accent-green mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-black text-white mb-2">Desenho Salvo!</h3>
            <p className="text-text-muted text-sm">
              Sua obra-prima foi guardada. Aguardando os demais jogadores finalizarem para começar a votação!
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={submitDrawing}
            className="btn-party-cta py-3.5 px-7 rounded-2xl flex items-center gap-2.5 text-base tracking-wide font-display"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Terminei Meu Desenho!</span>
          </button>
        </div>
      )}
    </div>
  );
}
