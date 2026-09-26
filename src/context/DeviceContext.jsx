import React, { createContext, useContext, useState, useEffect } from 'react';

const DeviceContext = createContext(null);

export function detectHardwareDevice() {
  if (typeof window === 'undefined') {
    return {
      detectedType: 'mac',
      isStandalone: false,
      isIOS: false,
      orientation: 'landscape',
      width: 1280
    };
  }

  const ua = window.navigator.userAgent || '';
  const platform = window.navigator.platform || '';
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width > height ? 'landscape' : 'portrait';

  const isStandalone =
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

  // Detect iPad (including iPadOS 13+ which reports Macintosh in UA with maxTouchPoints > 1)
  const isIPadHardware =
    /iPad/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1) ||
    (/Macintosh/i.test(ua) && maxTouchPoints > 1);

  // Detect iPhone / iPod / mobile phone
  const isIPhoneHardware = /iPhone|iPod/i.test(ua);
  const isAndroidPhone = /Android/i.test(ua) && /Mobile/i.test(ua);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  const isIOS = isIPadHardware || isIPhoneHardware;

  let detectedType = 'mac';

  if (isIPhoneHardware || isAndroidPhone || width < 700) {
    detectedType = 'iphone';
  } else if (isIPadHardware || isAndroidTablet || (width >= 700 && width < 1180)) {
    detectedType = 'ipad';
  } else {
    detectedType = 'mac';
  }

  return {
    detectedType,
    isStandalone,
    isIOS,
    orientation,
    width
  };
}

export const DeviceProvider = ({ children }) => {
  const [hardwareInfo, setHardwareInfo] = useState(() => detectHardwareDevice());
  const [overrideDevice, setOverrideDevice] = useState(() => {
    try {
      return sessionStorage.getItem('medchem_device_override') || 'auto';
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setHardwareInfo(detectHardwareDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleSetOverride = (mode) => {
    setOverrideDevice(mode);
    try {
      if (mode === 'auto') {
        sessionStorage.removeItem('medchem_device_override');
      } else {
        sessionStorage.setItem('medchem_device_override', mode);
      }
    } catch {
      // ignore storage errors
    }
  };

  const deviceType = overrideDevice === 'auto' ? hardwareInfo.detectedType : overrideDevice;

  // Sync device attributes onto <html> and <body> for CSS safe-area & adaptive rules
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-device', deviceType);
      document.documentElement.setAttribute('data-standalone', String(hardwareInfo.isStandalone));
      document.documentElement.setAttribute('data-ios', String(hardwareInfo.isIOS));
      document.documentElement.setAttribute('data-orientation', hardwareInfo.orientation);
    }
  }, [deviceType, hardwareInfo.isStandalone, hardwareInfo.isIOS, hardwareInfo.orientation]);

  const deviceLabel =
    deviceType === 'iphone'
      ? 'iPhone'
      : deviceType === 'ipad'
      ? 'iPad'
      : 'Mac / Laptop';

  return (
    <DeviceContext.Provider
      value={{
        deviceType, // 'iphone' | 'ipad' | 'mac'
        detectedType: hardwareInfo.detectedType,
        overrideDevice, // 'auto' | 'iphone' | 'ipad' | 'mac'
        setOverrideDevice: handleSetOverride,
        isStandalone: hardwareInfo.isStandalone,
        isIOS: hardwareInfo.isIOS,
        orientation: hardwareInfo.orientation,
        viewportWidth: hardwareInfo.width,
        deviceLabel,
        isIPhone: deviceType === 'iphone',
        isIPad: deviceType === 'ipad',
        isMac: deviceType === 'mac'
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    return {
      deviceType: 'mac',
      detectedType: 'mac',
      overrideDevice: 'auto',
      setOverrideDevice: () => {},
      isStandalone: false,
      isIOS: false,
      orientation: 'landscape',
      viewportWidth: 1280,
      deviceLabel: 'Mac / Laptop',
      isIPhone: false,
      isIPad: false,
      isMac: true
    };
  }
  return ctx;
};
