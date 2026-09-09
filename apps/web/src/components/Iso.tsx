/**
 * Ilustraciones isométricas propias. Se dibujan en SVG en vez de exportarlas
 * a .webp: escalan sin pérdida, heredan la paleta del tema y pesan menos que
 * cualquier bitmap equivalente.
 */

type Rgb = { top: string; left: string; right: string };

const BRAND: Rgb = { top: '#9c8dff', left: '#5b49d6', right: '#7c6bff' };
const MINT: Rgb = { top: '#5cf0c8', left: '#1e9d7c', right: '#34e0b4' };
const SLATE: Rgb = { top: '#2b3550', left: '#151b2c', right: '#1f2740' };
const AMBER: Rgb = { top: '#ffcb75', left: '#c07d16', right: '#ffb03d' };
const CORAL: Rgb = { top: '#ff90a6', left: '#c93553', right: '#ff5c7a' };

function Box({ x, y, w, d, c }: { x: number; y: number; w: number; d: number; c: Rgb }) {
  const h = w / 2;
  return (
    <g>
      <polygon points={`${x},${y} ${x + w},${y + h} ${x},${y + w} ${x - w},${y + h}`} fill={c.top} />
      <polygon
        points={`${x - w},${y + h} ${x},${y + w} ${x},${y + w + d} ${x - w},${y + h + d}`}
        fill={c.left}
      />
      <polygon
        points={`${x},${y + w} ${x + w},${y + h} ${x + w},${y + h + d} ${x},${y + w + d}`}
        fill={c.right}
      />
    </g>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 220 170" className="h-full w-full" role="img" aria-hidden="true">
      <defs>
        <radialGradient id="isoGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#7c6bff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7c6bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="92" rx="100" ry="70" fill="url(#isoGlow)" />
      {children}
    </svg>
  );
}

/** Pips de un dado sobre la cara superior isométrica */
function Pips({ x, y, n }: { x: number; y: number; n: number }) {
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-9, -4], [9, 4]],
    3: [[-11, -5], [0, 0], [11, 5]],
    4: [[-10, 1], [-1, -6], [1, 6], [10, -1]],
    5: [[-10, 1], [-1, -6], [0, 0], [1, 6], [10, -1]],
    6: [[-12, -2], [-6, -7], [-2, 4], [4, -3], [8, 7], [12, 2]],
  };
  return (
    <g>
      {(spots[n] ?? spots[1]).map(([dx, dy], i) => (
        <ellipse key={i} cx={x + dx} cy={y + dy + 14} rx="3.2" ry="1.9" fill="#0d1120" opacity="0.75" />
      ))}
    </g>
  );
}

export function IsoDice() {
  return (
    <Frame>
      <Box x={80} y={52} w={34} d={26} c={SLATE} />
      <Pips x={80} y={52} n={5} />
      <Box x={140} y={72} w={26} d={20} c={BRAND} />
      <Pips x={140} y={72} n={3} />
      <path d="M40 118 L100 148" stroke="#34e0b4" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <circle cx="42" cy="60" r="4" fill="#34e0b4" opacity="0.8" />
      <circle cx="182" cy="46" r="3" fill="#ffb03d" opacity="0.8" />
    </Frame>
  );
}

export function IsoBuy() {
  return (
    <Frame>
      <Box x={110} y={70} w={46} d={30} c={SLATE} />
      <Box x={110} y={40} w={46} d={4} c={MINT} />
      <g transform="translate(150 22)">
        <rect x="-2" y="0" width="4" height="46" rx="2" fill="#3b4666" />
        <path d="M2 2 L44 12 L2 22 Z" fill="#34e0b4" />
        <circle cx="16" cy="12" r="3" fill="#0b1020" />
      </g>
      <text x="110" y="126" textAnchor="middle" fill="#8a93ab" fontSize="13" fontWeight="700">
        $120
      </text>
    </Frame>
  );
}

export function IsoRent() {
  return (
    <Frame>
      <Box x={100} y={82} w={44} d={26} c={SLATE} />
      <Box x={100} y={54} w={30} d={22} c={BRAND} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${160 + i * 4} ${96 - i * 13})`}>
          <ellipse cx="0" cy="0" rx="15" ry="8" fill={AMBER.top} />
          <path d="M-15 0 v6 a15 8 0 0 0 30 0 v-6" fill={AMBER.right} />
        </g>
      ))}
      <path
        d="M132 76 q22 -16 34 -4"
        stroke="#ffb03d"
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="4 5"
        strokeLinecap="round"
      />
    </Frame>
  );
}

export function IsoBuild() {
  return (
    <Frame>
      <Box x={68} y={92} w={28} d={18} c={SLATE} />
      <Box x={110} y={74} w={28} d={34} c={MINT} />
      <Box x={152} y={56} w={28} d={50} c={BRAND} />
      <path d="M46 132 L176 132" stroke="#2b3550" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M58 62 l10 -10 l10 10"
        stroke="#34e0b4"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

export function IsoTrade() {
  return (
    <Frame>
      <Box x={62} y={74} w={30} d={24} c={BRAND} />
      <Box x={158} y={74} w={30} d={24} c={MINT} />
      <path
        d="M100 76 q20 -18 40 -2"
        stroke="#8a93ab"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <polygon points="140,74 132,68 133,79" fill="#8a93ab" />
      <path
        d="M120 108 q-20 18 -40 2"
        stroke="#8a93ab"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <polygon points="80,110 88,116 87,105" fill="#8a93ab" />
    </Frame>
  );
}

export function IsoSurvive() {
  return (
    <Frame>
      <Box x={104} y={96} w={40} d={22} c={SLATE} />
      <Box x={104} y={66} w={30} d={26} c={SLATE} />
      <Box x={104} y={40} w={20} d={22} c={CORAL} />
      <path
        d="M104 40 l-6 24 l10 -6 l-6 22"
        stroke="#ffb03d"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M44 138 L176 138" stroke="#2b3550" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export const ILLUSTRATIONS = [IsoDice, IsoBuy, IsoRent, IsoBuild, IsoTrade, IsoSurvive];

/** Marca: un bloque isométrico con la inicial */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <polygon points="32,8 56,20 32,32 8,20" fill="#9c8dff" />
      <polygon points="8,20 32,32 32,56 8,44" fill="#5b49d6" />
      <polygon points="32,32 56,20 56,44 32,56" fill="#7c6bff" />
      <polygon points="32,20 44,26 32,32 20,26" fill="#34e0b4" />
    </svg>
  );
}
