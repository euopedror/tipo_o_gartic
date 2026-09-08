import { motion } from 'framer-motion';
import { sounds } from '../../utils/audioFx';
import { AVATARS } from '../../types';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

const AVATAR_COLORS: Record<string, string> = {
  '🦊': 'bg-orange-500/15 border-orange-500/30 hover:bg-orange-500/25 text-orange-200',
  '🦁': 'bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25 text-amber-200',
  '🐸': 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-200',
  '🐼': 'bg-slate-400/15 border-slate-400/30 hover:bg-slate-400/25 text-slate-200',
  '🦄': 'bg-pink-500/15 border-pink-400/30 hover:bg-pink-500/25 text-pink-200',
  '🤖': 'bg-cyan-500/15 border-cyan-400/30 hover:bg-cyan-500/25 text-cyan-200',
  '👻': 'bg-purple-500/15 border-purple-400/30 hover:bg-purple-500/25 text-purple-200',
  '👽': 'bg-lime-500/15 border-lime-400/30 hover:bg-lime-500/25 text-lime-200',
  '🦖': 'bg-teal-500/15 border-teal-400/30 hover:bg-teal-500/25 text-teal-200',
  '🐱': 'bg-yellow-500/15 border-yellow-400/30 hover:bg-yellow-500/25 text-yellow-200',
  '🐶': 'bg-amber-600/15 border-amber-600/30 hover:bg-amber-600/25 text-amber-200',
  '🍕': 'bg-red-500/15 border-red-400/30 hover:bg-red-500/25 text-red-200',
  '🚀': 'bg-blue-500/15 border-blue-400/30 hover:bg-blue-500/25 text-blue-200',
  '👑': 'bg-yellow-400/20 border-yellow-400/40 hover:bg-yellow-400/30 text-yellow-200',
  '🎨': 'bg-violet-500/20 border-violet-400/40 hover:bg-violet-500/30 text-violet-200',
  '🕶️': 'bg-indigo-500/15 border-indigo-400/30 hover:bg-indigo-500/25 text-indigo-200',
  '⚡': 'bg-amber-400/15 border-amber-300/30 hover:bg-amber-400/25 text-amber-200',
  '🥑': 'bg-green-500/15 border-green-400/30 hover:bg-green-500/25 text-green-200'
};

export default function AvatarPicker({ selectedAvatar, onSelect }: AvatarPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-display">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span>🎭 Escolha seu Personagem</span>
        </label>
        <span className="text-xs text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
          {selectedAvatar} Selecionado
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
        {AVATARS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;
          const colorClass = AVATAR_COLORS[avatar] || 'bg-slate-800/80 border-slate-700/80';

          return (
            <motion.button
              key={avatar}
              type="button"
              whileHover={{ scale: 1.16, y: -2 }}
              whileTap={{ scale: 0.88 }}
              animate={{ 
                scale: isSelected ? 1.14 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={() => {
                sounds.playPop();
                onSelect(avatar);
              }}
              className={`text-2xl sm:text-3xl h-12 w-full rounded-2xl flex items-center justify-center transition-all relative border-2 ${
                isSelected
                  ? 'bg-amber-400/25 border-amber-400 ring-3 ring-amber-400 ring-offset-2 ring-offset-[#0b0d1e] shadow-lg shadow-amber-400/40 z-10'
                  : colorClass
              }`}
            >
              <span className="drop-shadow-sm">{avatar}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
