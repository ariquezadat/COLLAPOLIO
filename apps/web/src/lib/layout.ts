/**
 * Geometría del tablero: 11x11 celdas, la SALIDA abajo a la derecha y el
 * recorrido en sentido antihorario.
 */
export type Side = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export interface TilePlacement {
  row: number;
  col: number;
  side: Side;
}

export function placeTile(i: number): TilePlacement {
  if (i === 0) return { row: 11, col: 11, side: 'corner' };
  if (i < 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i === 10) return { row: 11, col: 1, side: 'corner' };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i === 20) return { row: 1, col: 1, side: 'corner' };
  if (i < 30) return { row: 1, col: 1 + (i - 20), side: 'top' };
  if (i === 30) return { row: 1, col: 11, side: 'corner' };
  return { row: 1 + (i - 30), col: 11, side: 'right' };
}

/** Rotación de la franja de color según el borde del tablero */
export function stripeSide(side: Side): 'top' | 'right' | 'bottom' | 'left' {
  switch (side) {
    case 'bottom':
      return 'top';
    case 'top':
      return 'bottom';
    case 'left':
      return 'right';
    default:
      return 'left';
  }
}
