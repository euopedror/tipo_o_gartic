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
                <span className="text-[10px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full border border-white/20 mt-1 whitespace-nowrap">
                  {r.senderName}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Reaction Bottom Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline font-display">
          Reagir:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.3, y: -4 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              sounds.playPop();
              onSendReaction(emoji);
            }}
            className="text-xl sm:text-2xl p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            title={`Reagir com ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </>
  );
}
