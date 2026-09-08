import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface GameProps {
  socket: Socket;
  gameState: any;
  myPlayer: any;
  timer: number;
}

export default function Game({ socket, gameState, myPlayer, timer }: GameProps) {
  const isMaster = myPlayer?.isMaster;
  
  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4 bg-bg-dark">
      {/* Sidebar for Timer & Tips */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-panel rounded-2xl p-6 border border-border flex items-center justify-between shadow-lg">
          <span className="text-text-muted font-bold uppercase tracking-wider">Tempo</span>
          <span className={`text-4xl font-mono font-bold ${timer <= 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timer}s
          </span>
        </div>

        <div className="flex-1 bg-panel rounded-2xl border border-border flex flex-col overflow-hidden shadow-lg">
          <div className="p-4 border-b border-border bg-black/20">
            <h3 className="font-bold text-lg text-primary">Dicas do Mestre</h3>
            <p className="text-xs text-text-muted">
              {isMaster ? 'Descreva o personagem aqui!' : 'Leia e tente desenhar.'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {gameState.tips.map((tip: string, idx: number) => (
              <div key={idx} className="bg-primary/20 border border-primary/30 p-3 rounded-xl rounded-tl-none animate-fade-in text-white text-sm">
                {tip}
              </div>
            ))}
          </div>

          {isMaster && <MasterInput socket={socket} roomId={gameState.id} />}
        </div>
      </div>

      {/* Main Area for Canvas */}
      <div className="flex-1 bg-panel rounded-2xl border border-border overflow-hidden relative shadow-lg flex flex-col">
        {isMaster ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/10">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Você é o Mestre!</h2>
            <p className="text-text-muted text-lg max-w-md">
              Descreva um personagem para os outros desenharem. 
              <br/><br/>
              <span className="text-red-400 font-bold">REGRA DE OURO:</span> Não diga o nome do personagem nem a obra de onde ele vem!
            </p>
          </div>
        ) : (
          <DrawingBoard socket={socket} roomId={gameState.id} />
        )}
      </div>
    </div>
  );
}

function MasterInput({ socket, roomId }: { socket: Socket, roomId: string }) {
  const [tip, setTip] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (tip.trim()) {
      socket.emit('send_tip', { roomId, tip: tip.trim() });
      setTip('');
    }
  };

  return (
    <form onSubmit={handleSend} className="p-4 bg-black/20 border-t border-border flex gap-2">
      <input 
        type="text" 
        value={tip}
        onChange={e => setTip(e.target.value)}
        className="flex-1 bg-bg-dark border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
        placeholder="Digite uma dica visual..."
        maxLength={100}
      />
      <button 
        type="submit"
        disabled={!tip.trim()}
        className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Enviar
      </button>
    </form>
  );
}

function DrawingBoard({ socket, roomId }: { socket: Socket, roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [submitted, setSubmitted] = useState(false);
  
  const colors = ['#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set actual internal canvas resolution to match display size for crispness
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        // Fill background
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a'; // Match bg-dark
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Prevent default touch actions (scrolling) while drawing
    const preventDefault = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    
    // Block Undo (Ctrl+Z)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
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
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
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

  const submitDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      socket.emit('submit_drawing', { roomId, imageDataUrl: dataUrl });
      setSubmitted(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-panel/90 backdrop-blur border border-border p-2 rounded-xl shadow-xl flex gap-4 z-10">
        <div className="flex gap-2">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px bg-border my-1"></div>
        <div className="flex items-center gap-2 px-2">
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-24 accent-primary"
          />
        </div>
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
          className="w-full h-full block"
        />
      </div>

      {submitted ? (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <div className="bg-panel p-6 rounded-2xl border border-border text-center shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">Desenho Enviado!</h3>
            <p className="text-text-muted">Aguardando os outros jogadores...</p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 right-4 z-10">
          <button 
            onClick={submitDrawing}
            className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            Terminei!
          </button>
        </div>
      )}
    </div>
  );
}
