import type { Rng } from "./rng";

export type SliceRole =
  | "kickHeavy"
  | "kick"
  | "snare"
  | "snareLight"
  | "hat"
  | "hatLight"
  | "rim"
  | "clickChoke"
  | "flam";

export type RoleMap = Record<SliceRole, readonly number[]>;

export const ROLE_SLICES: RoleMap = {
  kickHeavy: [1, 2, 30, 42],
  kick: [8, 12, 13, 23, 24, 35],
  snare: [5, 7, 9, 11, 20, 44],
  snareLight: [16, 18, 32, 34, 41],
  hat: [4, 6, 10, 15, 17, 28, 33],
  hatLight: [21, 26, 38],
  rim: [3, 14, 37],
  clickChoke: [22, 31, 36, 39, 40, 43],
  flam: [7, 8, 12, 19, 25, 29, 44],
};

export const NATURAL_SUCCESSORS: Record<number, readonly number[]> = {
  1: [2, 3, 5, 30],
  2: [3, 4, 5],
  3: [4, 5, 14],
  4: [5, 6, 10],
  5: [6, 7, 9, 20],
  6: [7, 8, 10],
  7: [8, 9, 12],
  8: [9, 10, 12, 13],
  9: [10, 11, 20],
  10: [11, 12, 15],
  11: [12, 13, 16],
  12: [13, 14, 19],
  13: [14, 15, 23],
  14: [15, 16, 37],
  15: [16, 17, 21],
  16: [1, 17, 18],
  17: [18, 19, 21],
  18: [19, 20, 32],
  19: [20, 21, 25],
  20: [21, 22, 44],
  21: [22, 23, 26],
  22: [23, 24, 31],
  23: [24, 25, 35],
  24: [25, 26, 35],
  25: [26, 27, 29],
  26: [27, 28, 38],
  27: [28, 29, 32],
  28: [29, 30, 33],
  29: [30, 31, 44],
  30: [31, 32, 42],
  31: [32, 33, 36],
  32: [33, 34, 41],
  33: [34, 35, 38],
  34: [35, 36, 41],
  35: [36, 37, 42],
  36: [37, 38, 40],
  37: [38, 39, 14],
  38: [39, 40, 21],
  39: [40, 41, 43],
  40: [41, 42, 43],
  41: [42, 43, 16],
  42: [43, 44, 1],
  43: [44, 1, 22],
  44: [1, 5, 7],
};

export interface MarkovBias {
  amount: number;
  lastSlice?: number;
}

export function pickRole(
  rng: Rng,
  role: SliceRole,
  corpse?: MarkovBias,
): number {
  const pool = ROLE_SLICES[role];
  const successorPool =
    corpse?.lastSlice == null ? [] : NATURAL_SUCCESSORS[corpse.lastSlice] ?? [];
  const natural = pool.filter((slice) => successorPool.includes(slice));
  const useNatural = natural.length > 0 && rng.chance(corpse?.amount ?? 0);
  const slice = rng.pick(useNatural ? natural : pool);
  if (corpse) corpse.lastSlice = slice;
  return slice;
}
