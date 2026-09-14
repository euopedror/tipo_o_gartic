import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dices, ArrowRight, Palette, EyeOff, Trophy, AlertCircle, 
  Sparkles, Volume2, VolumeX, Settings2 
} from 'lucide-react';
import AvatarPicker from './common/AvatarPicker';
import AvatarIcon from './common/AvatarIcon';
import { AVATARS } from '../types';
import { sounds } from '../utils/audioFx';

interface LobbyProps {
  onJoin: (roomId: string, name: string, avatar: string) => void;
  error?: string;
}

const FUNNY_NICKNAMES = [
  'Capivara Ninja',
  'Picasso da Shopee',
  'Monalisa do Pagode',
  'T-Rex de Patins',
  'Pão de Queijo Veloz',
  'Astronauta Caipira',
  'Gato Cósmico',
  'Pinguim do Rock',
  'Abacate Samurai',
  'Detetive Sonolento',
  'Pikachu do Agreste',
  'Mago da Gambiarra',
  'Dinossauro Fofo',
  'Coruja da Madrugada',
  'Zé das Tintas',
  'Mestre dos Rabiscos',
  'Cachorro Caramelo',
  'Unicórnio do Piseiro'
];

export default function Lobby({ onJoin, error }: LobbyProps) {
  const queryRoom = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') : null;
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(() => (queryRoom ? queryRoom.toUpperCase() : ''));
  const [avatar, setAvatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [mode, setMode] = useState<'create' | 'join'>(() => (queryRoom ? 'join' : 'create'));
  const [nameShake, setNameShake] = useState(false);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.enabled);
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServer, setCustomServer] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('backend_url') : '') || 'https://desenho-cego-backend.onrender.com';
  });

  const handleSaveServer = () => {
    sounds.playClick();
    if (customServer.trim()) {
      localStorage.setItem('backend_url', customServer.trim());
      window.location.reload();
    }
  };

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) sounds.playPop();
  };

  const generateRandomName = () => {
    sounds.playPop();
    const randomPick = FUNNY_NICKNAMES[Math.floor(Math.random() * FUNNY_NICKNAMES.length)];
    setName(randomPick);
    setShowNameWarning(false);
  };

  const generateRoom = () => {
    sounds.playPop();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(code);
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
    <div className="min-h-screen w-full flex items-center justify-center p-2.5 sm:p-6 relative overflow-hidden bg-[#f8f7f2]">
      {/* Floating Sound & Server Config Toggles */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setShowServerModal(true)}
          className="p-2 sm:p-2.5 rounded-xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] hover:bg-amber-50 text-zinc-800 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Configurar Servidor Online"
        >
          <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900" />
        </button>
        <button
          type="button"
          onClick={toggleSound}
          className="p-2 sm:p-2.5 rounded-xl bg-white border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] hover:bg-amber-50 text-zinc-800 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-w-[36px] min-h-[36px] flex items-center justify-center"
          title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
        </button>
      </div>

      {/* Central Console */}
      <div className="w-full max-w-xl mx-auto relative z-10 py-2 sm:py-4">
        
        {/* Simple Hand-Drawn Header */}
        <div className="text-center mb-3 sm:mb-4 select-none">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 border-2 border-zinc-900 px-3 py-1 rounded-full text-xs font-sketch font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Quem não sabe desenhar ganha!</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-zinc-900 font-sketch tracking-tight leading-none">
            Desenho Cego ✏️
          </h1>
          <p className="text-zinc-500 font-sketch text-base sm:text-lg mt-1">
            jogo de adivinhação e rabiscos no caderno
          </p>
        </div>

        {/* Compact Connected Step Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 text-xs font-sketch text-center"
        >
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl bg-amber-50 border-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_#18181b]">
            <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span className="font-bold truncate text-sm">1. Pistas</span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl bg-pink-50 border-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_#18181b]">
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-600 shrink-0" />
            <span className="font-bold truncate text-sm">2. Desenho</span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl bg-blue-50 border-2 border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_#18181b]">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
            <span className="font-bold truncate text-sm">3. Votação</span>
          </div>
        </motion.div>

        {/* Main Elevated Paper Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white border-2 border-zinc-900 rounded-2xl p-4 sm:p-7 relative shadow-[4px_5px_0px_#18181b] sketch-tape"
        >
          {/* Mode Switcher Tabs */}
          <div className="flex bg-zinc-100 p-1 rounded-xl mb-4 sm:mb-5 border-2 border-zinc-900 font-sketch shadow-[2px_2px_0px_#18181b]">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('create');
              }}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-amber-300 text-zinc-900 font-black border-2 border-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>✏️ Criar Nova Sala</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('join');
              }}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'join'
                  ? 'bg-amber-300 text-zinc-900 font-black border-2 border-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>🔑 Entrar com Código</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 relative z-10">
            {/* Player Nickname & Big Avatar Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-sketch">
                <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <span>👤 Seu Apelido</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomName}
                  title="Sortear um apelido engraçado"
                  className="text-xs text-zinc-900 bg-white hover:bg-amber-50 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold font-sketch transition-all"
                >
                  <Dices className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">Sortear Nome 🎲</span>
                  <span className="xs:hidden">Sortear 🎲</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Active Avatar Badge */}
                <motion.div 
                  key={avatar}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-amber-100 border-2 border-zinc-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b] shrink-0 select-none p-1.5"
                >
                  <AvatarIcon avatar={avatar} className="w-10 h-10 sm:w-12 sm:h-12" />
                </motion.div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value.trim()) setShowNameWarning(false);
                    }}
                    className={`input-party w-full rounded-xl px-3.5 sm:px-4 py-3 text-zinc-900 placeholder:text-zinc-400 font-sketch text-lg focus:outline-none ${
                      nameShake ? 'animate-shake border-red-500 ring-2 ring-red-500/40' : ''
                    }`}
                    placeholder="Ex: Pedro, Capivara, Giu..."
                    maxLength={20}
                  />

                  {showNameWarning && (
                    <span className="absolute -bottom-5 left-1 text-xs text-red-600 font-bold flex items-center gap-1 font-sketch">
                      <AlertCircle className="w-3 h-3" /> Digite seu apelido para começar!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar Selector Grid */}
            <div className="pt-1">
              <AvatarPicker selectedAvatar={avatar} onSelect={setAvatar} />
            </div>

            {/* Room Code Section */}
            {mode === 'join' ? (
              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 mb-1.5 font-sketch">
                  🔑 Digite o Código da Sala:
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="input-party w-full rounded-xl px-4 py-3 text-zinc-900 font-mono uppercase tracking-widest text-center text-xl font-black placeholder:text-zinc-400 placeholder:normal-case focus:outline-none"
                  placeholder="Ex: SALA99"
                  required
                  maxLength={10}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5 font-sketch">
                  <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700">
                    🏷️ Código da Sala
                  </label>
                  <button
                    type="button"
                    onClick={generateRoom}
                    className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold transition-colors font-sketch"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Gerar código aleatório
                  </button>
                </div>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="input-party w-full rounded-xl px-4 py-2.5 text-zinc-900 font-mono uppercase tracking-widest text-center text-base font-semibold placeholder:text-zinc-400 placeholder:normal-case focus:outline-none"
                  placeholder="Opcional (criaremos um para você)"
                  maxLength={10}
                />
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100 border-2 border-red-600 text-red-700 p-3 rounded-xl text-sm text-center font-bold font-sketch"
              >
                ⚠️ {error}
              </motion.div>
            )}

            {/* Hand-Drawn Primary CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full btn-arcade-gold py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl flex items-center justify-center gap-2 sm:gap-3 text-xl font-sketch font-bold tracking-wide min-h-[48px]"
              >
                <span>{mode === 'create' ? 'CRIAR SALA E JOGAR ➔' : 'ENTRAR NA SALA ➔'}</span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] shrink-0" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Server Config Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-[4px_5px_0px_#18181b] font-sketch"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-900" /> Servidor Multiplayer Online
            </h3>
            <p className="text-sm text-zinc-600 mb-3 leading-relaxed">
              O jogo se conecta automaticamente ao backend no Render. Se você estiver usando uma URL personalizada, pode salvá-la aqui:
            </p>
            <input
              type="text"
              value={customServer}
              onChange={(e) => setCustomServer(e.target.value)}
              placeholder="https://desenho-cego-backend.onrender.com"
              className="w-full bg-zinc-50 border-2 border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 mb-4 focus:outline-none focus:border-black font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-600 hover:text-zinc-900"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveServer}
                className="btn-arcade-gold px-4 py-2 rounded-xl text-sm font-bold"
              >
                Salvar e Conectar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}