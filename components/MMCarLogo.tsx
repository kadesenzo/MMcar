import React, { useId } from 'react';

export interface MMCarLogoProps {
  className?: string;
  variant?: 'horizontal' | 'icon' | 'badge' | 'stacked';
  alt?: string;
  theme?: 'dark' | 'light';
}

export const MMCarLogo: React.FC<MMCarLogoProps> = ({
  className = 'h-10',
  variant = 'horizontal',
  theme = 'dark'
}) => {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const Defs = () => (
    <defs>
      <linearGradient id={`${id}-mmRed`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF3B5C" />
        <stop offset="50%" stopColor="#E11D48" />
        <stop offset="100%" stopColor="#9F1239" />
      </linearGradient>
      <linearGradient id={`${id}-mmMetal`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={theme === 'dark' ? '#FFFFFF' : '#1E293B'} />
        <stop offset="55%" stopColor={theme === 'dark' ? '#E2E8F0' : '#0F172A'} />
        <stop offset="100%" stopColor={theme === 'dark' ? '#94A3B8' : '#020617'} />
      </linearGradient>
      <linearGradient id={`${id}-mmRing`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="50%" stopColor="#64748B" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.65" />
      </filter>
    </defs>
  );

  // 1. ICON VARIANT (Hexagonal Crest + Stylized Double M Speed Emblem)
  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 160 160"
        className={`select-none shrink-0 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="MM Car Auto Center Símbolo"
      >
        <Defs />
        <g filter={`url(#${id}-shadow)`}>
          {/* Precision Shield Ring */}
          <path
            d="M 80 12 L 138 38 L 138 96 C 138 124 108 142 80 148 C 52 142 22 124 22 96 L 22 38 Z"
            fill="#0A0B0F"
            stroke={`url(#${id}-mmRing)`}
            strokeWidth="4"
          />
          <path
            d="M 80 22 L 128 44 L 128 94 C 128 117 104 132 80 138 C 56 132 32 117 32 94 L 32 44 Z"
            fill="#111319"
            stroke="#27272A"
            strokeWidth="1.5"
          />
          {/* Top Speed Accent */}
          <path d="M 46 38 L 114 38 L 106 46 L 54 46 Z" fill={`url(#${id}-mmRed)`} />
          {/* Double M Monogram */}
          <path
            d="M 38 106 L 48 56 L 64 56 L 73 84 L 83 56 L 98 56 L 108 106 L 94 106 L 88 76 L 78 102 L 68 102 L 58 76 L 52 106 Z"
            fill={`url(#${id}-mmMetal)`}
          />
          {/* Secondary Speed M Accent */}
          <path
            d="M 96 106 L 105 64 L 118 64 L 124 106 L 112 106 L 109 84 L 104 106 Z"
            fill={`url(#${id}-mmRed)`}
          />
          {/* Lower Caliper Line */}
          <rect x="44" y="114" width="72" height="5" rx="2.5" fill={`url(#${id}-mmRed)`} />
        </g>
      </svg>
    );
  }

  // 2. BADGE VARIANT
  if (variant === 'badge') {
    return (
      <div className="relative inline-flex items-center justify-center p-2 rounded-2xl bg-zinc-950 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <MMCarLogo variant="icon" className={className} theme={theme} />
      </div>
    );
  }

  // 3. STACKED VARIANT
  if (variant === 'stacked') {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <MMCarLogo variant="icon" className="h-20 sm:h-24 w-auto mb-3" theme={theme} />
        <div className="flex items-baseline gap-2">
          <span
            className={`text-4xl sm:text-5xl font-black italic tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-zinc-950'
            }`}
            style={{ fontFamily: "'Kanit', 'Outfit', sans-serif" }}
          >
            MM CAR
          </span>
        </div>
        <div className="mt-1.5 bg-gradient-to-r from-[#FF3B5C] to-[#9F1239] px-4 py-1 rounded-sm transform -skew-x-12">
          <span
            className="text-[10px] sm:text-xs font-black italic tracking-[0.28em] text-white block uppercase"
            style={{ fontFamily: "'Kanit', 'Outfit', sans-serif" }}
          >
            AUTO CENTER · GESTÃO
          </span>
        </div>
      </div>
    );
  }

  // 4. DEFAULT HORIZONTAL WORDMARK
  return (
    <svg
      viewBox="0 0 430 120"
      className={`select-none shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MM Car Auto Center Logo"
    >
      <Defs />
      <g filter={`url(#${id}-shadow)`}>
        {/* Emblem Crest */}
        <path
          d="M 56 12 L 98 30 L 98 74 C 98 95 76 108 56 112 C 36 108 14 95 14 74 L 14 30 Z"
          fill="#0A0B0F"
          stroke={`url(#${id}-mmRing)`}
          strokeWidth="3.5"
        />
        <path d="M 32 31 L 80 31 L 74 37 L 38 37 Z" fill={`url(#${id}-mmRed)`} />
        <path
          d="M 27 81 L 34 45 L 46 45 L 53 66 L 60 45 L 72 45 L 79 81 L 68 81 L 64 59 L 56 78 L 50 78 L 42 59 L 38 81 Z"
          fill="#FFFFFF"
        />
        <rect x="31" y="88" width="50" height="4" rx="2" fill={`url(#${id}-mmRed)`} />

        {/* Wordmark */}
        <text
          x="116"
          y="68"
          fontFamily="'Kanit', 'Changa', 'Outfit', sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="58"
          letterSpacing="1"
          fill={`url(#${id}-mmMetal)`}
        >
          MM CAR
        </text>

        {/* Crimson Accent Bar */}
        <polygon points="116,80 398,80 388,100 108,100" fill={`url(#${id}-mmRed)`} />
        <text
          x="252"
          y="94.5"
          textAnchor="middle"
          fontFamily="'Kanit', 'Outfit', sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="12.5"
          letterSpacing="4.5"
          fill="#FFFFFF"
        >
          AUTO CENTER · PRO
        </text>
      </g>
    </svg>
  );
};

export default MMCarLogo;
