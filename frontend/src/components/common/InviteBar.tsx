import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { getShareUrl } from '../../socket/client';
import { sounds } from '../../utils/audioFx';

interface InviteBarProps {
  roomId: string;
  layout?: 'row' | 'grid';
}

/** Barra única de convite — copiar link + WhatsApp. Substitui as 3 cópias em App/MobileWaitingRoom. */
export default function InviteBar({ roomId, layout = 'row' }: InviteBarProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInviteLink = () => {
    sounds.playClick();
    navigator.clipboard.writeText(getShareUrl(roomId));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const url = getShareUrl(roomId);
    const text = encodeURIComponent(
      `🎨 Vem jogar Desenho Cego comigo! Código da sala: ${roomId}. Entra direto: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const container =
    layout === 'grid'
      ? 'grid grid-cols-2 gap-2.5'
      : 'p-3.5 bg-zinc-50 border-2 border-zinc-900 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[2px_2px_0px_#18181b]';

  if (layout === 'grid') {
    return (
      <div className={container}>
        <button
          onClick={handleShareWhatsApp}
          type="button"
          className="h-13 flex items-center justify-center gap-2 bg-[#25D366] active:bg-[#20bd5a] text-zinc-950 font-black text-sm px-3 rounded-2xl border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={handleCopyInviteLink}
          type="button"
          className="h-13 flex items-center justify-center gap-2 bg-white active:bg-zinc-100 text-zinc-900 font-black text-sm px-3 rounded-2xl border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px]"
        >
          {copiedLink ? (
            <Check className="w-4 h-4 text-green-700 stroke-[2.5]" />
          ) : (
            <Link2 className="w-4 h-4 text-blue-600" />
          )}
          <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={container}>
      <div className="text-left">
        <span className="text-sm font-black text-zinc-900 block font-sketch">Convidar Amigos</span>
        <span className="text-xs text-zinc-500 font-sketch">Envie o link direto para a galera</span>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={handleCopyInviteLink}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-100 border-2 border-zinc-900 text-xs font-bold px-3.5 py-2.5 rounded-xl text-zinc-900 transition-all active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_#18181b] font-sketch"
        >
          {copiedLink ? (
            <Check className="w-4 h-4 text-green-700" />
          ) : (
            <Link2 className="w-4 h-4 text-blue-600" />
          )}
          <span>{copiedLink ? 'Link Copiado! ✓' : 'Copiar Link'}</span>
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-zinc-900 text-xs font-black px-4 py-2.5 rounded-xl border-2 border-zinc-900 transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] font-sketch"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
