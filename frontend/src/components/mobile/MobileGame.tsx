import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Clock, Eraser, Trash2, CheckCircle2, 
  Lightbulb, Check, MessageCircle, X, RotateCcw 
} from 'lucide-react';
import type { GameState, Player } from '../../types';
import { sounds } from '../../utils/audioFx';
import PartyChat from '../common/PartyChat';

interface MobileGameProps {
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

export default function MobileGame({ socket, gameState, myPlayer, timer }: MobileGameProps) {
  const isMaster = Boolean(myPlayer?.isMaster);
  const artists = gameState.players.filter(p => !p.isMaster);
  const submittedCount = artists.filter(p => p.hasSubmitted).length;

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#18181b');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(Boolean(myPlayer?.hasSubmitted));
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Master state
  const [newTip, setNewTip] = useState('');

  // Mobile Drawers
  const [tipsDrawerOpen, setTipsDrawerOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  // Sync submission state from server
  const hasSubmittedRef = useRef(Boolean(myPlayer?.hasSubmitted));
  hasSubmittedRef.current = hasSubmitted;
  const prevTimerRef = useRef<number | undefined>(timer);

  useEffect(() => {
    if (myPlayer?.hasSubmitted) {
      setHasSubmitted(true);
    }
  }, [myPlayer?.hasSubmitted]);

  // Auto-submit apenas quando o tempo LIMITADO expira (>0 -> 0).
  // Timer 0 = "Tempo Livre", não pode entregar sozinho.
  useEffect(() => {
    const prev = prevTimerRef.current ?? 0;
    prevTimerRef.current = timer;
    if (!isMaster && timer === 0 && prev > 0 && !hasSubmittedRef.current && canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        socket.emit('submit_drawing', { roomId: gameState.id, dataUrl, imageDataUrl: dataUrl });
        setHasSubmitted(true);
      } catch (err) {
        console.error('Mobile auto-submit failed:', err);
      }
    }
  }, [timer, isMaster, gameState.id, socket]);

  // Auto-submit on unmount / round change
  useEffect(() => {
    return () => {
      if (!isMaster && !hasSubmittedRef.current && canvasRef.current) {
        try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          socket.emit('submit_drawing', { roomId: gameState.id, dataUrl, imageDataUrl: dataUrl });
        } catch (err) {
          console.error('Mobile unmount auto-submit failed:', err);
        }
      }
    };
  }, [isMaster, gameState.id, socket]);

  // Setup canvas resolution and touch-action
  useEffect(() => {
    if (isMaster || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-res canvas backing
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial fill with pure white paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Save initial blank state to history
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialData]);
  }, [isMaster]);

  // Touch drawing handlers with prevention of screen scroll
  const getCanvasCoords = (touch: React.Touch) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (hasSubmitted || !canvasRef.current) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? lineWidth * 3.5 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || hasSubmitted || !canvasRef.current) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.closePath();

    // Push to history for Undo (limit to last 15 steps)
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-14), data]);
  };

  const handleUndo = () => {
    if (!canvasRef.current || history.length <= 1) return;
    sounds.playPop();
    const newHistory = [...history];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !prev) return;
    ctx.putImageData(prev, 0, 0);
  };

  const handleClear = () => {
    if (!canvasRef.current || hasSubmitted) return;
    if (!window.confirm('Deseja limpar todo o desenho da folha?')) return;
    sounds.playPop();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([data]);
  };

  const handleSubmitDrawing = () => {
    if (!canvasRef.current || hasSubmitted) return;
    sounds.playFanfare();
    const dataUrl = canvasRef.current.toDataURL('image/png');
    socket.emit('submit_drawing', { roomId: gameState.id, dataUrl, imageDataUrl: dataUrl });
    setHasSubmitted(true);
  };

  const handleSendTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTip.trim()) return;
    sounds.playPop();
    socket.emit('send_tip', { roomId: gameState.id, tip: newTip.trim() });
    setNewTip('');
  };

  const handleFinishRoundEarly = () => {
    sounds.playPop();
    if (window.confirm('Deseja encerrar o tempo de desenho e abrir a votação agora?')) {
      socket.emit('finish_round_early', { roomId: gameState.id });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#f8f7f2] overflow-hidden select-none font-sketch relative h-[calc(100dvh-56px)]">
      {/* Top Mobile Status Bar */}
      <div className="bg-white/95 border-b-2 border-zinc-900 px-3 py-2 flex items-center justify-between shadow-[0_2px_4px_rgba(0,0,0,0.06)] shrink-0 z-20">
        {/* Timer & Delivery count */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-black text-xs sm:text-sm border-2 border-zinc-900 shadow-xs ${
            timer <= 20 && timer > 0 ? 'bg-red-200 text-red-800 animate-pulse' : 'bg-amber-100 text-zinc-900'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{timer > 0 ? `${timer}s` : '♾️'}</span>
          </div>

          <div className="text-xs sm:text-sm font-black text-zinc-800 bg-zinc-50 px-2.5 py-1 rounded-xl border-2 border-zinc-900 shadow-xs">
            🎨 {submittedCount}/{artists.length}
          </div>

          {isMaster && (
            <button
              onClick={handleFinishRoundEarly}
              type="button"
              className="bg-amber-300 active:bg-amber-400 border-2 border-zinc-900 px-3 py-1 rounded-xl text-xs font-black shadow-[1.5px_1.5px_0px_#18181b]"
            >
              🏁 Votar
            </button>
          )}
        </div>

        {/* Action Triggers: Dicas & Chat */}
        <div className="flex items-center gap-2">
          {!isMaster && (
            <button
              onClick={() => setTipsDrawerOpen(true)}
              type="button"
              className="flex items-center gap-1.5 bg-yellow-100 active:bg-yellow-200 border-2 border-zinc-900 px-2.5 py-1 rounded-xl text-xs font-black text-zinc-900 shadow-xs"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 fill-amber-300" />
              <span>Dicas ({gameState.tips?.length || 0})</span>
            </button>
          )}

          <button
            onClick={() => setChatDrawerOpen(true)}
            type="button"
            className="flex items-center gap-1.5 bg-white active:bg-zinc-100 border-2 border-zinc-900 px-2.5 py-1 rounded-xl text-xs font-black text-zinc-900 shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat ({gameState.messages?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: Artist Canvas OR Master Panel */}
      {!isMaster ? (
        /* Artist Mode: Full Touch Canvas */
        <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-3 relative overflow-hidden">
          {/* Latest Tip Marquee Pill */}
          {gameState.tips && gameState.tips.length > 0 && (
            <button
              type="button"
              onClick={() => setTipsDrawerOpen(true)}
              className="w-full max-w-md mb-2 bg-amber-100/90 border-2 border-zinc-900 px-3 py-1.5 rounded-2xl text-left shadow-[2px_2px_0px_#18181b] flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm">💡</span>
                <span className="text-xs sm:text-sm font-black text-zinc-900 truncate font-kalam">
                  Última dica: {gameState.tips[gameState.tips.length - 1]}
                </span>
              </div>
              <span className="text-xs text-blue-700 underline shrink-0 font-black">Ver todas</span>
            </button>
          )}

          {/* Touch Drawing Canvas Box */}
          <div className="relative w-full max-w-md aspect-square bg-white border-3 border-zinc-900 rounded-3xl shadow-[5px_6px_0px_#18181b] overflow-hidden touch-none flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="w-full h-full cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />

            {/* Submitted Overlay */}
            {hasSubmitted && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-10">
                <div className="w-16 h-16 bg-green-200 border-3 border-zinc-900 rounded-full flex items-center justify-center mb-3 shadow-[3px_3px_0px_#18181b] animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-green-700 stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 font-kalam">Desenho Entregue!</h3>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-sketch">
                  Aguardando os outros artistas terminarem... ({submittedCount}/{artists.length})
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Master Mode Panel */
        <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-md mx-auto flex flex-col gap-4">
            {/* Secret Character Card */}
            <div className="bg-amber-100 border-3 border-zinc-900 rounded-3xl p-5 shadow-[5px_6px_0px_#18181b] text-center relative sketch-tape">
              <span className="text-xs uppercase font-black text-zinc-700 tracking-wider">Você é o Mestre! 👑</span>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 my-2 font-kalam">
                {gameState.character || 'Personagem Secreto'}
              </h2>
              <p className="text-xs text-red-700 font-bold bg-white/90 border-2 border-zinc-900 px-3 py-1.5 rounded-xl inline-block shadow-xs">
                ⚠️ Regra: NÃO FALE o nome do personagem! Descreva apenas formas, cores e pistas.
              </p>
            </div>

            {/* Master Tips Sender */}
            <div className="bg-white border-3 border-zinc-900 rounded-3xl p-4 shadow-[4px_5px_0px_#18181b]">
              <span className="text-xs sm:text-sm font-black uppercase text-zinc-800 block mb-2">
                🗣️ Envie Dicas para os Artistas:
              </span>
              <form onSubmit={handleSendTip} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  placeholder="Ex: Tem orelhas pontudas e rabo listrado..."
                  className="flex-1 h-12 bg-amber-50/40 border-2 border-zinc-900 rounded-2xl px-3.5 text-xs sm:text-sm font-bold text-zinc-900 focus:outline-none shadow-xs"
                />
                <button
                  type="submit"
                  className="h-12 bg-amber-300 border-2 border-zinc-900 px-4 rounded-2xl text-zinc-900 font-black text-xs sm:text-sm shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  Enviar
                </button>
              </form>

              {/* Tips history list */}
              <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {gameState.tips && gameState.tips.length > 0 ? (
                  gameState.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-yellow-50 border-2 border-zinc-900 rounded-xl text-xs sm:text-sm font-bold text-zinc-800 flex items-start gap-2 shadow-xs"
                    >
                      <span className="bg-amber-300 border border-zinc-900 px-1.5 rounded text-xs font-black">
                        #{idx + 1}
                      </span>
                      <span className="flex-1 font-kalam">{tip}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic text-center py-4">
                    Nenhuma dica enviada ainda. Descreva como desenhar!
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="bg-white border-2 border-zinc-900 rounded-2xl p-3.5 shadow-[3px_3px_0px_#18181b]">
              <div className="flex justify-between text-xs sm:text-sm font-bold mb-1.5">
                <span>Progresso dos Desenhos:</span>
                <span className="font-mono font-black">{submittedCount} de {artists.length}</span>
              </div>
              <div className="w-full h-3.5 bg-zinc-100 border-2 border-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${artists.length > 0 ? (submittedCount / artists.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tool Dock (Artist Mode Only) */}
      {!isMaster && (
        <div className="bg-white/98 border-t-2 border-zinc-900 p-2.5 sm:p-3 pb-safe shrink-0 shadow-[0_-3px_10px_rgba(0,0,0,0.08)] z-20">
          <div className="max-w-md mx-auto flex flex-col gap-2">
            {/* Horizontal Color Swatches Slider with Large 34px Circles */}
            <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 no-scrollbar">
              {COLOR_PALETTE.map((c) => {
                const isSelected = !isEraser && color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setColor(c);
                      setIsEraser(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-zinc-900 shrink-0 transition-transform ${
                      isSelected ? 'scale-125 shadow-[2px_2px_0px_#18181b] ring-2 ring-amber-400' : 'active:scale-95'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>

            {/* Tool Toggles & Action Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Brush Thickness Buttons */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border-2 border-zinc-900">
                {[
                  { label: 'Fino', val: 3 },
                  { label: 'Médio', val: 6 },
                  { label: 'Grosso', val: 12 },
                ].map((size) => (
                  <button
                    key={size.val}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setLineWidth(size.val);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                      lineWidth === size.val
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-700 active:bg-zinc-200'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>

              {/* Eraser, Undo, Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsEraser(!isEraser);
                  }}
                  className={`w-10 h-10 rounded-2xl border-2 border-zinc-900 flex items-center justify-center ${
                    isEraser
                      ? 'bg-amber-300 text-zinc-900 shadow-[2px_2px_0px_#18181b]'
                      : 'bg-white text-zinc-700'
                  }`}
                  title="Borracha"
                >
                  <Eraser className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length <= 1 || hasSubmitted}
                  className="w-10 h-10 rounded-2xl bg-white border-2 border-zinc-900 text-zinc-700 disabled:opacity-30 disabled:border-zinc-300 shadow-sm flex items-center justify-center"
                  title="Desfazer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={hasSubmitted}
                  className="w-10 h-10 rounded-2xl bg-white border-2 border-zinc-900 text-zinc-700 disabled:opacity-30 shadow-sm flex items-center justify-center"
                  title="Limpar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Finalize / Submit Drawing Button */}
              <button
                type="button"
                onClick={handleSubmitDrawing}
                disabled={hasSubmitted}
                className="h-10 px-4 btn-arcade-gold rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-[2px_2px_0px_#18181b]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{hasSubmitted ? 'Pronto!' : 'Entregar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Dicas do Mestre */}
      <AnimatePresence>
        {tipsDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border-t-3 border-zinc-900 rounded-t-3xl max-h-[75vh] flex flex-col p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3.5 border-b-2 border-zinc-900 mb-3.5">
                <div className="flex items-center gap-2 font-black text-lg text-zinc-900">
                  <Lightbulb className="w-6 h-6 text-amber-500 fill-amber-300" />
                  <span>Dicas Dadas pelo Mestre</span>
                </div>
                <button
                  onClick={() => setTipsDrawerOpen(false)}
                  type="button"
                  className="p-1.5 rounded-xl bg-zinc-100 border border-zinc-900 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
                {gameState.tips && gameState.tips.length > 0 ? (
                  gameState.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-yellow-50 border-2 border-zinc-900 rounded-2xl text-xs sm:text-sm font-bold text-zinc-800 shadow-[2px_2px_0px_#18181b] flex items-start gap-2.5"
                    >
                      <span className="bg-amber-300 border border-zinc-900 px-2 py-0.5 rounded-lg text-xs font-black">
                        #{idx + 1}
                      </span>
                      <span className="flex-1 font-kalam">{tip}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 italic text-center py-8">
                    O mestre ainda não enviou dicas. Aguarde um instante!
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setTipsDrawerOpen(false)}
                className="mt-4 w-full h-12 bg-amber-300 border-2 border-zinc-900 rounded-2xl text-sm font-black shadow-[3px_3px_0px_#18181b] active:scale-98"
              >
                Voltar a Desenhar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer: Chat da Turma */}
      <AnimatePresence>
        {chatDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white border-t-3 border-zinc-900 rounded-t-3xl h-[82vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-3.5 border-b-2 border-zinc-900 bg-amber-100">
                <div className="flex items-center gap-2 font-sketch font-black text-base text-zinc-900">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat da Turma</span>
                </div>
                <button
                  onClick={() => setChatDrawerOpen(false)}
                  type="button"
                  className="p-1.5 rounded-xl bg-white border border-zinc-900 text-zinc-800 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <PartyChat
                  socket={socket}
                  roomId={gameState.id}
                  messages={gameState.messages}
                  myPlayer={myPlayer}
                  isMaster={isMaster}
                  isHost={Boolean(myPlayer?.isHost || gameState.hostId === myPlayer?.id)}
                  isChatMuted={Boolean(gameState.isChatMuted)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
