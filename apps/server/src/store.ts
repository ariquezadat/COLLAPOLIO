import type { GameState } from '@collapolio/engine';
import { config } from './config.js';

export interface RoomRecord {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  state: GameState;
  createdAt: number;
  updatedAt: number;
  chat: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  playerId: string;
  nick: string;
  text: string;
  at: number;
}

/**
 * Persistencia de salas. Redis cuando hay REDIS_URL (varias instancias o
 * reinicios sin perder partidas); memoria en caso contrario, para desarrollo.
 */
export interface Store {
  get(code: string): Promise<RoomRecord | null>;
  set(room: RoomRecord): Promise<void>;
  delete(code: string): Promise<void>;
  list(): Promise<RoomRecord[]>;
}

class MemoryStore implements Store {
  private rooms = new Map<string, RoomRecord>();
  async get(code: string) {
    return this.rooms.get(code) ?? null;
  }
  async set(room: RoomRecord) {
    this.rooms.set(room.code, room);
  }
  async delete(code: string) {
    this.rooms.delete(code);
  }
  async list() {
    return [...this.rooms.values()];
  }
}

class RedisStore implements Store {
  constructor(private redis: any, private memory = new MemoryStore()) {}
  private key(code: string) {
    return `collapolio:room:${code}`;
  }
  async get(code: string) {
    const cached = await this.memory.get(code);
    if (cached) return cached;
    const raw = await this.redis.get(this.key(code));
    if (!raw) return null;
    const room = JSON.parse(raw) as RoomRecord;
    await this.memory.set(room);
    return room;
  }
  async set(room: RoomRecord) {
    await this.memory.set(room);
    await this.redis.set(this.key(room.code), JSON.stringify(room), 'EX', config.redisTtlSec);
    await this.redis.sadd('collapolio:rooms', room.code);
  }
  async delete(code: string) {
    await this.memory.delete(code);
    await this.redis.del(this.key(code));
    await this.redis.srem('collapolio:rooms', code);
  }
  async list() {
    const local = await this.memory.list();
    const codes: string[] = await this.redis.smembers('collapolio:rooms');
    const known = new Set(local.map((r) => r.code));
    for (const c of codes) {
      if (known.has(c)) continue;
      const r = await this.get(c);
      if (r) local.push(r);
    }
    return local;
  }
}

export async function createStore(): Promise<Store> {
  if (!config.redisUrl) {
    console.log('[store] sin REDIS_URL — usando memoria (sólo desarrollo)');
    return new MemoryStore();
  }
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
    await redis.connect();
    console.log('[store] Redis conectado');
    return new RedisStore(redis);
  } catch (err) {
    console.error('[store] Redis no disponible, se continúa en memoria:', err);
    return new MemoryStore();
  }
}
