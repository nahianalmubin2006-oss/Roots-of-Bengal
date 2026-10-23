import React from 'react';

interface CraftArtworkProps {
  artworkIndex: number;
  variantShift?: number;
  className?: string;
  showArchivalCaption?: boolean;
  captionText?: string;
}

const PALETTES = [
  // 0: Original Prototype Rustic Palette (#e4d3ad, #b5502d, #5d7a4a, #8a4b2a)
  { bg: '#e4d3ad', primary: '#b5502d', secondary: '#8a4b2a', accent: '#5d7a4a', gold: '#c9973f', ink: '#3b2a1a' },
  // 1: Warm Sand, Moss Green & Terracotta
  { bg: '#e8d8b5', primary: '#5d7a4a', secondary: '#b5502d', accent: '#8a4b2a', gold: '#c9973f', ink: '#3b2a1a' },
  // 2: Deep Clay, Ochre & Parchment
  { bg: '#e4d3ad', primary: '#8a4b2a', secondary: '#b5502d', accent: '#c9973f', gold: '#5d7a4a', ink: '#3b2a1a' },
];

export const CraftArtwork: React.FC<CraftArtworkProps> = ({
  artworkIndex,
  variantShift = 0,
  className = '',
  showArchivalCaption = false,
  captionText = 'Archival Craft Illustration · Demo Visual',
}) => {
  const palette = PALETTES[variantShift % PALETTES.length];
  const idx = ((artworkIndex % 8) + 8) % 8;

  return (
    <div className={`relative overflow-hidden bg-[#e4d3ad] select-none ${className}`}>
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
        role="img"
        aria-label={captionText}
      >
        <defs>
          <pattern id={`grain-${idx}-${variantShift}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill={palette.ink} fillOpacity="0.08" />
            <circle cx="7" cy="6" r="0.6" fill={palette.secondary} fillOpacity="0.06" />
          </pattern>
        </defs>

        {/* Base Warm Parchment Field */}
        <rect width="200" height="200" fill={palette.bg} />
        <rect width="200" height="200" fill={`url(#grain-${idx}-${variantShift})`} />

        {/* 0: Nakshi Kantha Shatadal Padma (100-Petaled Lotus & Running Stitch Quilt) */}
        {idx === 0 && (
          <g>
            <rect
              x="12"
              y="12"
              width="176"
              height="176"
              fill="none"
              stroke={palette.primary}
              strokeWidth="3.5"
              strokeDasharray="6 4"
            />
            <rect
              x="26"
              y="26"
              width="148"
              height="148"
              fill="none"
              stroke={palette.accent}
              strokeWidth="2.5"
              strokeDasharray="2 4"
            />
            {/* Concentric Kantha Taan ripples */}
            {[58, 44].map((r, i) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={i % 2 === 0 ? palette.primary : palette.gold}
                strokeWidth="1.6"
                strokeDasharray="3 3"
              />
            ))}
            {/* Central Medallion & 4 Compass Petals (Matching Prototype + Lotus Detail) */}
            <circle cx="100" cy="100" r="24" fill={palette.primary} />
            <circle cx="100" cy="100" r="12" fill={palette.bg} />
            <circle cx="100" cy="60" r="10" fill={palette.primary} />
            <circle cx="100" cy="140" r="10" fill={palette.primary} />
            <circle cx="60" cy="100" r="10" fill={palette.primary} />
            <circle cx="140" cy="100" r="10" fill={palette.primary} />
            <circle cx="72" cy="72" r="6" fill={palette.accent} />
            <circle cx="128" cy="72" r="6" fill={palette.accent} />
            <circle cx="72" cy="128" r="6" fill={palette.accent} />
            <circle cx="128" cy="128" r="6" fill={palette.accent} />
          </g>
        )}

        {/* 1: Dhakai Jamdani Geometric Muslin Weave & Buti */}
        {idx === 1 && (
          <g>
            <rect width="200" height="200" fill={palette.secondary} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect
                key={i}
                x={i * 26}
                y="0"
                width="12"
                height="200"
                fill={i % 2 ? palette.bg : palette.accent}
                opacity="0.85"
              />
            ))}
            {[30, 80, 130, 176].map((y) => (
              <path
                key={y}
                d={`M100 ${y - 18} l18 18 -18 18 -18 -18 z`}
                fill={palette.bg}
                stroke={palette.primary}
                strokeWidth="2.5"
              />
            ))}
          </g>
        )}

        {/* 2: Dhamrai Terracotta Kolshi & Incised River Clay Vessel */}
        {idx === 2 && (
          <g>
            <ellipse cx="100" cy="184" rx="64" ry="8" fill="#0003" />
            <path
              d="M80 28 h40 v20 c36 12 56 44 48 84 -6 28 -28 48 -68 48 S38 160 32 132 c-8 -40 12 -72 48 -84 z"
              fill={palette.primary}
            />
            <path
              d="M44 104 h112 M40 124 h120"
              stroke={palette.bg}
              strokeWidth="4"
              strokeDasharray="8 4"
            />
            <rect x="76" y="20" width="48" height="12" rx="6" fill={palette.primary} />
          </g>
        )}

        {/* 3: Sylheti Cane & Santal Sabai Basketry */}
        {idx === 3 && (
          <g>
            <path d="M44 72 h112 l-16 104 H60 z" fill="#b98a4e" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d={`M${48 + i * 4} ${84 + i * 18} h${104 - i * 8}`}
                stroke={palette.secondary}
                strokeWidth="3.2"
              />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path
                key={i}
                d={`M${56 + i * 15} 76 l${-6 + i * 1.2} 96`}
                stroke={palette.secondary}
                strokeWidth="2.4"
              />
            ))}
            <path
              d="M48 72 c0 -52 104 -52 104 0"
              fill="none"
              stroke="#b98a4e"
              strokeWidth="8"
            />
          </g>
        )}

        {/* 4: Old Dhaka Hand-Engraved Brass Bangles */}
        {idx === 4 && (
          <g>
            {[80, 64, 48].map((r, i) => (
              <circle
                key={r}
                cx="100"
                cy="104"
                r={r}
                fill="none"
                stroke={i === 1 ? palette.accent : '#c9973f'}
                strokeWidth="10"
                strokeDasharray={i === 1 ? '4 6' : '0'}
              />
            ))}
            <circle cx="100" cy="104" r="12" fill="#c9973f" />
          </g>
        )}

        {/* 5: Rajshahi Painted Haat Pakha (Palm-Leaf Fan) */}
        {idx === 5 && (
          <g>
            <circle cx="100" cy="84" r="64" fill={palette.accent} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <path
                key={i}
                d={`M100 84 L${100 + 64 * Math.cos(i * 0.785)} ${84 + 64 * Math.sin(i * 0.785)}`}
                stroke={palette.bg}
                strokeWidth="4"
              />
            ))}
            <circle cx="100" cy="84" r="16" fill={palette.primary} />
            <rect x="94" y="144" width="12" height="48" rx="6" fill={palette.secondary} />
          </g>
        )}

        {/* 6: Chakma Backstrap-Loom Alam Textile Geometry */}
        {idx === 6 && (
          <g>
            <rect width="200" height="200" fill={palette.primary} />
            <rect x="0" y="24" width="200" height="24" fill={palette.ink} />
            <rect x="0" y="82" width="200" height="36" fill={palette.ink} />
            <rect x="0" y="152" width="200" height="24" fill={palette.ink} />
            {[30, 65, 100, 135, 170].map((cx) => (
              <g key={cx}>
                <polygon
                  points={`${cx},88 ${cx + 12},100 ${cx},112 ${cx - 12},100`}
                  fill={palette.gold}
                  stroke={palette.bg}
                  strokeWidth="1.5"
                />
                <circle cx={cx} cy="36" r="5" fill={palette.bg} />
                <circle cx={cx} cy="164" r="5" fill={palette.bg} />
              </g>
            ))}
            <line x1="0" y1="64" x2="200" y2="64" stroke={palette.gold} strokeWidth="3" strokeDasharray="6 4" />
            <line x1="0" y1="136" x2="200" y2="136" stroke={palette.gold} strokeWidth="3" strokeDasharray="6 4" />
          </g>
        )}

        {/* 7: Baul Gourd Ektara & Alpana Mandala */}
        {idx === 7 && (
          <g>
            <circle cx="114" cy="108" r="58" fill={palette.primary} />
            <circle cx="114" cy="108" r="48" fill="none" stroke={palette.bg} strokeWidth="2.5" />
            <circle cx="114" cy="108" r="32" fill="none" stroke={palette.bg} strokeWidth="2" strokeDasharray="5 3" />
            <circle cx="114" cy="108" r="16" fill={palette.bg} />
            <circle cx="114" cy="108" r="9" fill={palette.primary} />
            <g transform="rotate(-24 85 110)">
              <path d="M74 28 L62 126 M88 28 L100 126" stroke={palette.ink} strokeWidth="5" strokeLinecap="round" />
              <line x1="81" y1="26" x2="81" y2="154" stroke={palette.gold} strokeWidth="2.5" />
              <rect x="64" y="34" width="14" height="5" rx="2" fill={palette.primary} />
              <path
                d="M60 124 Q81 114 102 124 C112 146, 104 170, 81 170 C58 170, 50 146, 60 124 Z"
                fill={palette.ink}
                stroke={palette.bg}
                strokeWidth="2"
              />
              <rect x="73" y="146" width="16" height="4" rx="2" fill={palette.bg} />
            </g>
          </g>
        )}
      </svg>

      {showArchivalCaption && (
        <div className="absolute bottom-2.5 right-2.5 bg-[#f6ecd4]/95 px-2.5 py-1 text-[11px] text-[#3b2a1a] border border-[#8a4b2a]/40">
          {captionText}
        </div>
      )}
    </div>
  );
};
