import { motion, AnimatePresence } from 'framer-motion';
import type { ReactionItem } from '../../types';
import { sounds } from '../../utils/audioFx';

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['😂', '🔥', '👏', '😱', '🎨', '💩'];

export default function FloatingReactions({ reactions, onSendReaction }: FloatingReactionsProps) {
  return (
    <>
      {/* Floating Emojis Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: '100vh', scale: 0.6, x: `${r.x}vw` }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: '-10vh',
                scale: [0.6, 1.3, 1.1, 0.8],
                x: [`${r.x}vw`, `${r.x + (Math.random() * 6 - 3)}vw`, `${r.x}vw`],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeOut' }}
              className="absolute text-4xl sm:text-5xl flex flex-col items-center drop-shadow-lg"
            >
              <span>{r.emoji}</span>
              {r.senderName && (
                <span className="text-[10px] font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-full border border-zinc-900 shadow-[1px_1px_0px_#18181b] mt-1 whitespace-nowrap font-sketch">
                  {r.senderName}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Reaction Bottom Bar */}
      <div className="fixed bottom-2 sm:bottom-3 pb-safe left-1/2 -translate-x-1/2 z-40 bg-white border-2 border-zinc-900 px-2.5 sm:px-3 py-1 rounded-full shadow-[3px_3px_0px_#18181b] flex items-center gap-1 sm:gap-1.5 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar font-sketch">
        <span className="text-xs font-bold text-zinc-700 mr-1 hidden sm:inline font-kalam">
          Reagir:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.25, y: -2 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              sounds.playPop();
              onSendReaction(emoji);
            }}
            className="text-lg sm:text-2xl p-1 rounded-xl hover:bg-yellow-100 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0"
            title={`Reagir com ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </>
  );
}
