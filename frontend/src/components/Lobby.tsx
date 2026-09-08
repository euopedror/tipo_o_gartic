import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dices, ArrowRight, Palette, EyeOff, Trophy, AlertCircle, 
  Sparkles, Volume2, VolumeX, Settings2 
} from 'lucide-react';
import AvatarPicker from './common/AvatarPicker';
import { AVATARS } from '../types';
import { sounds } from '../utils/audioFx';
import bannerImg from '../assets/banner.jpg';

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
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* Floating Sound & Server Config Toggles */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowServerModal(true)}
          className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-accent-cyan text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
          title="Configurar Servidor Online"
        >
          <Settings2 className="w-5 h-5 text-accent-cyan" />
        </button>
        <button
          type="button"
          onClick={toggleSound}
          className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-400 text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95"
          title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
        </button>
      </div>

      {/* Central Arcade Console */}
      <div className="w-full max-w-xl mx-auto relative z-10 py-2 sm:py-4">
        
        {/* Top Tagline Badge */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-amber-400/50 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg text-xs font-display font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>O Party Game Onde Quem Não Sabe Desenhar Ganha!</span>
          </div>
        </div>

        {/* 3D Illustrated Mascot Banner Frame - Full visibility without cropping */}
        <motion.div 
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="relative rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl shadow-amber-500/30 bg-slate-950">
            <img 
              src={bannerImg} 
              alt="Desenho Cego - Festa do Desenho" 
              className="w-full aspect-[16/9] object-cover object-center"
            />
          </div>
        </motion.div>

        {/* Compact Connected Step Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2 mb-3.5 text-xs font-display text-center"
        >
          <div className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 text-amber-300 shadow-md backdrop-blur-md">
            <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold truncate">1. Pistas</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-pink-500/20 border-2 border-pink-400/40 text-pink-300 shadow-md backdrop-blur-md">
            <Palette className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="font-bold truncate">2. Desenho</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-2 px-1 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/40 text-cyan-300 shadow-md backdrop-blur-md">
            <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold truncate">3. Votação</span>
          </div>
        </motion.div>

        {/* Main Elevated Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="party-card-neo p-5 sm:p-7 relative overflow-hidden"
        >
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950/85 p-1.5 rounded-2xl mb-5 border border-slate-800 font-display shadow-inner">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('create');
              }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                mode === 'create'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✨ Criar Nova Sala</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setMode('join');
              }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                mode === 'join'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔑 Entrar com Código</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Player Nickname & Big Avatar Badge */}
            <div>
              <div className="flex items-center justify-between mb-2 font-display">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <span>👤 Seu Apelido</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomName}
                  title="Sortear um apelido engraçado"
                  className="text-xs text-amber-300 hover:text-amber-200 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold transition-all active:scale-95 shadow-sm"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Sortear Nome 🎲</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Big Animated Active Avatar with Golden Ring */}
                <motion.div 
                  key={avatar}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400/30 to-violet-600/40 border-3 border-amber-400 text-4xl flex items-center justify-center shadow-lg shadow-amber-400/30 shrink-0 ring-4 ring-amber-400/30 select-none"
                >
                  {avatar}
                </motion.div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value.trim()) setShowNameWarning(false);
                    }}
                    className={`input-party w-full rounded-2xl px-4 py-3.5 text-white placeholder:text-slate-400 font-bold text-base focus:outline-none ${
                      nameShake ? 'animate-shake border-red-500 ring-2 ring-red-500/40' : ''
                    }`}
                    placeholder="Ex: Pedro, Capivara, Giu..."
                    maxLength={20}
                  />

                  {showNameWarning && (
                    <span className="absolute -bottom-5 left-1 text-[11px] text-amber-300 font-bold flex items-center gap-1">
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2 font-display">
                  🔑 Digite o Código da Sala
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="input-party w-full rounded-2xl px-4 py-3.5 text-white font-mono uppercase tracking-widest text-center text-xl font-black placeholder:text-slate-500 placeholder:normal-case focus:outline-none"
                  placeholder="Ex: SALA99"
                  required
                  maxLength={10}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2 font-display">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    🏷️ Código da Sala
                  </label>
                  <button
                    type="button"
                    onClick={generateRoom}
                    className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Gerar código aleatório
                  </button>
                </div>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="input-party w-full rounded-2xl px-4 py-3 text-white font-mono uppercase tracking-widest text-center text-sm font-semibold placeholder:text-slate-400 placeholder:normal-case focus:outline-none"
                  placeholder="Opcional (criaremos um para você)"
                  maxLength={10}
                />
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/50 text-red-300 p-3.5 rounded-2xl text-sm text-center font-bold"
              >
                ⚠️ {error}
              </motion.div>
            )}

            {/* Golden Arcade Primary CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full btn-arcade-gold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-lg sm:text-xl font-black tracking-wide"
              >
                <span>{mode === 'create' ? 'CRIAR E ENTRAR NO LOBBY' : 'ENTRAR NA SALA'}</span>
                <ArrowRight className="w-6 h-6 stroke-[3]" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Server Config Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-panel border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-accent-cyan" /> Servidor Multiplayer Online
            </h3>
            <p className="text-xs text-text-muted mb-3 leading-relaxed">
              O jogo se conecta automaticamente ao backend no Render. Se você estiver usando uma URL personalizada, pode salvá-la aqui:
            </p>
            <input
              type="text"
              value={customServer}
              onChange={(e) => setCustomServer(e.target.value)}
              placeholder="https://desenho-cego-backend.onrender.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white mb-4 focus:outline-none focus:border-accent-cyan font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-white"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveServer}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
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