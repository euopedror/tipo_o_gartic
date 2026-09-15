import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Volume2, VolumeX, Settings2, AlertCircle, ArrowRight } from 'lucide-react';
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
    <div className="min-h-[100dvh] w-full bg-[#f8f7f2] flex flex-col justify-between p-3.5 sm:p-5 font-sketch relative selection:bg-amber-200">
      {/* Top Mobile Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center gap-2 bg-amber-200 border-2 border-zinc-900 px-3 py-1 rounded-full text-xs font-black shadow-[1.5px_1.5px_0px_#18181b]">
          <span>📱 Desenho Cego</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="w-10 h-10 rounded-2xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center text-zinc-800"
            title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-green-700" /> : <VolumeX className="w-5 h-5 text-red-600" />}
          </button>

          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="w-10 h-10 rounded-2xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center text-zinc-700"
            title="Configurações do Servidor"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Expanded Notebook Sheet */}
      <div className="w-full max-w-md mx-auto my-auto bg-white border-3 border-zinc-900 rounded-3xl p-5 sm:p-6 shadow-[5px_6px_0px_#18181b] relative text-center sketch-tape">
        {/* Title Header with Big Doodle */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl sm:text-4xl animate-bounce">✏️</span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight font-kalam">
              Desenho Cego
            </h1>
          </div>
          <p className="text-sm text-zinc-600 font-sketch mt-0.5">
            O jogo de rabisco no caderno com a galera!
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-100 border-2 border-zinc-900 text-red-800 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2 text-left shadow-[2px_2px_0px_#18181b]"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Large Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-amber-100/70 border-2 border-zinc-900 rounded-2xl mb-4 shadow-[2px_2px_0px_#18181b]">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMode('create');
            }}
            className={`py-2.5 rounded-xl text-sm sm:text-base font-black transition-all ${
              mode === 'create'
                ? 'bg-amber-300 text-zinc-900 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]'
                : 'text-zinc-700 hover:text-zinc-900'
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
            className={`py-2.5 rounded-xl text-sm sm:text-base font-black transition-all ${
              mode === 'join'
                ? 'bg-amber-300 text-zinc-900 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]'
                : 'text-zinc-700 hover:text-zinc-900'
            }`}
          >
            🔑 Entrar na Sala
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* Nickname Input & Random Name Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-black uppercase text-zinc-800 tracking-wider">
                ✏️ Seu Apelido:
              </label>
              {showNameWarning && (
                <span className="text-xs font-bold text-red-600 animate-pulse">
                  Digite seu apelido!
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <motion.input
                animate={nameShake ? { x: [-8, 8, -6, 6, 0] } : {}}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (showNameWarning) setShowNameWarning(false);
                }}
                maxLength={20}
                placeholder="Ex: Picasso do Zap"
                className="flex-1 h-13 bg-amber-50/40 border-2 border-zinc-900 rounded-2xl px-3.5 text-base sm:text-lg text-zinc-900 placeholder:text-zinc-400 font-bold font-kalam focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_#18181b]"
              />

              <button
                type="button"
                onClick={handleRandomName}
                title="Sortear apelido engraçado"
                className="w-13 h-13 bg-amber-300 hover:bg-amber-400 border-2 border-zinc-900 rounded-2xl text-zinc-900 font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center shrink-0"
              >
                <Dices className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Room Code Input (if in Join mode) */}
          {mode === 'join' && (
            <div>
              <label className="text-xs sm:text-sm font-black uppercase text-zinc-800 tracking-wider block mb-1.5">
                🔑 Código da Sala:
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="Ex: ABC123"
                className="w-full h-13 bg-amber-50/40 border-2 border-zinc-900 rounded-2xl px-4 text-lg font-mono font-black tracking-widest text-blue-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_#18181b]"
              />
            </div>
          )}

          {/* Big, Clear Hand-Drawn Character Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-black uppercase text-zinc-800 tracking-wider">
                🎨 Escolha seu Personagem:
              </label>
              <span className="text-xs sm:text-sm font-black text-zinc-900 bg-amber-200 border-2 border-zinc-900 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#18181b]">
                <AvatarIcon avatar={avatar} className="w-5 h-5 shrink-0" />
                <span>{AVATAR_NAMES[avatar] || 'Personagem'}</span>
              </span>
            </div>

            {/* Spacious 6-Column Grid without clipping or overflow scroll */}
            <div className="grid grid-cols-6 gap-2 sm:gap-2.5 p-3 bg-amber-50/80 border-2 border-zinc-900 rounded-2xl shadow-[2px_2px_0px_#18181b]">
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
                    className={`aspect-square w-full rounded-xl flex items-center justify-center p-1 sm:p-1.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-300 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] scale-110 ring-2 ring-amber-400 z-10'
                        : 'bg-white hover:bg-yellow-50 border-2 border-zinc-300 active:scale-95'
                    }`}
                  >
                    <AvatarIcon avatar={av} className="w-full h-full object-contain filter drop-shadow-sm" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Thumb-Friendly Primary Action Button */}
          <button
            type="submit"
            className="w-full h-14 sm:h-16 btn-arcade-gold rounded-2xl flex items-center justify-center gap-2.5 text-lg sm:text-xl font-black tracking-wide mt-2 shadow-[4px_4px_0px_#18181b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <span>{mode === 'create' ? 'Criar Minha Sala!' : 'Entrar na Sala!'}</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-zinc-500 py-2 font-sketch">
        Caderno escolar interativo • Desenhe & adivinhe em tempo real
      </footer>

      {/* Server Configuration Modal */}
      <AnimatePresence>
        {showServerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-3 border-zinc-900 rounded-3xl p-5 sm:p-6 max-w-xs w-full shadow-[5px_6px_0px_#18181b] font-sketch"
            >
              <h3 className="text-xl font-black text-zinc-900 mb-2">⚙️ Conexão do Servidor</h3>
              <p className="text-xs text-zinc-600 mb-3">
                URL do backend do jogo (Render ou Local):
              </p>
              <input
                type="text"
                value={customServer}
                onChange={(e) => setCustomServer(e.target.value)}
                className="w-full bg-amber-50/50 border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs font-mono font-bold mb-4 focus:outline-none shadow-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 border-2 border-zinc-900 text-xs font-bold active:scale-95"
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
                  className="flex-1 py-2.5 rounded-xl bg-amber-300 border-2 border-zinc-900 text-xs font-black shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
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
