export const config = {
  port: Number(process.env.PORT ?? 4000),
  origins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim()),
  redisUrl: process.env.REDIS_URL ?? '',
  /** Cadencia del reloj del servidor (timers de turno, subastas, bots) */
  tickMs: 220,
  /** Salas vacías se recogen tras este tiempo */
  emptyRoomTtlMs: 10 * 60 * 1000,
  /** TTL de la sala en Redis */
  redisTtlSec: 60 * 60 * 6,
  rateLimit: { capacity: 25, refillPerSec: 8 },
  maxChatLength: 240,
  maxNickLength: 16,
};
