import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Volume2, VolumeX, Settings2, AlertCircle } from 'lucide-react';
import AvatarIcon, { AVATAR_NAMES } from '../common/AvatarIcon';
import { AVATARS } from '../../types';
import { sounds } from '../../utils/audioFx';

interface MobileLobbyProps {
  onJoin: (roomId: string, name: string, avatar: string) => void;
  error?: string;
}

const FUNNY_NICKNAMES = [
  'Capivara Ninja', 'Picasso da Shopee', 'Monalisa do Pagode', 'T-Rex de Patins',
  'Pão de Queijo Veloz', 'Astronauta Caipira', 'Gato Cósmico', 'Pinguim do Rock',
  'Abacate Samurai', 'Detetive Sonolento', 'Pikachu do Agreste', 'Mago da Gambiarra',
  'Dinossauro Fofo', 'Coruja da Madrugada', 'Zé das Tintas', 'Mestre dos Rabiscos',
  'Cachorro Caramelo', 'Unicórnio do Piseiro'
];

export default function MobileLobby({ onJoin, error }: MobileLobbyProps) {
  const queryRoom = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') : null;
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(() => (queryRoom ? queryRoom.toUpperCase() : ''));
  const [avatar, setAvatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [mode, setMode] = useState<'create' | 'join'>(() => (queryRoom ? 'join' : 'create'));
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.enabled);
  const [showServerModal, setShowServerModal] = useState(false);
  const [nameShake, setNameShake] = useState(false);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [customServer, setCustomServer] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('backend_url') : '') || 'https://desenho-cego-backend.onrender.com';
  });

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) sounds.playPop();
  };

  const handleRandomName = () => {
    sounds.playPop();
    const pick = FUNNY_NICKNAMES[Math.floor(Math.random() * FUNNY_NICKNAMES.length)];
    setName(pick);
    setShowNameWarning(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      sounds.playTick();
      setNameShake(true);
      setShowNameWarning(true);
      setTimeout(() => setNameShake(false), 500);
      return;
    }

    let targetRoom = roomId.trim().toUpperCase();
    if (mode === 'create' && !targetRoom) {
      targetRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (mode === 'join' && !targetRoom) {
      return;
    }

    if (targetRoom && name.trim()) {
      sounds.playClick();
      onJoin(targetRoom, name.trim(), avatar);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f7f2] flex flex-col justify-between p-3 sm:p-4 font-sketch relative overflow-x-hidden">
      {/* Top Floating Controls */}
      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5 bg-amber-200 border-2 border-zinc-900 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-[1.5px_1.5px_0px_#18181b]">
          <span>📱 Modo Celular</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
            title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-green-700" /> : <VolumeX className="w-4 h-4 text-red-600" />}
          </button>

          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="p-2 rounded-xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] text-zinc-700"
            title="Servidor"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Notebook Card */}
      <div className="my-auto w-full max-w-sm mx-auto bg-white border-2 border-zinc-900 rounded-2xl p-4 sm:p-5 shadow-[4px_5px_0px_#18181b] relative text-center sketch-tape">
        {/* Title & Doodle */}
        <div className="mb-3">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl animate-bounce">✏️</span>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Desenho Cego
            </h1>
          </div>
          <p className="text-xs text-zinc-600">O jogo de rabisco no caderno com a galera!</p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-2 bg-red-100 border-2 border-zinc-900 text-red-800 text-xs rounded-xl flex items-center gap-2 text-left shadow-[2px_2px_0px_#18181b]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selector Tabs (Criar Sala vs Entrar na Sala) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-amber-50 border-2 border-zinc-900 rounded-xl mb-4 shadow-[2px_2px_0px_#18181b]">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMode('create');
            }}
            className={`py-1.5 rounded-lg text-xs font-black transition-all ${
              mode === 'create'
                ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm'
                : 'text-zinc-600'
            }`}
          >
            ✨ Criar Sala
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMode('join');
            }}
            className={`py-1.5 rounded-lg text-xs font-black transition-all ${
              mode === 'join'
                ? 'bg-amber-300 text-zinc-900 border border-zinc-900 shadow-sm'
                : 'text-zinc-600'
            }`}
          >
            🔑 Entrar na Sala
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          {/* Nickname Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase text-zinc-800">
                Seu Apelido:
              </label>
              {showNameWarning && (
                <span className="text-[11px] font-bold text-red-600 animate-pulse">
                  Digite seu nome!
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              <motion.input
                animate={nameShake ? { x: [-8, 8, -6, 6, 0] } : {}}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (showNameWarning) setShowNameWarning(false);
                }}
                maxLength={20}
                placeholder="Ex: Monalisa do Pagode"
                className="flex-1 bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_#18181b]"
              />

              <button
                type="button"
                onClick={handleRandomName}
                title="Sortear apelido engraçado"
                className="bg-amber-200 hover:bg-amber-300 border-2 border-zinc-900 px-3 py-2 rounded-xl text-zinc-900 font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center shrink-0"
              >
                <Dices className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Room Code (if in Join mode) */}
          {mode === 'join' && (
            <div>
              <label className="text-xs font-black uppercase text-zinc-800 block mb-1">
                Código da Sala:
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Ex: ABCD12"
                className="w-full bg-white border-2 border-zinc-900 rounded-xl px-3 py-2 text-sm text-zinc-900 font-mono font-black tracking-widest placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_#18181b]"
              />
            </div>
          )}

          {/* Mobile Character Avatar Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase text-zinc-800">
                Escolha seu Rabisco:
              </label>
              <span className="text-[11px] font-bold text-zinc-900 bg-amber-200 border border-zinc-900 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <AvatarIcon avatar={avatar} className="w-3.5 h-3.5" />
                <span>{AVATAR_NAMES[avatar] || 'Personagem'}</span>
              </span>
            </div>

            {/* Compact Mobile Avatar Grid */}
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-amber-50/70 border-2 border-zinc-900 rounded-xl max-h-36 overflow-y-auto shadow-[2px_2px_0px_#18181b]">
              {AVATARS.map((av) => {
                const isSelected = avatar === av;
                return (
                  <button
                    key={av}
                    type="button"
                    title={AVATAR_NAMES[av] || av}
                    onClick={() => {
                      sounds.playPop();
                      setAvatar(av);
                    }}
                    className={`aspect-square rounded-lg flex items-center justify-center p-0.5 transition-all ${
                      isSelected
                        ? 'bg-amber-300 border-2 border-zinc-900 shadow-[1.5px_1.5px_0px_#18181b] scale-105 ring-2 ring-amber-400'
                        : 'bg-white border border-zinc-300 active:bg-amber-100'
                    }`}
                  >
                    <AvatarIcon avatar={av} className="w-full h-full object-contain" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action CTA Button */}
          <button
            type="submit"
            className="w-full btn-arcade-gold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-black tracking-wide mt-1 active:translate-x-[2px] active:translate-y-[2px]"
          >
            <span>{mode === 'create' ? 'Criar Minha Sala! ➔' : 'Entrar na Sala! ➔'}</span>
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-[11px] text-zinc-500 py-1 font-sketch">
        Caderno escolar interativo • Desenhe & adivinhe em tempo real
      </footer>

      {/* Server Config Modal */}
      <AnimatePresence>
        {showServerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-2 border-zinc-900 rounded-2xl p-5 max-w-xs w-full shadow-[4px_5px_0px_#18181b] font-sketch"
            >
              <h3 className="text-lg font-black text-zinc-900 mb-2">⚙️ Conexão do Servidor</h3>
              <p className="text-xs text-zinc-600 mb-3">
                URL do backend do jogo (Render ou Local):
              </p>
              <input
                type="text"
                value={customServer}
                onChange={(e) => setCustomServer(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono font-bold mb-3 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 border border-zinc-900 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customServer.trim()) {
                      localStorage.setItem('backend_url', customServer.trim());
                      window.location.reload();
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-300 border-2 border-zinc-900 text-xs font-black shadow-[2px_2px_0px_#18181b]"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
