import React from 'react';

export interface AriseraLogoProps {
  variant?: 'full' | 'compact' | 'symbol';
  theme?: 'dark' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSlogan?: boolean;
}

export const AriseraLogo: React.FC<AriseraLogoProps> = ({
  variant = 'compact',
  theme = 'light',
  size = 'md',
  className = '',
  showSlogan = false,
}) => {
  const sizeMap = {
    xs: { symbol: 24, font: 'text-sm', slogan: 'text-[9px]' },
    sm: { symbol: 32, font: 'text-base', slogan: 'text-[10px]' },
    md: { symbol: 40, font: 'text-lg', slogan: 'text-xs' },
    lg: { symbol: 52, font: 'text-2xl', slogan: 'text-xs' },
    xl: { symbol: 72, font: 'text-3xl', slogan: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Identitas warna resmi ARISERA
  // Ungu utama: #6D4AFF, Ungu aksen: #9B7BFF, Latar gelap: #11111B, Putih: #FFFFFF
  const textClass = theme === 'dark' ? 'text-white' : 'text-[#11111B]';
  const sloganClass = theme === 'dark' ? 'text-slate-400' : 'text-[#85859A]';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Simbol Geometris Arisera: Segitiga membulat dengan panah melengkung ke atas */}
      <svg
        width={currentSize.symbol}
        height={currentSize.symbol}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform hover:scale-105 duration-200"
        aria-label="Logo ARISERA"
      >
        <defs>
          {/* Gradasi Sayap Kiri dan Bawah */}
          <linearGradient id="arisera_grad_outer" x1="15" y1="110" x2="105" y2="15" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4A1BD9" />
            <stop offset="35%" stopColor="#6D4AFF" />
            <stop offset="70%" stopColor="#9B7BFF" />
            <stop offset="100%" stopColor="#C026D3" />
          </linearGradient>

          {/* Gradasi Lengkungan Tepi Atas Kanan */}
          <linearGradient id="arisera_grad_right" x1="60" y1="10" x2="110" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C026D3" />
            <stop offset="45%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#581C87" />
          </linearGradient>

          {/* Gradasi Lipatan Bawah (Shadow overlap 3D) */}
          <linearGradient id="arisera_grad_fold" x1="10" y1="90" x2="60" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B0764" />
            <stop offset="100%" stopColor="#6D4AFF" />
          </linearGradient>

          {/* Gradasi Panah */}
          <linearGradient id="arisera_grad_arrow" x1="36" y1="92" x2="72" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7E22CE" />
            <stop offset="50%" stopColor="#6D4AFF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Filter bayangan halus */}
          <filter id="soft_inner_glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Bentuk Segitiga Membulat Luar (Outer Delta Ribbon) */}
        <path
          d="M60 12 C66 12, 100 78, 106 88 C111 97, 104 108, 92 108 C75 108, 45 108, 28 108 C16 108, 9 97, 14 88 C20 78, 54 12, 60 12 Z"
          fill="url(#arisera_grad_outer)"
        />

        {/* Aksen Dimensi 3D Sisi Kanan Luar */}
        <path
          d="M60 12 C66 12, 100 78, 106 88 C109 93, 106 99, 99 103 C90 85, 76 56, 60 28 C59 23, 60 12, 60 12 Z"
          fill="url(#arisera_grad_right)"
          opacity="0.85"
        />

        {/* Sudut Lengkung Bawah Kiri (Ribbon Wrap Fold) */}
        <path
          d="M14 88 C9 97, 16 108, 28 108 C38 108, 54 105, 59 98 C46 95, 26 90, 14 88 Z"
          fill="url(#arisera_grad_fold)"
        />

        {/* Delta Putih Bersih di Tengah (Negative Space Center) */}
        <path
          d="M60 38 L83 82 C85 86, 81 90, 75 90 L45 90 C39 90, 35 86, 37 82 L60 38 Z"
          fill="#FFFFFF"
          filter="url(#soft_inner_glow)"
        />

        {/* Panah Geometris Melengkung ke Atas (Arisera Rising Arrow) */}
        <g>
          {/* Batang Panah Melengkung */}
          <path
            d="M44 87 C48 76, 56 66, 66 57 L69 61 C60 69, 53 78, 49 87 Z"
            fill="url(#arisera_grad_arrow)"
          />
          {/* Kepala Panah */}
          <path
            d="M69 50 L77 62 L64 62 L69 50 Z"
            fill="#6D4AFF"
          />
          {/* Aksen highlight pada panah */}
          <path
            d="M69 50 L64 62 L69 58 Z"
            fill="#9B7BFF"
          />
        </g>
      </svg>

      {/* Tipografi Identitas Resmi ARISERA */}
      {variant !== 'symbol' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight ${currentSize.font} ${textClass}`}
              style={{ letterSpacing: '-0.03em' }}
            >
              ARISERA
            </span>
          </div>
          {(variant === 'full' || showSlogan) && (
            <span className={`font-medium ${currentSize.slogan} ${sloganClass} mt-1 leading-tight tracking-normal`}>
              Bangun. Ciptakan. Berkembang.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AriseraLogo;
