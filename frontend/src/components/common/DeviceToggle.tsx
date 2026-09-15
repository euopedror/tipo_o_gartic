import { useEffect, useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { getDeviceOverride, setDeviceOverride, type DeviceOverride } from '../../hooks/useIsMobile';
import { sounds } from '../../utils/audioFx';

/** Toggle manual "Ver como no celular / PC" — grava device_override e força DeviceGate. */
export default function DeviceToggle({ compact }: { compact?: boolean }) {
  const [mode, setMode] = useState<DeviceOverride>(() => getDeviceOverride());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DeviceOverride>).detail;
      if (detail) setMode(detail);
    };
    window.addEventListener('device-override-change', handler);
    return () => window.removeEventListener('device-override-change', handler);
  }, []);

  const next: DeviceOverride = mode === 'mobile' ? 'desktop' : mode === 'desktop' ? 'auto' : 'mobile';
  const label =
    mode === 'mobile' ? '📱 Versão celular (toque p/ PC)' : mode === 'desktop' ? '🖥️ Versão PC (toque p/ auto)' : '🔀 Auto (toque p/ celular)';

  return (
    <button
      type="button"
      title="Alternar entre layout mobile e desktop"
      onClick={() => {
        sounds.playClick();
        setDeviceOverride(next);
        setMode(next);
      }}
      className={`flex items-center gap-1.5 bg-white hover:bg-amber-50 border-2 border-zinc-900 rounded-xl font-sketch font-bold text-zinc-800 shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] transition-all ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
      }`}
    >
      <MonitorSmartphone className="w-3.5 h-3.5 shrink-0" />
      <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
    </button>
  );
}
