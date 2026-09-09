'use client';

import { motion } from 'framer-motion';

/**
 * Dado 3D real: un cubo CSS con seis caras. Al cambiar `value` gira varias
 * vueltas completas y aterriza en la orientación de esa cara.
 */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

function Face({ value, transform }: { value: number; transform: string }) {
  return (
    <div
      className="absolute inset-0 rounded-[22%] border border-white/15"
      style={{
        transform,
        background: 'linear-gradient(145deg, #f4f6ff, #cbd3ea)',
        backfaceVisibility: 'hidden',
        boxShadow: 'inset 0 0 12px rgba(10,14,26,.25)',
      }}
    >
      {PIPS[value].map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#141a2b]"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: '17%',
            height: '17%',
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
    </div>
  );
}

export function Dice3D({
  value,
  size = 52,
  spinKey,
  delay = 0,
}: {
  value: number;
  size?: number;
  /** Cambia en cada tirada para relanzar la animación */
  spinKey: number;
  delay?: number;
}) {
  const half = size / 2;
  const target = FACE_ROTATION[value] ?? FACE_ROTATION[1];

  return (
    <div style={{ width: size, height: size, perspective: size * 6 }}>
      <motion.div
        key={spinKey}
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateX: target.x - 720, rotateY: target.y - 900, scale: 0.75 }}
        animate={{ rotateX: target.x, rotateY: target.y, scale: 1 }}
        transition={{ duration: 0.95, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        <Face value={1} transform={`translateZ(${half}px)`} />
        <Face value={6} transform={`rotateY(180deg) translateZ(${half}px)`} />
        <Face value={3} transform={`rotateY(90deg) translateZ(${half}px)`} />
        <Face value={4} transform={`rotateY(-90deg) translateZ(${half}px)`} />
        <Face value={2} transform={`rotateX(90deg) translateZ(${half}px)`} />
        <Face value={5} transform={`rotateX(-90deg) translateZ(${half}px)`} />
      </motion.div>
    </div>
  );
}
