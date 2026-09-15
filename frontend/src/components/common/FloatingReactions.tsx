import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, X } from 'lucide-react';
import type { ReactionItem } from '../../types';
import { sounds } from '../../utils/audioFx';

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onSendReaction: (emoji: string) => void;
  isMobile?: boolean;
}

const QUICK_EMOJIS = ['😂', '🔥', '👏', '😱', '🎨', '💩'];

export default function FloatingReactions({
  reactions,
  onSendReaction,
  isMobile = false,
}: FloatingReactionsProps) {
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);

  const handleSelectEmoji = (emoji: string) => {
    sounds.playPop();
    onSendReaction(emoji);
  };

  return (
    <>
      {/* Floating Emojis Animation Stream */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
        <AnimatePresence>
          {reactions.map((r) => {
            // On mobile, keep emojis to the right side (65vw - 85vw) so they never cover central text or cards
            const xPos = isMobile
              ? Math.min(Math.max(Number(r.x) || 75, 65), 85)
              : Number(r.x) || 50;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: '95vh', scale: 0.5, x: `${xPos}vw` }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: '-10vh',
                  scale: [0.5, 1.2, 1.1, 0.8],
                  x: [`${xPos}vw`, `${xPos + (isMobile ? 2 : Math.random() * 6 - 3)}vw`, `${xPos}vw`],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
                className="absolute text-3xl sm:text-5xl flex flex-col items-center drop-shadow-md pointer-events-none"
              >
                <span>{r.emoji}</span>
                {r.senderName && (
                  <span className="text-[10px] font-black text-zinc-900 bg-amber-200 px-2 py-0.5 rounded-full border border-zinc-900 shadow-[1px_1px_0px_#18181b] mt-0.5 whitespace-nowrap font-sketch scale-90 sm:scale-100">
                    {r.senderName}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Trigger & Picker: MOBILE vs DESKTOP */}
      {isMobile ? (
        /* Mobile: Discrete Floating Trigger in Bottom-Right (above sticky action bars) */
        <div className="fixed bottom-22 right-3.5 z-40 flex flex-col items-end gap-2 select-none font-sketch">
          {/* Expanded Emoji Tray */}
          <AnimatePresence>
            {mobilePickerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="bg-white border-2 border-zinc-900 p-1.5 rounded-2xl shadow-[3px_3px_0px_#18181b] flex items-center gap-1"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => handleSelectEmoji(emoji)}
                    className="w-10 h-10 rounded-xl hover:bg-amber-100 active:bg-amber-200 flex items-center justify-center text-2xl transition-colors shrink-0"
                    title={`Reagir ${emoji}`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Bubble Toggle Button */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMobilePickerOpen(!mobilePickerOpen);
            }}
            className={`w-11 h-11 rounded-full border-2 border-zinc-900 flex items-center justify-center text-zinc-900 shadow-[2px_2px_0px_#18181b] transition-all active:scale-95 ${
              mobilePickerOpen ? 'bg-zinc-900 text-white' : 'bg-amber-300'
            }`}
            title="Reações rápidas"
          >
            {mobilePickerOpen ? (
              <X className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Smile className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </div>
      ) : (
        /* Desktop: Centered Floating Bar */
        <div className="fixed bottom-2 sm:bottom-3 pb-safe left-1/2 -translate-x-1/2 z-40 bg-white border-2 border-zinc-900 px-3 py-1 rounded-full shadow-[3px_3px_0px_#18181b] flex items-center gap-1 sm:gap-1.5 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar font-sketch">
          <span className="text-xs font-bold text-zinc-700 mr-1 hidden sm:inline font-kalam">
            Reagir:
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.25, y: -2 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleSelectEmoji(emoji)}
              className="text-lg sm:text-2xl p-1 rounded-xl hover:bg-yellow-100 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0"
              title={`Reagir com ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      )}
    </>
  );
}
