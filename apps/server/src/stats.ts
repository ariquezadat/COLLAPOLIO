import type { GameState } from '@collapolio/engine';

/**
 * Historial y estadísticas en Postgres. Es totalmente opcional: sin
 * DATABASE_URL el servidor sigue funcionando y esta capa no hace nada.
 */
type PrismaLike = {
  game: { create: (args: unknown) => Promise<{ id: string }> };
  profile: { findUnique: (args: unknown) => Promise<{ id: string } | null> };
  stats: {
    upsert: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
  };
  $disconnect: () => Promise<void>;
};

let prisma: PrismaLike | null = null;
let ready: Promise<void> | null = null;

async function init() {
  if (!process.env.DATABASE_URL) return;
  try {
    const mod = await import('@prisma/client');
    const Client = (mod as { PrismaClient?: new () => PrismaLike }).PrismaClient;
    if (!Client) throw new Error('PrismaClient no disponible');
    prisma = new Client();
    console.log('[stats] Postgres conectado');
  } catch (err) {
    console.warn('[stats] historial deshabilitado:', (err as Error).message);
    prisma = null;
  }
}

export function initStats() {
  ready = init();
  return ready;
}

export async function closeStats() {
  await prisma?.$disconnect();
}

/** Guarda el resultado de una partida terminada. Silencioso ante errores. */
export async function recordGame(roomCode: string, state: GameState): Promise<void> {
  if (ready) await ready;
  if (!prisma) return;
  if (state.phase !== 'GAME_OVER' || !state.startedAt) return;

  const ranking = [...state.players].sort((a, b) => {
    if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
    return (b.netWorth ?? b.money) - (a.netWorth ?? a.money);
  });

  try {
    const results = await Promise.all(
      ranking.map(async (p, i) => {
        const profile = p.isBot
          ? null
          : await prisma!.profile.findUnique({ where: { anonId: p.id }, select: { id: true } });
        return {
          anonId: p.id,
          nick: p.nick,
          position: i + 1,
          netWorth: Math.round(p.netWorth ?? p.money),
          bankrupt: p.bankrupt,
          isBot: p.isBot,
          properties: p.properties.length,
          profileId: profile?.id ?? null,
        };
      }),
    );

    await prisma.game.create({
      data: {
        roomCode,
        startedAt: new Date(state.startedAt),
        durationSec: Math.round((Date.now() - state.startedAt) / 1000),
        playerCount: state.players.length,
        botCount: state.players.filter((p) => p.isBot).length,
        settings: state.settings as unknown as object,
        winnerAnonId: state.winnerId,
        results: { create: results },
      },
    });

    // Acumulados por perfil registrado
    for (const r of results) {
      if (!r.profileId) continue;
      await prisma.stats.upsert({
        where: { profileId: r.profileId },
        create: {
          profileId: r.profileId,
          gamesPlayed: 1,
          gamesWon: r.position === 1 ? 1 : 0,
          bankruptcies: r.bankrupt ? 1 : 0,
          bestNetWorth: r.netWorth,
          totalNetWorth: BigInt(r.netWorth),
        },
        update: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: r.position === 1 ? 1 : 0 },
          bankruptcies: { increment: r.bankrupt ? 1 : 0 },
          totalNetWorth: { increment: BigInt(r.netWorth) },
        },
      });
      // El récord sólo sube: se actualiza si el resultado lo supera
      await prisma.stats.updateMany({
        where: { profileId: r.profileId, bestNetWorth: { lt: r.netWorth } },
        data: { bestNetWorth: r.netWorth },
      });
    }
  } catch (err) {
    console.error('[stats] no se pudo guardar la partida:', err);
  }
}
