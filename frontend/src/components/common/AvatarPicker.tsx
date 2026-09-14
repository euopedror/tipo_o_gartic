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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-sketch">
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
          <span>✏️ Escolha seu Personagem:</span>
        </label>
        <span className="text-xs sm:text-sm text-zinc-900 bg-amber-200 border-2 border-zinc-900 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold flex items-center gap-1.5 sm:gap-2 shadow-[1.5px_1.5px_0px_#18181b]">
          <AvatarIcon avatar={selectedAvatar} className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>{currentName}</span>
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 bg-amber-50/70 p-2 sm:p-2.5 rounded-2xl border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]">
        {AVATARS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;

          return (
            <motion.button
              key={avatar}
              type="button"
              title={AVATAR_NAMES[avatar] || avatar}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              animate={{ 
                scale: isSelected ? 1.06 : 1,
              }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              onClick={() => {
                sounds.playPop();
                onSelect(avatar);
              }}
              className={`aspect-square w-full rounded-xl flex items-center justify-center transition-all cursor-pointer select-none p-1 relative ${
                isSelected
                  ? 'bg-amber-300 border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ring-2 ring-amber-400'
                  : 'bg-white hover:bg-yellow-50 border border-zinc-300 hover:border-zinc-800'
              }`}
            >
              <AvatarIcon avatar={avatar} className="w-full h-full max-w-[48px] max-h-[48px]" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
