import { PartyPopper, PencilLine } from 'lucide-react';

interface InviteBannerProps {
  roomCode: string;
  onSwitchRoom?: () => void;
}

/** Banner de convite direto — quem abriu o link vê a sala travada e foca em nome + personagem. */
export default function InviteBanner({ roomCode, onSwitchRoom }: InviteBannerProps) {
  return (
    <div className="bg-amber-100 border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-4 shadow-[3px_3px_0px_#18181b] text-center mb-4 font-sketch">
      <div className="flex items-center justify-center gap-2 mb-1">
        <PartyPopper className="w-5 h-5 text-amber-700 shrink-0" />
        <span className="text-base sm:text-lg font-black text-zinc-900">Você foi convidado! 🎉</span>
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs sm:text-sm text-zinc-600 font-bold">Sala:</span>
        <span className="text-xl sm:text-2xl font-mono font-black text-blue-700 tracking-widest">
          {roomCode}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-zinc-600 mt-1 flex items-center justify-center gap-1">
        <PencilLine className="w-3.5 h-3.5 shrink-0" />
        <span>Escolha seu nome e personagem abaixo para entrar</span>
      </p>
      {onSwitchRoom && (
        <button
          type="button"
          onClick={onSwitchRoom}
          className="mt-1.5 text-xs text-blue-700 hover:text-blue-900 underline font-bold"
        >
          não é essa sala? trocar código
        </button>
      )}
    </div>
  );
}
