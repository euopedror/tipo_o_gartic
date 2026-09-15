import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

const DEVICE_OVERRIDE_KEY = 'device_override';

export type DeviceOverride = 'auto' | 'mobile' | 'desktop';

export function getDeviceOverride(): DeviceOverride {
  if (typeof window === 'undefined') return 'auto';
  const saved = window.localStorage.getItem(DEVICE_OVERRIDE_KEY);
  if (saved === 'mobile' || saved === 'desktop' || saved === 'auto') return saved;
  return 'auto';
}

export function setDeviceOverride(mode: DeviceOverride) {
  if (typeof window === 'undefined') return;
  if (mode === 'auto') {
    window.localStorage.removeItem(DEVICE_OVERRIDE_KEY);
  } else {
    window.localStorage.setItem(DEVICE_OVERRIDE_KEY, mode);
  }
  window.dispatchEvent(new CustomEvent('device-override-change', { detail: mode }));
}

function resolveDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTouch: false, orientation: 'portrait' };
  }

  // 1. Manual override wins (Lobby toggle "Ver como no celular/PC")
  const override = getDeviceOverride();
  if (override === 'mobile') {
    const isPortrait = window.innerHeight >= window.innerWidth;
    return { isMobile: true, isTouch: true, orientation: isPortrait ? 'portrait' : 'landscape' };
  }
  if (override === 'desktop') {
    return { isMobile: false, isTouch: false, orientation: 'landscape' };
  }

  // 2. Support testing overrides via ?device=mobile or ?device=desktop
  const searchParams = new URLSearchParams(window.location.search);
  const forced = searchParams.get('device');
  if (forced === 'mobile') return { isMobile: true, isTouch: true, orientation: 'portrait' };
  if (forced === 'desktop') return { isMobile: false, isTouch: false, orientation: 'landscape' };

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isPortrait = window.innerHeight >= window.innerWidth;

  return {
    isMobile: isSmallScreen || (isMobileUA && hasTouch),
    isTouch: hasTouch,
    orientation: isPortrait ? 'portrait' : 'landscape',
  };
}

export function useIsMobile(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => resolveDevice());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      setDeviceInfo(resolveDevice());
    };

    const handleOverride = () => {
      setDeviceInfo(resolveDevice());
    };

    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    window.addEventListener('device-override-change', handleOverride);

    const mql = window.matchMedia('(max-width: 767px)');
    mql.addEventListener('change', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
      window.removeEventListener('device-override-change', handleOverride);
      mql.removeEventListener('change', checkDevice);
    };
  }, []);

  return deviceInfo;
}
