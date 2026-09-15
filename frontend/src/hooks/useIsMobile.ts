import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

export function useIsMobile(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTouch: false, orientation: 'portrait' };
    }

    // Support testing overrides via ?device=mobile or ?device=desktop
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
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const forced = searchParams.get('device');
      if (forced === 'mobile') {
        setDeviceInfo({ isMobile: true, isTouch: true, orientation: 'portrait' });
        return;
      }
      if (forced === 'desktop') {
        setDeviceInfo({ isMobile: false, isTouch: false, orientation: 'landscape' });
        return;
      }

      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight >= window.innerWidth;

      setDeviceInfo({
        isMobile: isSmallScreen || (isMobileUA && hasTouch),
        isTouch: hasTouch,
        orientation: isPortrait ? 'portrait' : 'landscape',
      });
    };

    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    const mql = window.matchMedia('(max-width: 767px)');
    mql.addEventListener('change', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
      mql.removeEventListener('change', checkDevice);
    };
  }, []);

  return deviceInfo;
}
