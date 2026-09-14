import { motion } from 'framer-motion';
import { sounds } from '../../utils/audioFx';
import { AVATARS } from '../../types';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export default function AvatarPicker({ selectedAvatar, onSelect }: AvatarPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-sketch">
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
          <span>🎭 Escolha seu Personagem:</span>
        </label>
        <span className="text-xs text-zinc-900 bg-amber-200 border border-zinc-900 px-2 py-0.5 rounded-full font-bold">
          {selectedAvatar} Selecionado
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 bg-zinc-50 p-1.5 sm:p-2 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]">
        {AVATARS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;

          return (
            <motion.button
              key={avatar}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              animate={{ 
                scale: isSelected ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={() => {
                sounds.playPop();
                onSelect(avatar);
              }}
              className={`h-10 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-amber-300 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] font-black'
                  : 'bg-white hover:bg-amber-50 border border-zinc-300'
              }`}
            >
              <span>{avatar}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
