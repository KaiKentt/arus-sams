import React from 'react';

export default function AlertBanner({ isCritical }) {
  if (!isCritical) return null;

  return (
    <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-center py-3 font-bold animate-pulse z-50 shadow-md">
      ⚠️ CRITICAL ALERTS: LIVE iHYDRO TELEMENTRY BREACH AT BATU KAWA.
      PRIORITIZED EVACUATION ROUTINE ENGAGED!
    </div>
  );
}