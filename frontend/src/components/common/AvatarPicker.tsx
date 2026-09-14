import { motion } from 'framer-motion';
import { sounds } from '../../utils/audioFx';
import { AVATARS } from '../../types';
import AvatarIcon, { AVATAR_NAMES } from './AvatarIcon';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export default function AvatarPicker({ selectedAvatar, onSelect }: AvatarPickerProps) {
  const currentName = AVATAR_NAMES[selectedAvatar] || 'Personagem';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-sketch">
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
          <span>✏️ Escolha seu Personagem:</span>
        </label>
        <span className="text-xs text-zinc-900 bg-amber-200 border-2 border-zinc-900 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_#18181b]">
          <AvatarIcon avatar={selectedAvatar} className="w-4 h-4" />
          <span>{currentName}</span>
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 bg-white p-2 rounded-xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]">
        {AVATARS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;

          return (
            <motion.button
              key={avatar}
              type="button"
              title={AVATAR_NAMES[avatar] || avatar}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              animate={{ 
                scale: isSelected ? 1.08 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={() => {
                sounds.playPop();
                onSelect(avatar);
              }}
              className={`h-11 sm:h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none p-1 ${
                isSelected
                  ? 'bg-amber-300 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-zinc-50 hover:bg-yellow-50 border border-zinc-300'
              }`}
            >
              <AvatarIcon avatar={avatar} className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
