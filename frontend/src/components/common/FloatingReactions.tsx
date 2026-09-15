import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactionItem } from '../../types';
import { sounds } from '../../utils/audioFx';

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onSendReaction: (emoji: string) => void;
  isMobile?: boolean;
  /** Host mutou as reações nas regras — esconde a barra */
  disabled?: boolean;
}

const QUICK_EMOJIS = ['😂', '🔥', '👏', '😱', '🎨', '💩'];

// Anti-flood local: 1 reação a cada 1.5s (o servidor também descarta o excesso)
const REACTION_COOLDOWN_MS = 1500;

/** Ícone doodle novo no traço do jogo: explosão de festa com rostinho. */
export function ReactionDoodle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
      <path
        d="M 24 4 L 27.5 12 L 35 8.5 L 34 17 L 42 18.5 L 36.5 24 L 42 29.5 L 34 31 L 35 39.5 L 27.5 36 L 24 44 L 20.5 36 L 13 39.5 L 14 31 L 6 29.5 L 11.5 24 L 6 18.5 L 14 17 L 13 8.5 L 20.5 12 Z"
        fill="#fde047"
        stroke="#18181b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="22" r="1.6" fill="#18181b" />
      <circle cx="28" cy="22" r="1.6" fill="#18181b" />
      <path d="M 20 26.5 Q 24 30 28 26.5" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 38 8 L 41 5 M 9 7 L 6 4 M 42 38 L 44 41" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function FloatingReactions({
  reactions,
  onSendReaction,
  isMobile = false,
  disabled = false,
}: FloatingReactionsProps) {
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const cooldownRef = useRef<number | null>(null);

  if (disabled) return null;

  const handleSelectEmoji = (emoji: string) => {
    if (cooling) return;
    sounds.playPop();
    onSendReaction(emoji);
    setCooling(true);
    if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    cooldownRef.current = window.setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS);
  };

  const visible = reactions.slice(-12);

  return (
    <>
      {/* Floating Emojis Animation Stream */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
        <AnimatePresence>
          {visible.map((r) => {
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
        /* Mobile: bolha discreta acima das barras fixas */
        <div className="fixed bottom-24 right-3.5 z-40 flex flex-col items-end gap-2 select-none font-sketch">
          {/* Expanded Emoji Tray */}
          <AnimatePresence>
            {mobilePickerOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="bg-amber-50 border-2 border-zinc-900 p-1.5 rounded-2xl shadow-[3px_3px_0px_#18181b] flex items-center gap-1"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.8 }}
                    disabled={cooling}
                    onClick={() => handleSelectEmoji(emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all shrink-0 border-2 ${
                      cooling
                        ? 'opacity-30 border-transparent'
                        : 'hover:bg-amber-200 active:bg-amber-300 border-transparent hover:border-zinc-900'
                    }`}
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
            className={`w-11 h-11 rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b] transition-all active:scale-95 p-1 ${
              mobilePickerOpen ? 'bg-zinc-900' : 'bg-amber-300 hover:bg-amber-400'
            }`}
            title="Reações rápidas"
          >
            {mobilePickerOpen ? (
              <X className="w-5 h-5 stroke-[2.5] text-white" />
            ) : (
              <ReactionDoodle className="w-7 h-7" />
            )}
          </button>
        </div>
      ) : (
        /* Desktop: barra sketch clara com ícone doodle */
        <div className="fixed bottom-3 pb-safe left-1/2 -translate-x-1/2 z-40 bg-amber-50/95 border-2 border-zinc-900 pl-2 pr-2.5 py-1.5 rounded-2xl shadow-[3px_3px_0px_#18181b] flex items-center gap-1 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar font-sketch backdrop-blur">
          <span className="flex items-center gap-1.5 bg-amber-300 border-2 border-zinc-900 pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-black text-zinc-900 shrink-0 shadow-[1px_1px_0px_#18181b]">
            <ReactionDoodle className="w-5 h-5" />
            <span className="hidden sm:inline">Reagir</span>
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={cooling ? undefined : { scale: 1.25, y: -2 }}
              whileTap={{ scale: 0.85 }}
              disabled={cooling}
              onClick={() => handleSelectEmoji(emoji)}
              className={`text-lg sm:text-2xl p-1 rounded-xl transition-all min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0 border-2 ${
                cooling
                  ? 'opacity-30 border-transparent cursor-wait'
                  : 'border-transparent hover:bg-amber-200 hover:border-zinc-900'
              }`}
              title={cooling ? 'Calma, já vai! 😅' : `Reagir com ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      )}
    </>
  );
}
