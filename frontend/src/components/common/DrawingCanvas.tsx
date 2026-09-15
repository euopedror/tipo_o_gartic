import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { CheckCircle2, Eraser, Paintbrush, Trash2 } from 'lucide-react';
import { sounds } from '../../utils/audioFx';

export const COLOR_PALETTE = [
  '#18181b',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#f59e0b',
  '#ea580c',
  '#7c3aed',
  '#db2777',
  '#78350f',
  '#475569',
  '#fde047',
  '#ffffff',
];

interface DrawingCanvasProps {
  socket: Socket;
  roomId: string;
  timer?: number;
  initialSubmitted?: boolean;
  variant?: 'web' | 'mobile';
}

/**
 * Canvas único de desenho — unifica Game.tsx (desktop) e MobileGame.tsx.
 * - resize com preservação do traço
 * - touch-action none + mouse + touch
 * - auto-submit no timer 0 e no unmount
 * - sem Ctrl+Z (regra Desenho Cego) no web; mobile mantém Undo por botão
 */
export default function DrawingCanvas({
  socket,
  roomId,
  timer,
  initialSubmitted,
  variant = 'web',
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#18181b');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(initialSubmitted));
  const [history, setHistory] = useState<ImageData[]>([]);
  const hasSubmittedRef = useRef(Boolean(initialSubmitted));
  hasSubmittedRef.current = submitted;
  // Guarda o timer anterior para detectar expiração real (>0 -> 0).
  // Inicializa com o timer atual para não disparar no mount (timer inicial 0 = Livre).
  const prevTimerRef = useRef<number | undefined>(timer);

  useEffect(() => {
    if (initialSubmitted) setSubmitted(true);
  }, [initialSubmitted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }
      const dpr = variant === 'mobile' ? window.devicePixelRatio || 1 : 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (variant === 'mobile') ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (tempCanvas.width > 0) {
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const preventDefault = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [variant]);

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
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const snapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-14), data]);
    } catch {
      // canvas tainted — ignora histórico
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (submitted) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = isEraser ? '#ffffff' : color;
      ctx.lineWidth = isEraser ? lineWidth * (variant === 'mobile' ? 3.5 : 2.5) : lineWidth;
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
    if (ctx) ctx.closePath();
    if (variant === 'mobile') snapshot();
  };

  const handleClear = () => {
    if (submitted) return;
    if (variant === 'mobile' && !window.confirm('Deseja limpar todo o desenho da folha?')) return;
    sounds.playPop();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      snapshot();
    }
  };

  const handleUndo = () => {
    if (!canvasRef.current || history.length === 0) return;
    sounds.playPop();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    try {
      ctx.putImageData(prev, 0, 0);
    } catch {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const submitDrawing = () => {
    if (submitted) return;
    const canvas = canvasRef.current;
    if (canvas) {
      sounds.playPop();
      try {
        const dataUrl = canvas.toDataURL('image/png');
        socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl, dataUrl });
        setSubmitted(true);
      } catch (err) {
        console.error('submit drawing failed', err);
      }
    }
  };

  useEffect(() => {
    // Timer 0 = "Tempo Livre" (sem limite), NÃO é tempo esgotado.
    // Só faz auto-submit na transição de >0 para 0 (rodada com tempo que expirou).
    // Sem isso, em modo Livre o desenho era entregue em branco assim que a partida iniciava.
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

  const isMobile = variant === 'mobile';

  return (
    <div className="flex-1 flex flex-col w-full h-full relative bg-white border-2 border-zinc-900 rounded-2xl shadow-[4px_5px_0px_#18181b] overflow-hidden">
      <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 bg-white border-2 border-zinc-900 px-2 sm:px-3.5 py-1 sm:py-2 rounded-xl shadow-[3px_3px_0px_#18181b] flex items-center gap-1.5 sm:gap-2.5 z-10 max-w-[96%] overflow-x-auto no-scrollbar font-sketch">
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border-2 border-zinc-900 shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsEraser(false);
            }}
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${!isEraser ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
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
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${isEraser ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
            title="Borracha"
          >
            <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

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

        {isMobile ? (
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0 || submitted}
            className="p-1 sm:p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 border border-zinc-300 transition-colors shrink-0 disabled:opacity-30"
            title="Desfazer último traço"
          >
            ↩️
          </button>
        ) : (
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
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-zinc-100 rounded-lg border-2 border-zinc-900 shrink-0">
              <div
                className="rounded-full transition-all"
                style={{
                  width: Math.max(3, Math.min(16, lineWidth)),
                  height: Math.max(3, Math.min(16, lineWidth)),
                  backgroundColor: isEraser ? '#dc2626' : color,
                }}
              />
            </div>
          </div>
        )}

        <div className="w-px h-5 sm:h-6 bg-zinc-300 shrink-0" />

        <button
          type="button"
          onClick={handleClear}
          title="Limpar folha inteira"
          className="p-1 sm:p-1.5 rounded-lg text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-300 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

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
          onTouchCancel={stopDrawing}
          className="w-full h-full block touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      {submitted ? (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-4 sm:p-6 text-center">
          <div className="bg-white border-2 border-zinc-900 p-6 sm:p-8 rounded-2xl max-w-sm w-full shadow-[4px_5px_0px_#18181b] text-zinc-900 font-sketch">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-2xl font-black mb-1">Desenho Salvo! ✏️</h3>
            <p className="text-zinc-600 text-sm">
              Sua obra foi guardada na folha. Aguardando os demais jogadores finalizarem para começar a votação!
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 font-sketch">
          <button
            onClick={submitDrawing}
            className="btn-arcade-gold py-2.5 sm:py-3.5 px-4 sm:px-7 rounded-xl flex items-center gap-2 text-base sm:text-lg tracking-wide font-bold shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span>{isMobile ? 'Entregar' : 'Terminei Meu Desenho!'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
