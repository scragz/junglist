import type { SliceLane } from "../engine/types";
import type { GrooveTemplate } from "./groove";
import type { MarkovBias, RoleMap } from "./roles";
import type { Rng } from "./rng";

export type GeneratorId =
  | "pocket"
  | "metrical-ghost"
  | "gravitational-liminality"
  | "subdivided-relentlessness"
  | "structural-aliasing"
  | "temporal-foreclosure"
  | "percussive-opacity"
  | "monophonic-polyrhythm"
  | "pressure-pulse";

export type PaletteId = "Breaks" | "Footwork" | "Gabber" | "Steppers" | "Power Noise";

export interface GeneratorKnobs {
  density?: number;
  choke?: number;
}

export interface GenContext {
  rng: Rng;
  roles: RoleMap;
  bpm: number;
  bars: number;
  stepsPerBar: number;
  intensity: number;
  pocket: SliceLane;
  groove: GrooveTemplate;
  corpse?: MarkovBias;
  knobs?: GeneratorKnobs;
}

export interface Generator {
  id: GeneratorId;
  name: string;
  tier: "A";
  style: PaletteId;
  lands: "L" | "A" | "G";
  naturalBars: readonly [number, number];
  tensionRange: readonly [number, number];
  generate(ctx: GenContext): SliceLane[];
}

export interface GeneratorRegistry {
  all: readonly Generator[];
  byId(id: GeneratorId): Generator;
  validAt(tension: number, palette: ReadonlySet<string>): Generator[];
}

export function createRegistry(generators: readonly Generator[]): GeneratorRegistry {
  return {
    all: generators,
    byId(id: GeneratorId): Generator {
      const generator = generators.find((g) => g.id === id);
      if (!generator) throw new Error(`unknown generator ${id}`);
      return generator;
    },
    validAt(tension: number, palette: ReadonlySet<string>): Generator[] {
      const valid = generators.filter(
        (g) =>
          palette.has(g.style) &&
          tension >= g.tensionRange[0] &&
          tension <= g.tensionRange[1],
      );
      return valid.length > 0 ? valid : generators.filter((g) => palette.has(g.style));
    },
  };
}
