export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly { item: T; weight: number }[]): T;
  fork(label: string): Rng;
}

function hashSeed(seed: string | number): number {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seedToNumber(seed: string | number): number {
  return hashSeed(seed);
}

export function createRng(seed: string | number): Rng {
  let state = hashSeed(seed) || 1;

  const rng: Rng = {
    next(): number {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min: number, max: number): number {
      return Math.floor(rng.next() * (max - min + 1)) + min;
    },
    chance(probability: number): boolean {
      return rng.next() < Math.max(0, Math.min(1, probability));
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.min(items.length - 1, Math.floor(rng.next() * items.length))];
    },
    weighted<T>(items: readonly { item: T; weight: number }[]): T {
      const total = items.reduce((sum, x) => sum + Math.max(0, x.weight), 0);
      if (total <= 0) return items[0].item;
      let cursor = rng.next() * total;
      for (const entry of items) {
        cursor -= Math.max(0, entry.weight);
        if (cursor <= 0) return entry.item;
      }
      return items[items.length - 1].item;
    },
    fork(label: string): Rng {
      return createRng(`${state}:${label}`);
    },
  };

  return rng;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(min: number, max: number, amount: number): number {
  return min + (max - min) * amount;
}
