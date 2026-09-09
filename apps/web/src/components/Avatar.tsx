/** Fichas: siluetas geométricas propias, una por animal. */
const PATHS: Record<string, string> = {
  zorro: 'M12 3 L5 8 L7 18 L12 21 L17 18 L19 8 Z M9 10 h2 M13 10 h2',
  buho: 'M12 3 C6 3 4 7 4 11 C4 17 8 21 12 21 C16 21 20 17 20 11 C20 7 18 3 12 3 M9 10 a1.6 1.6 0 1 0 0.1 0 M15 10 a1.6 1.6 0 1 0 0.1 0',
  grulla: 'M6 20 C6 12 10 8 14 8 L20 4 L18 9 C18 15 14 20 8 20 Z',
  lobo: 'M4 7 L8 4 L12 7 L16 4 L20 7 L18 17 L12 21 L6 17 Z',
  nutria: 'M12 3 C7 3 5 7 5 12 C5 18 8 21 12 21 C16 21 19 18 19 12 C19 7 17 3 12 3 M9 11 h1 M14 11 h1',
  liebre: 'M8 21 C5 21 4 18 4 15 C4 11 7 9 9 9 L7 3 L11 8 L13 8 L17 3 L15 9 C17 9 20 11 20 15 C20 18 19 21 16 21 Z',
  ciervo: 'M12 21 C8 21 6 17 6 13 C6 9 9 7 12 7 C15 7 18 9 18 13 C18 17 16 21 12 21 M8 7 L5 3 M8 7 L9 2 M16 7 L19 3 M16 7 L15 2',
  gato: 'M5 8 L4 3 L9 6 L15 6 L20 3 L19 8 C21 11 20 17 16 20 L8 20 C4 17 3 11 5 8 Z',
};

export function Avatar({
  avatar,
  color,
  size = 28,
}: {
  avatar: string;
  color: string;
  size?: number;
}) {
  const path = PATHS[avatar] ?? PATHS.zorro;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
